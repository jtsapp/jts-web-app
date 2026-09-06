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
  await page.waitForTimeout(6000)
  expect(attempts).toBe(1)
})
