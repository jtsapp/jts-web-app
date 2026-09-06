import { test, expect } from '@playwright/test'

// Класс преподавателя: пришедший на пробный урок входит в закреплённый
// ученический аккаунт и сразу оказывается в уроке. Кабинета у этого аккаунта
// нет вовсе — ни разделов, ни меню.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// JWT с ролью (header.payload.sig): роль клиент читает из payload, подпись не
// проверяет — см. src/lib/jwt.js.
const b64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const TOKEN = `h.${b64url({ role: 'STUDENT', userId: 501 })}.s`

const BOOTH_NAME = 'Класс · Айгуль'
// Логин аккаунта класса — служебная ПОЧТА, ровно того вида, что в спеке:
// телефона у аккаунта нет вовсе (иначе заведение слало бы настоящую SMS), а
// поля «логин» в системе не существует — вход ищет по телефону, потом по почте.
const BOOTH_LOGIN = 'class-7@jts.local'
const BOOTH_PASSWORD = 'class-7-pass'
const BOOTH_USER = { id: 501, name: BOOTH_NAME, email: BOOTH_LOGIN, role: 'STUDENT', languageLevel: 'A1', boothAccount: true }
const LESSON = { id: 77, status: 'IN_PROGRESS', lessonType: 'TRIAL', teacherName: 'Айгуль', participants: [] }
// Полное тело ответа входа. sessionId и resumed клиент не читает (см. «Контракт
// с бэкендом»), но фикстура обязана быть настоящей: иначе лишние поля живого
// ответа не проверены ни одним тестом.
const ENTERED = { sessionId: 12, lessonId: 77, resumed: false }

/** Профиль аккаунта класса и занятие, в которое ведёт вход. */
async function stubAccount(page) {
  // Бэкендовый /user/me: по boothAccount клиент и решает, куда вести.
  await page.route('**/user/me', (r) => r.fulfill(json(BOOTH_USER)))
  // Наш серверный роут восстановления сессии (src/lib/session.js).
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { userId: 501, name: BOOTH_NAME, email: BOOTH_LOGIN, role: 'STUDENT', languageLevel: 'A1', boothAccount: true } })))
  await page.route('**/user/language-level', (r) => r.fulfill(json('A1')))
  // Профиль тьютора восстановление сессии ЖДЁТ — без заглушки первый экран
  // упирается в живую сеть.
  await page.route('**/api/profile?**', (r) => r.fulfill(json({ configured: true, profile: null })))
  await page.route('**/api/profile/merge', (r) => r.fulfill(json({ ok: true })))
  await page.route('**/admin/lessons/77', (r) => r.fulfill(json(LESSON)))
  await page.route('**/admin/lessons/77/sections', (r) => r.fulfill(json([])))
}

test('аккаунт класса после входа оказывается в уроке, а не на «Уроках»', async ({ page }) => {
  await stubAccount(page)
  await page.route('**/auth/login', (r) =>
    r.fulfill(json({ accessToken: TOKEN, refreshToken: 'r', userId: 501, name: BOOTH_NAME, role: 'STUDENT' })))
  await page.route('**/trial/booth/enter', (r) => r.fulfill(json(ENTERED)))

  await page.goto('/')
  // Вход по паролю: преподаватель диктует пришедшему почту и пароль класса,
  // кода на почту нет — почтовый ящик служебный и никто его не читает.
  //
  // Кнопки берём классами, а не ролью с именем: на экране входа кроме «Войти»
  // есть ещё «Войти через Google», и getByRole({ name: 'Войти' }) поймал бы обе
  // (имя матчится подстрокой) — падение по strict mode. Классами ходят и
  // соседние спеки, см. tests/auth-user-messages.spec.js.
  await page.locator('.btn--secondary').click()
  await page.getByPlaceholder('Телефон или почта').fill(BOOTH_LOGIN)
  await page.getByPlaceholder('Пароль').fill(BOOTH_PASSWORD)
  await page.locator('.form-primary').click()

  // После входа приложение уводит с success-экрана само — до задачи 6 таймером
  // на 1.8 с, после неё сразу стражем кабинета, — потом экран класса просит вход
  // и открывает урок. Ждём с запасом, чтобы спека жила в обоих состояниях.
  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Пробный урок')).toBeVisible()
  // Расписания он по дороге не видел: «Уроки» — экран кабинета.
  await expect(page.getByText('Мой график')).toHaveCount(0)
})

