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

// Регистрация по макету «Регистрация» (21.10.2026): язык → имя и дата → почта и
// телефон. Возвращает страницу на шаге «Как с вами связаться?» с заполненными полями.
async function startRegistrationThroughContacts(page) {
  await page.goto('/')
  await page.locator('.btn--primary').click()
  await page.locator('.rg-lang').first().waitFor({ timeout: 20_000 })
  await page.locator('.rg-btn').click()

  await page.locator('#rg-name').fill('Тест')
  await page.locator('.dob-field__part--day').fill('15')
  await page.locator('.dob-field__part--month').fill('03')
  await page.locator('.dob-field__part--year').fill('2000')
  await page.locator('.rg-btn').click()

  await page.locator('#rg-email').fill('litovandrew@gmail.com')
  await page.locator('#rg-phone').fill('7771234567')
}

test('регистрация занятого телефона: ошибка под полем номера', async ({ page }) => {
  await page.route(/\/registration\/initiate/, (r) =>
    r.fulfill(json({ messages: ['Пользователь с таким телефоном уже есть в системе'] }, 400)),
  )
  await page.route(/\/auth\/otp\/request/, (r) => r.fulfill(json({ ok: true })))

  await startRegistrationThroughContacts(page)
  await page.locator('.rg-btn').first().click()

  const phoneField = page.locator('.rg-field', { has: page.locator('#rg-phone') })
  await expect(phoneField.locator('.rg-note--error')).toContainText('Этот номер уже зарегистрирован')
  await expect(page.locator('.rg-code__cell')).toHaveCount(0)
})

test('регистрация занятой почты: ошибка под полем почты со ссылкой «Войти»', async ({ page }) => {
  await page.route(/\/registration\/initiate/, (r) =>
    r.fulfill(json({ messages: ['Пользователь с такой почтой уже есть в системе'] }, 400)),
  )

  await startRegistrationThroughContacts(page)
  await page.locator('.rg-btn').first().click()

  const emailField = page.locator('.rg-field', { has: page.locator('#rg-email') })
  await expect(emailField.locator('.rg-note--error')).toContainText('Эта почта уже зарегистрирована')
  await expect(page.locator('.rg-code__cell')).toHaveCount(0)
  await emailField.locator('.rg-note--error button').click()
  await expect(page.locator('#rg-login-id')).toBeVisible()
})

test('повторная регистрация на verify (ошибка БД) тоже говорит, что пользователь уже есть', async ({ page }) => {
  await page.route(/\/registration\/initiate/, (r) => r.fulfill(json({ messages: ['OTP sent'] })))
  await page.route(/\/registration\/verify/, (r) =>
    r.fulfill(json({ messages: ['Не удалось выполнить операцию в базе данных'] }, 500)),
  )

  await startRegistrationThroughContacts(page)
  await page.locator('.rg-btn').first().click()

  const cells = page.locator('.rg-code__cell')
  await expect(cells).toHaveCount(4)
  // Кнопки нет: код проверяется сам после четвёртой цифры.
  for (const [i, d] of ['1', '2', '3', '4'].entries()) await cells.nth(i).fill(d)

  await expect(page.locator('.rg-note--error')).toContainText('уже есть в системе')
})

test('вход незарегистрированным номером: «Пользователь не существует»', async ({ page }) => {
  await page.route(/\/auth\/otp\/request/, (r) =>
    r.fulfill(json({ messages: ['User with this phone not found'] }, 400)),
  )

  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.getByRole('button', { name: 'Войти по коду из сообщения' }).click()
  await page.locator('#rg-login-id').fill('7770000000')
  await page.locator('.rg-btn').first().click()

  await expect(page.locator('.rg-note--error')).toContainText('не существует')
  await expect(page.locator('.rg-code__cell')).toHaveCount(0)
})
