import { test, expect } from '@playwright/test'

/**
 * Урок каталога, заданный на дом ЦЕЛИКОМ — весь путь ученика в настоящем
 * браузере: увидел задание → открыл урок → прошёл → сдал → увидел результат.
 *
 * Бэкенд мокается целиком через page.route: здесь проверяется проводка кабинета
 * и ТЕЛО запроса сдачи, а не сервер. Тело — единственное, чем в этом
 * репозитории ловится расхождение контракта между тремя репо: юниты обеих
 * сторон зелены и при разъехавшихся именах полей.
 */
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

/**
 * Урок, который плеер осиливает целиком (info + choice, ничего из UNSUPPORTED —
 * см. liveSteps.js). Обычным путём он открылся бы очередью экранов: ровно
 * поэтому годится проверить, что задание уводит в документ.
 */
const СОДЕРЖИМОЕ = (тип) => ({
  id: 314,
  code: 'R01-SELF',
  title: 'Unit 1 Review Test',
  fileUrl: 'https://files.example/b1/lessons/R01.html',
  complete: true,
  // Тип урока приезжает ЗДЕСЬ, в ответе содержимого: кабинету он нужен, чтобы
  // вести урок тестом или тренажёром, а второй ручки ради одного поля нет.
  type: тип,
  content: {
    title: 'Unit 1 Review Test',
    steps: [
      {
        id: 's1', order: 1, title: 'Grammar',
        blocks: [
          { type: 'info', html: '<p>Read the rule before you start.</p>' },
          { type: 'practice', title: 'Choose the right form', questions: [
            { id: 'q1', type: 'choice', prompt: 'He ___ ready.', options: ['is', 'are'], answer: 'is' },
            { id: 'q2', type: 'choice', prompt: 'They ___ here.', options: ['is', 'are'], answer: 'are' },
          ] },
        ],
      },
      { id: 's2', order: 2, title: 'Writing', blocks: [{ type: 'info', html: '<p>Write five sentences.</p>' }] },
    ],
  },
})

const ЗАДАНИЕ = {
  id: 9,
  materialId: 12,
  materialTitle: 'Unit 1 Review Test',
  materialType: 'LINK',
  catalogLessonId: 314,
  cardId: null,
  cardTitle: null,
  wholeLesson: true,
  submittedAt: null,
  autoCorrect: null,
  autoTotal: null,
  autoPercent: null,
  dueDate: '2026-12-31',
  files: [],
}

async function открытьДомашку(page, { задание = ЗАДАНИЕ, тип = 'REVIEW' } = {}) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B1' } })))
  await page.route('**/admin/homework/my', (r) => r.fulfill(json([])))
  await page.route('**/student/assignments', (r) => r.fulfill(json([задание])))
  // ЛОВУШКА. Ручка одного урока каталога отдаёт тип — и кабинет ходить в неё не
  // должен: тип приезжает вместе с содержимым, которое экран запрашивает и так.
  // Отдельный GET на каждое открытие урока ради одного поля здесь и ловится.
  const лишнее = { тип: false }
  await page.route('**/mobile/course-catalog/lessons/314', (r) => {
    лишнее.тип = true
    return r.fulfill(json({ id: 314, code: 'R01-SELF', title: 'Unit 1 Review Test', type: тип }))
  })
  // Регистрируется ПОСЛЕ ловушки: в Playwright побеждает маршрут, заведённый
  // позже, и без этого порядка /content уходил бы в неё.
  await page.route('**/mobile/course-catalog/lessons/314/content', (r) => r.fulfill(json(СОДЕРЖИМОЕ(тип))))
  await page.route('**/mobile/course-catalog/lessons/314/answers', (r) => r.fulfill(json({ progressJson: null })))
  await page.goto('/?screen=homework')
  await expect(page.locator('.hw-detail__title')).toHaveText('Unit 1 Review Test')
  return лишнее
}

test('задание видно уроком целиком, а не «Заданием с урока»', async ({ page }) => {
  await открытьДомашку(page)

  await expect(page.locator('.hw-card__lesson').first()).toHaveText('Урок целиком')
  // Вложений у такого задания не спрашивают: оно закрывается сдачей в уроке.
  await expect(page.locator('.hw-upload__input')).toHaveCount(0)
  await expect(page.locator('.hw-detail')).toContainText('решается прямо в уроке')
})