// Находка 1 финального ревью: обёртка анимации перехода ключевалась сырым
// screen, а рисовался вычисленный view (аккаунт класса вместо screen видит
// 'booth'). Свежий вход ставит screen='success' — в тот же рендер view уже
// 'booth', BoothEntryPage монтируется и шлёт /enter; страж кабинета следующим
// тиком переписывает screen на 'booth', ключ обёртки менялся вместе с ним —
// React перемонтировал уже отрисованный BoothEntryPage заново, и уходил
// второй /enter на тот же вход.
//
// Сервер спеки поднят в dev-режиме (playwright.config.js) — там StrictMode
// удваивает КАЖДЫЙ монтаж, и один логический монтаж уже даёт 2 запроса.
// Порог ниже — «не больше одного логического монтажа» (<= 2), а не точное
// «ровно 2»: тесту не нужно знать, как именно и удваивает ли вообще
// StrictMode, — важно только что лишнего перемонтажа (который добавил бы ещё
// монтаж, то есть ещё 2 запроса) не происходит.
test('свежий вход шлёт вход в класс за один монтаж, а не за два', async ({ page }) => {
  await stubAccount(page)
  await page.route('**/auth/login', (r) =>
    r.fulfill(json({ accessToken: TOKEN, refreshToken: 'r', userId: 501, name: BOOTH_NAME, role: 'STUDENT' })))
  let attempts = 0
  await page.route('**/trial/booth/enter', (r) => {
    attempts += 1
    return r.fulfill(json(ENTERED))
  })

  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.getByPlaceholder('Телефон или почта').fill(BOOTH_LOGIN)
  await page.getByPlaceholder('Пароль').fill(BOOTH_PASSWORD)
  await page.locator('.form-primary').click()

  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })
  // Даём долететь дублю из StrictMode, если он есть, прежде чем считать.
  await page.waitForTimeout(500)
  expect(attempts).toBeLessThanOrEqual(2)
})

test('класс ещё не открыт — экран ждёт и повторяет вход сам', async ({ page }) => {
  await stubAccount(page)
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), TOKEN)
  let attempts = 0
  await page.route('**/trial/booth/enter', (r) => {
    attempts += 1
    // Первые два входа — занятия ещё нет; третий отдаёт урок.
    if (attempts < 3) return r.fulfill(json({ error: 'no lesson' }, 503))
    return r.fulfill(json(ENTERED))
  })

  await page.goto('/')

  await expect(page.getByText('Преподаватель ещё не открыл класс')).toBeVisible({ timeout: 15_000 })
  // Автоповтор раз в пять секунд: без нажатий экран доходит до урока сам.
  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 20_000 })
})

test('выключенный класс объясняет, что делать, и не повторяет вход', async ({ page }) => {
  await stubAccount(page)
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), TOKEN)
  let attempts = 0
  await page.route('**/trial/booth/enter', (r) => {
    attempts += 1
    return r.fulfill(json({ error: 'forbidden' }, 403))
  })

  await page.goto('/')

  await expect(page.getByText('Класс закрыт')).toBeVisible({ timeout: 15_000 })
  // Считаем не «сколько было всего», а «выросло ли». Точное число тут не наше
  // дело: сервер спека поднимает в dev-режиме (playwright.config.js), а там
  // StrictMode монтирует экран дважды и вход уходит двумя запросами подряд — в
  // прод-сборке он один. Проверяем то, ради чего тест написан: на 403 экран
  // больше не стучится, сколько ни жди.
  const settled = attempts
  await page.waitForTimeout(6000)
  expect(attempts).toBe(settled)
})

