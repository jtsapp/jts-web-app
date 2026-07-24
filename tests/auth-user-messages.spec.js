import { test, expect } from '@playwright/test'

// Регистрация и вход по телефону должны честно сообщать про статус номера в
// базе, а не молча уводить в другой флоу или показывать сырой текст бэкенда:
//   1) регистрация занятого номера → «Пользователь уже существует…» (раньше UI
//      молча переключался на вход по OTP);
//   2) вход незарегистрированным номером → «Пользователь не существует…»
//      (раньше показывалось английское «User with this phone not found»).
// Бэкенд замокан — проверяем только клиентскую обработку ответов.

const json = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

test('регистрация занятого номера: «Пользователь уже существует»', async ({ page }) => {
  // Бэкенд: номер уже в базе → 400 с сообщением в формате GeneralResponse.
  await page.route('**/registration/initiate', (r) =>
    r.fulfill(json({ messages: ['User with this phone already exists'] }, 400)),
  )
  // Страховка: даже если тихий фолбэк вернётся, вход по OTP не должен «спасать»
  // регистрацию занятого номера — тест поймает переход на экран кода.
  await page.route('**/auth/otp/request', (r) => r.fulfill(json({ ok: true })))

  await page.goto('/')
  // «Регистрация» → чат Декстера собирает имя, затем кнопка телефона.
  await page.locator('.btn--primary').click()
  await page.locator('.chat__input input').fill('Тест')
  await page.locator('.chat__input input').press('Enter')
  await page.locator('.auth-primary').click({ timeout: 15_000 })

  await page.locator('.phone-field input').fill('7771234567')
  await page.locator('.form-primary').click()

  await expect(page.locator('.form-error')).toContainText('уже существует')
  // Не ушли на ввод кода — регистрация занятого номера остановлена.
  await expect(page.locator('.otp-box')).toHaveCount(0)
})

test('вход незарегистрированным номером: «Пользователь не существует»', async ({ page }) => {
  // Бэкенд: номера нет в базе → 400 «not found».
  await page.route('**/auth/otp/request', (r) =>
    r.fulfill(json({ messages: ['User with this phone not found'] }, 400)),
  )

  await page.goto('/')
  // «Войти» (intent=login) → сразу телефон, без /registration/initiate.
  await page.locator('.btn--secondary').click()
  await page.locator('.phone-field input').fill('7770000000')
  await page.locator('.form-primary').click()

  await expect(page.locator('.form-error')).toContainText('не существует')
  await expect(page.locator('.otp-box')).toHaveCount(0)
})