test('урок открывается документом, без покарточных «Проверить», и сдаётся парой {correct, total}', async ({ page }) => {
  const лишнее = await открытьДомашку(page)

  let телоСдачи = null
  await page.route('**/student/assignments/9/submit', (r) => {
    телоСдачи = r.request().postDataJSON()
    // Сервер считает процент сам и кладёт рядом пару, из которой посчитал.
    return r.fulfill(json({
      ...ЗАДАНИЕ, submittedAt: '2026-09-15T10:00:00', autoCorrect: 1, autoTotal: 2, autoPercent: 50,
    }))
  })

  await page.getByRole('button', { name: 'Открыть урок' }).click()

  // Документ, а не очередь экранов плеера: у задания вид привязан к заданию.
  await expect(page.locator('.lw-doc')).toHaveCount(1, { timeout: 20000 })
  await expect(page.locator('.cp')).toHaveCount(0)
  await expect(page.locator('.ls-tab')).toHaveCount(2)
  // Адрес переживает F5 — в нём и урок, и номер задания.
  await expect(page).toHaveURL(/catalog=314/)
  await expect(page).toHaveURL(/assignment=9/)

  // Режим теста: покарточной проверки нет вовсе, кнопка одна.
  await expect(page.locator('.lw-practice__check')).toHaveCount(0)
  await expect(page.locator('.lw-submit')).toContainText('ответы откроются после сдачи')

  // Один верный из двух: на второй вопрос не отвечаем вовсе.
  await page.locator('.lw-q--choice').first().getByText('is', { exact: true }).click()
  // До сдачи эталон не проступает — иначе тест превращается в тренажёр.
  await expect(page.locator('.lw-opt.is-ok')).toHaveCount(0)

  await page.getByRole('button', { name: 'Завершить тест' }).click()

  // ТЕЛО КОНТРАКТА: ровно два поля, процент считает сервер.
  await expect.poll(() => телоСдачи).toEqual({ correct: 1, total: 2 })
  // Результат ученику — и прямо сказано, что балл поставит преподаватель.
  await expect(page.locator('.lw-submit')).toContainText('50% верно')
  await expect(page.getByRole('button', { name: 'Завершить тест' })).toHaveCount(0)
  // Ответы больше не принимаются, а ключи открыты: тест позади.
  await expect(page.locator('.lw-opt').first()).toBeDisabled()
  await expect(page.locator('.lw-opt.is-ok').first()).toBeVisible()

  // И за типом урока кабинет отдельным запросом не ходил ни разу: он приехал
  // вместе с содержимым.
  expect(лишнее.тип).toBe(false)
})

test('уже сданное задание открывается только на чтение', async ({ page }) => {
  await открытьДомашку(page, {
    задание: { ...ЗАДАНИЕ, submittedAt: '2026-09-15T10:00:00', autoCorrect: 42, autoTotal: 54, autoPercent: 78 },
  })

  // Процент виден ещё в домашке — за ним ученик сюда и возвращается.
  await expect(page.locator('.hw-autocheck')).toContainText('78% верно')
  await expect(page.locator('.hw-card__percent')).toHaveText('78% верно')

  await page.getByRole('button', { name: 'Открыть урок' }).click()
  await expect(page.locator('.lw-doc')).toHaveCount(1, { timeout: 20000 })
  await expect(page.locator('.lw-submit')).toContainText('78% верно')
  await expect(page.getByRole('button', { name: 'Завершить тест' })).toHaveCount(0)
  await expect(page.locator('.lw-opt').first()).toBeDisabled()
})

/** Обычный урок остаётся тренажёром: покарточная проверка с ключами, как была. */
test('обычный урок на дом сохраняет покарточную проверку', async ({ page }) => {
  await открытьДомашку(page, { тип: 'LESSON' })

  await page.getByRole('button', { name: 'Открыть урок' }).click()
  await expect(page.locator('.lw-doc')).toHaveCount(1, { timeout: 20000 })

  await expect(page.locator('.lw-practice__check')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Сдать урок' })).toBeVisible()

  // Проверка по кнопке красит ответы — ровно как в уроке из каталога.
  await page.locator('.lw-q--choice').first().getByText('are', { exact: true }).click()
  await page.locator('.lw-practice__check').first().click()
  await expect(page.locator('.lw-q--choice').first().locator('.lw-opt.is-no')).toHaveCount(1)
})