test('разделы кабинета аккаунту класса не открываются', async ({ page }) => {
  await stubAccount(page)
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), TOKEN)
  // Класс ещё не открыт — экран остаётся экраном ожидания, и по нему видно, что
  // диплинк в «Практику» никуда не увёл.
  await page.route('**/trial/booth/enter', (r) => r.fulfill(json({ error: 'no lesson' }, 503)))

  await page.goto('/?screen=practice')

  await expect(page.getByText('Преподаватель ещё не открыл класс')).toBeVisible({ timeout: 15_000 })
  // Меню кабинета не нарисовано ни в одном из двух своих видов: колонка на
  // десктопе и шапка с гамбургером на мобилке.
  await expect(page.locator('.sb')).toHaveCount(0)
  await expect(page.locator('.mtop')).toHaveCount(0)
  // И в адресе не осталось обещания раздела, которого у аккаунта нет.
  await expect(page).toHaveURL(/\/(\?.*)?$/)
})

test('диплинк в «Уроки» тоже упирается в класс', async ({ page }) => {
  await stubAccount(page)
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), TOKEN)
  await page.route('**/trial/booth/enter', (r) => r.fulfill(json({ error: 'no lesson' }, 503)))
  // Расписание аккаунта класса не показывается вовсе — запрос за ним не должен
  // даже уйти.
  let scheduleAsked = false
  await page.route('**/admin/lessons/occurrences', (r) => {
    scheduleAsked = true
    return r.fulfill(json([]))
  })

  await page.goto('/?screen=lessons')

  await expect(page.getByText('Преподаватель ещё не открыл класс')).toBeVisible({ timeout: 15_000 })
  expect(scheduleAsked).toBe(false)
})

// Регрессия: App передаёт BoothEntryPage урок, который вкладка уже открыла
// (lessonId={boothLessonId}), чтобы «Вернуться в класс» не заходило в
// /trial/booth/enter повторно — бэкенд закрыл бы ещё живой сеанс как забытый
// (closed_by_next_entry) и завёл новое занятие с пустой доской. Юниты этого
// не видят: они не проходят весь путь вход → урок → выход → класс → возврат.
test('выход из урока и возврат в него не заходят в класс повторно', async ({ page }) => {
  await stubAccount(page)
  await page.route('**/auth/login', (r) =>
    r.fulfill(json({ accessToken: TOKEN, refreshToken: 'r', userId: 501, name: BOOTH_NAME, role: 'STUDENT' })))
  let attempts = 0
  await page.route('**/trial/booth/enter', (r) => {
    attempts += 1
    return r.fulfill(json(ENTERED))
  })

  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.getByPlaceholder('Телефон или почта').fill(BOOTH_LOGIN)
  await page.getByPlaceholder('Пароль').fill(BOOTH_PASSWORD)
  await page.locator('.form-primary').click()

  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })

  // StrictMode дев-сервера монтирует экран дважды, и вход уже ушёл двумя
  // запросами подряд (см. соседний тест про 403) — считаем не «сколько было»,
  // а «выросло ли» после возврата. Небольшая пауза даёт долететь и второму
  // из этой пары, прежде чем зафиксировать точку отсчёта.
  await page.waitForTimeout(500)
  const settled = attempts

  // Кнопка выхода стоит в шапке в двух видах — иконка на телефоне, подпись на
  // десktop (переключаются CSS-медиа-запросом, :visible берёт актуальную).
  await page.locator('.lv-top__act--exit:visible, .lv-top__exit:visible').click()
  // Подтверждение — общий диалог LessonExitConfirm, кнопка внутри своя
  // (.lx-leave), а не по тексту: тот же текст «Выйти из урока» есть и у ещё
  // видимой под диалогом кнопки шапки.
  await page.locator('.lx-leave').click()

  await expect(page.getByText('Вы вышли из класса')).toBeVisible()
  await page.getByText('Вернуться в класс').click()

  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })
  expect(attempts).toBe(settled)
})

