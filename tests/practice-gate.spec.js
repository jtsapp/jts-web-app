import { test, expect } from '@playwright/test'

// Замок на видимом контенте — это оффер, подменённый раздел — отток.
// Ученик с исчерпанным демо-лимитом обязан видеть раздел (что в нём есть),
// а не пустой экран «лимит исчерпан» вместо всего Аудирования/Шэдоуинга.
// Форма — та же, что у Грамматики (см. grammar.spec.js): каталог виден,
// замок стоит на попытке открыть/пройти конкретный контент.
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test.describe('Демо-лимит: замок на контенте, не на разделе', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
    await page.route('**/api/auth/me', (r) =>
      r.fulfill(json({ user: { id: 1, name: 'Асель', role: 'STUDENT', languageLevel: 'A1' } })))
    // Лимит исчерпан для любого модуля практики: allowed=false при limit=8, completed=8.
    await page.route('**/api/practice/entitlement**', (r) =>
      r.fulfill(json({ configured: true, allowed: false, limit: 8, completed: 8 })))
  })

  test('аудирование с исчерпанным лимитом показывает интро, а не пустой экран', async ({ page }) => {
    await page.goto('/?screen=listening')

    // Интро (маскот, описание, бейдж уровня, кнопка «Начать тренировку») —
    // это и есть каталог раздела: студент видит, чего лишился, до любого клика.
    await expect(page.getByText('Аудирование')).toBeVisible()
    await expect(page.locator('.lt-intro').first()).toBeVisible()
    await expect(page.locator('.lt-intro__title')).toBeVisible()
    // Замка ещё нет — лимит проверяется в момент старта задания, не раньше.
    await expect(page.locator('.pl-limit')).toHaveCount(0)

    // Попытка начать тренировку — та самая «попытка открыть юнит» из
    // грамматики: вот тут и появляется замок, а не при заходе в раздел.
    await page.locator('.lt-intro .lt-primary').click()
    await expect(page.locator('.pl-limit')).toBeVisible()
    await expect(page.locator('.pl-limit__title')).toContainText('🔒')
  })

  test('шэдоуинг с исчерпанным лимитом показывает список уроков, а не пустой экран', async ({ page }) => {
    await page.goto('/?screen=shadowing')

    // Табы уроков (спикеры) — каталог раздела; он остаётся на месте, замок
    // ставится только на само видео/скрипт (тренировку конкретного урока).
    await expect(page.getByText('Шэдоуинг')).toBeVisible()
    await expect(page.locator('.sh-tabs .pp-chip').first()).toBeVisible()
    await expect(await page.locator('.sh-tabs .pp-chip').count()).toBeGreaterThan(1)

    // Контент (видео/скрипт) заперт сразу — открыть урок и означает попасть
    // на этот экран (сюда идут по клику на карточку урока в Практике).
    await expect(page.locator('.pl-limit')).toBeVisible()
    await expect(page.locator('.sh-video')).toHaveCount(0)
  })

  test('шэдоуинг: запись фразы упирается в лимит, пришедший после открытия урока', async ({ page }) => {
    // Для шэдоуинга «сессия» — это запись фразы: пройденной её считает
    // markSegmentDone в segRecord. Поэтому право спрашивается в startRec, и
    // спрашивается ПЕРВОЙ строкой — до navigator.mediaDevices, getStream и
    // new MediaRecorder. Тест водит именно этот порядок: до записи мокать
    // микрофон и YouTube не нужно, исполнение до них не доходит.
    let allowed = true
    await page.route('**/api/practice/entitlement**', (r) =>
      r.fulfill(json({ configured: true, allowed, limit: 12, completed: allowed ? 0 : 12 })))

    await page.goto('/?screen=shadowing')
    // Урок открыт: право есть, замка нет.
    await expect(page.locator('.sh-video')).toBeVisible()
    const record = page.getByRole('button', { name: 'Записать фразу' }).first()
    await expect(record).toBeVisible()

    // Демо-квота раздела добита где-то ещё (другая вкладка, соседний урок) —
    // ответ на СЛЕДУЮЩИЙ вопрос о праве уже отрицательный.
    allowed = false
    await record.click()

    // Записи не случилось, а урок подменился замком: blocked считается из того
    // же обновлённого entitlement.
    await expect(page.locator('.pl-limit')).toBeVisible()
    await expect(page.locator('.sh-video')).toHaveCount(0)
  })

  test('аудирование: старт ждёт вердикта, а пропавшее право подменяет открытый экран замком', async ({ page }) => {
    // Сторожит ту же регрессию, что и раньше: blocked обязан ВЫЧИСЛЯТЬСЯ из
    // entitlement на каждом рендере, а не быть useState-защёлкой, выставленной
    // один раз внутри startSession. Граница с тех пор сместилась — 96159d17
    // запретил стартовать сессию до свежего вердикта, поэтому прежней гонки
    // «клик раньше ответа сервера» больше нет, и тест водит два перехода,
    // которые защёлка не переживает:
    //   1) право пропало между сессиями — уже открытый тренажёр подменяется
    //      замком (защёлка это ещё изобразит: setBlocked в том же startSession);
    //   2) «Назад» с замка возвращает на интро того же экрана — а вот это
    //      защёлке недоступно: blocked остался бы true навсегда, и раздел
    //      завис бы на замке до перезагрузки страницы.
    // Плюс сама новая граница: в окне между кликом и вердиктом задание не
    // показывается — сессия «в кредит» больше не стартует.
    let allowed = true
    await page.route('**/api/practice/entitlement**', async (r) => {
      // Ответ намеренно медленный: в этом окне и проверяем, что экран ждёт.
      await new Promise((resolve) => setTimeout(resolve, 900))
      await r.fulfill(json({ configured: true, allowed, limit: 8, completed: allowed ? 7 : 8 }))
    })
    // Отметку о прохождении startSession досылает перед вопросом о праве
    // (flushModule) — БД на стенде нет, отвечаем за неё.
    await page.route('**/api/practice/state', (r) => r.fulfill(json({ configured: true, ok: true })))
    await page.route('**/practice/listening/content/*.json', (r) =>
      r.fulfill(
        json([
          {
            id: 'a1_x',
            type: 'listen_choice',
            audio: 'x.mp3',
            prompt: 'Where is Li now?',
            options: ['In Shanghai', 'In Beijing', 'In Tokyo'],
            answer: 'In Shanghai',
            explanation: '',
          },
        ]),
      ),
    )

    await page.goto('/?screen=listening')
    await expect(page.locator('.lt-intro')).toBeVisible()
    await page.locator('.lt-intro .lt-primary').click()

    // Вердикт ещё в пути: экран остался на интро, задания нет.
    await page.waitForTimeout(400)
    await expect(page.locator('.lt-intro')).toBeVisible()
    await expect(page.locator('.lt-heading')).toHaveCount(0)

    // Пришёл allowed:true — сессия пошла, замка нет.
    await expect(page.locator('.lt-heading')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.pl-limit')).toHaveCount(0)

    // Право пропадает, пока экран уже в сессии. Проходим задание до экрана
    // результата — он про лимит ещё ничего не знает, и это правильно: право
    // спрашивается на старте сессии, а не на каждом рендере.
    allowed = false
    await page.getByText('In Shanghai').click()
    await page.getByText('Проверить').click()
    await page.getByText('Продолжить').click()
    await expect(page.getByText('Попробовать ещё раз')).toBeVisible()
    await expect(page.locator('.pl-limit')).toHaveCount(0)

    // «Ещё раз» — тот же startSession: право спрошено заново, ответ allowed:false
    // подменяет уже открытый тренажёр замком.
    await page.getByText('Попробовать ещё раз').click()
    await expect(page.locator('.pl-limit')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.lt-heading')).toHaveCount(0)

    // Замок — не защёлка: «Назад» снимает его и возвращает на интро раздела
    // (backToIntro сбрасывает и attemptedStart, и phase).
    await page.locator('.pl-limit__back').click()
    await expect(page.locator('.lt-intro')).toBeVisible()
    await expect(page.locator('.pl-limit')).toHaveCount(0)
  })
})
