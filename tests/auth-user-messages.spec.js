import { test, expect } from '@playwright/test'

// Регистрация и вход должны честно сообщать, что идентификатор уже занят
// или ещё не заведён, а не сыпать «не удалось выполнить операцию в базе
// данных» и не уводить молча в другой флоу.
// Бэкенд замокан — проверяем только клиентскую обработку ответов.

const json = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

async function startRegistrationThroughBirthDate(page) {
  await page.goto('/')
  await page.locator('.btn--primary').click()
  await page.locator('.chat__input input').fill('Тест')
  await page.locator('.chat__input input').press('Enter')
  await page.locator('.auth-primary').click({ timeout: 15_000 })

  await page.locator('.phone-field input').fill('7771234567')
  await page.locator('.form-primary').click()

  await page.locator('.email-field').fill('litovandrew@gmail.com')
  await page.locator('.form-primary').click()

  await page.locator('.dob-field__part--day').fill('15')
  await page.locator('.dob-field__part--month').fill('03')
  await page.locator('.dob-field__part--year').fill('2000')
}

test('регистрация занятого телефона: «уже есть в системе»', async ({ page }) => {
  await page.route('**/registration/initiate', (r) =>
    r.fulfill(json({ messages: ['Пользователь с таким телефоном уже есть в системе'] }, 400)),
  )
  await page.route('**/auth/otp/request', (r) => r.fulfill(json({ ok: true })))

  await startRegistrationThroughBirthDate(page)
  await page.locator('.form-primary').click()

  await expect(page.locator('.form-error')).toContainText('уже есть в системе')
  await expect(page.locator('.otp-box')).toHaveCount(0)
})

test('регистрация занятой почты: «уже есть в системе»', async ({ page }) => {
  await page.route('**/registration/initiate', (r) =>
    r.fulfill(json({ messages: ['Пользователь с такой почтой уже есть в системе'] }, 400)),
  )

  await startRegistrationThroughBirthDate(page)
  await page.locator('.form-primary').click()

  await expect(page.locator('.form-error')).toContainText('уже есть в системе')
  await expect(page.locator('.otp-box')).toHaveCount(0)
})

test('повторная регистрация на verify (ошибка БД) тоже говорит, что пользователь уже есть', async ({ page }) => {
  await page.route('**/registration/initiate', (r) => r.fulfill(json({ messages: ['OTP sent'] })))
  await page.route('**/registration/verify', (r) =>
    r.fulfill(json({ messages: ['Не удалось выполнить операцию в базе данных'] }, 500)),
  )

  await startRegistrationThroughBirthDate(page)
  await page.locator('.form-primary').click()

  const boxes = page.locator('.otp-box')
  await expect(boxes).toHaveCount(4)
  await boxes.nth(0).fill('1')
  await boxes.nth(1).fill('2')
  await boxes.nth(2).fill('3')
  await boxes.nth(3).fill('4')
  await page.locator('.form-primary').click()

  await expect(page.locator('.form-error')).toContainText('уже есть в системе')
})

test('вход незарегистрированным номером: «Пользователь не существует»', async ({ page }) => {
  await page.route('**/auth/otp/request', (r) =>
    r.fulfill(json({ messages: ['User with this phone not found'] }, 400)),
  )

  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.locator('.phone-field input').fill('7770000000')
  await page.locator('.form-primary').click()

  await expect(page.locator('.form-error')).toContainText('не существует')
  await expect(page.locator('.otp-box')).toHaveCount(0)
})