// Находка 1 финального ревью: преподаватель нажал «Завершить» — вкладка
// раньше оставалась в том же уроке навсегда (boothLessonId никогда не
// сбрасывался), и следующий посетитель видел работу предыдущего, а «Выйти из
// урока» возвращало ровно в тот же завершённый урок, минуя новый /enter.
// Автовход при этом тоже под запретом: он завёл бы новое занятие в ту же
// секунду, когда преподаватель закончил, хотя за планшетом ещё никого нет.
test('урок завершился — вкладка уходит из него сама, новый вход только по кнопке', async ({ page }) => {
  await stubAccount(page)
  await page.route('**/auth/login', (r) =>
    r.fulfill(json({ accessToken: TOKEN, refreshToken: 'r', userId: 501, name: BOOTH_NAME, role: 'STUDENT' })))
  let attempts = 0
  await page.route('**/trial/booth/enter', (r) => {
    attempts += 1
    return r.fulfill(json(ENTERED))
  })

  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.getByPlaceholder('Телефон или почта').fill(BOOTH_LOGIN)
  await page.getByPlaceholder('Пароль').fill(BOOTH_PASSWORD)
  await page.locator('.form-primary').click()

  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(500)
  const settled = attempts

  // Преподаватель нажал «Завершить»: следующий опрос статуса (LiveLessonPage
  // опрашивает /admin/lessons/77 раз в 5 с) приносит уже COMPLETED.
  await page.unroute('**/admin/lessons/77')
  await page.route('**/admin/lessons/77', (r) => r.fulfill(json({ ...LESSON, status: 'COMPLETED' })))

  // Вкладка уходит из урока сама — работы предыдущего посетителя на экране
  // больше нет (он весь размонтирован вместе с экраном урока).
  await expect(page.getByText('Урок завершён')).toBeVisible({ timeout: 12_000 })
  await expect(page.getByText('Живой урок')).toHaveCount(0)

  // И без нажатия кнопки новый вход не уходит, сколько ни жди.
  await page.waitForTimeout(6000)
  expect(attempts).toBe(settled)

  // Новое занятие после входа снова «идёт».
  await page.unroute('**/admin/lessons/77')
  await page.route('**/admin/lessons/77', (r) => r.fulfill(json(LESSON)))

  await page.getByRole('button', { name: 'Войти в класс' }).click()

  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })
  expect(attempts).toBe(settled + 1)
})

// Находка 2 финального ревью: boothLessonId живёт только в состоянии React, а
// адрес урок помнит (?screen=live-lesson&live=77). Перезагрузка прямо внутри
// урока раньше стирала boothLessonId, и «Выйти из урока» после неё звало
// /enter заново — бэкенд закрыл бы ещё живой сеанс как забытый.
test('перезагрузка внутри урока не забывает сеанс — выход не заходит в класс повторно', async ({ page }) => {
  await stubAccount(page)
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), TOKEN)
  let attempts = 0
  await page.route('**/trial/booth/enter', (r) => {
    attempts += 1
    return r.fulfill(json(ENTERED))
  })

  await page.goto('/?screen=live-lesson&live=77')
  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })

  // Тот же сценарий, что и жалоба про F5: перезагрузка прямо внутри урока.
  await page.reload()
  await expect(page.getByText('Живой урок')).toBeVisible({ timeout: 15_000 })

  await page.waitForTimeout(500)
  const settled = attempts

  await page.locator('.lv-top__act--exit:visible, .lv-top__exit:visible').click()
  await page.locator('.lx-leave').click()

  // Сеанс, восстановленный из адреса, экран класса считает известным — «Вы
  // вышли из класса», а не повторный вход.
  await expect(page.getByText('Вы вышли из класса')).toBeVisible()
  await page.waitForTimeout(6000)
  expect(attempts).toBe(settled)
})
