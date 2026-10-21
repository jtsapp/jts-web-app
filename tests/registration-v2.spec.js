import { test, expect } from '@playwright/test'

// Регистрация по макету «Регистрация» (Figma, секции «1 · Регистрация» и
// «2 · Регистрация», 21.10.2026) целиком: язык → имя и дата → почта и телефон →
// код из письма → пароль → «Регистрация пройдена». Бэкенд замокан: проверяем,
// что уходит в каждую ручку и куда ведёт каждый шаг.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
// Токен с правдоподобной нагрузкой: экраны после входа читают из него id ученика.
const TOKEN = `e30.${Buffer.from(JSON.stringify({ sub: '77000004567', userId: 901, role: 'STUDENT' })).toString('base64url')}.sig`

async function mockBackend(page, calls) {
  // Всё, что не про регистрацию, — пустой успех: свежий токен иначе отвергли бы, и приложение разлогинило бы сессию.
  await page.route(/dev-server\.justtostudy\.kz|\/\/localhost:\d+\/api\/(profile|auth)/, (r) => r.fulfill(json({})))
  await page.route('**/registration/initiate**', (r) => {
    calls.initiate = r.request().postDataJSON()
    return r.fulfill(json({ messages: ['OTP sent'] }))
  })
  await page.route('**/registration/verify**', (r) => {
    calls.verify = r.request().postDataJSON()
    if (calls.verify.otp !== '4827') return r.fulfill(json({ messages: ['Invalid or expired OTP'] }, 400))
    return r.fulfill(json({ accessToken: TOKEN, refreshToken: 'r', userId: 901, name: 'Анна', role: 'STUDENT' }))
  })
  await page.route('**/user/set-password**', (r) => {
    calls.password = r.request().postDataJSON()
    return r.fulfill(json({}))
  })
}

test('регистрация проходит все шаги макета', async ({ page }) => {
  const calls = {}
  await mockBackend(page, calls)
  await page.goto('/')
  await page.locator('.btn--primary').click()

  // 1. Язык: выбор применяется сразу — экран переводится.
  await page.locator('.rg-lang', { hasText: 'Қазақша' }).click()
  await expect(page.locator('.rg-title')).toHaveText('Тілді таңдаңыз')
  await page.locator('.rg-lang', { hasText: 'Русский' }).click()
  await expect(page.locator('.rg-title')).toHaveText('Выберите язык')
  await page.locator('.rg-btn').click()

  // 2. Имя и дата. Пустую форму не пускает.
  await expect(page.locator('.rg-steps__label')).toHaveText('Шаг 1 из 4')
  await page.locator('.rg-btn').click()
  await expect(page.locator('.rg-note--error')).toHaveCount(2)
  await page.locator('#rg-name').fill('Анна')
  await page.locator('.dob-field__part--day').fill('14')
  await page.locator('.dob-field__part--month').fill('03')
  await page.locator('.dob-field__part--year').fill('1998')
  await page.locator('.rg-btn').click()

  // 3. Почта и телефон — код запрашивается с обоими и с датой.
  await expect(page.locator('.rg-steps__label')).toHaveText('Шаг 2 из 4')
  await page.locator('#rg-email').fill('anna@mail.com')
  await page.locator('#rg-phone').fill('7000004567')
  await page.locator('.rg-btn').first().click()
  await expect.poll(() => calls.initiate).toMatchObject({
    name: 'Анна',
    email: 'anna@mail.com',
    phone: '77000004567',
    birthDate: '1998-03-14',
  })

  // 4. Код из письма: неверный — красные ячейки и строка; новая цифра начинает заново.
  await expect(page.locator('.rg-steps__label')).toHaveText('Шаг 3 из 4')
  await expect(page.locator('.rg-to')).toContainText('anna@mail.com')
  const cells = page.locator('.rg-code__cell')
  for (const [i, d] of ['1', '1', '1', '1'].entries()) await cells.nth(i).fill(d)
  await expect(page.locator('.rg-code.is-invalid')).toBeVisible()
  await expect(page.locator('.rg-note--error')).toContainText('Неверный код')
  await page.keyboard.type('4827')
  await expect.poll(() => calls.verify?.otp).toBe('4827')

  // 5. Пароль: несовпадающий не уходит.
  await expect(page.locator('.rg-steps__label')).toHaveText('Шаг 4 из 4')
  await page.locator('#rg-pass').fill('secret12')
  await page.locator('#rg-pass2').fill('secret13')
  await page.locator('.rg-btn').click()
  await expect(page.locator('.rg-note--error')).toContainText('не совпадают')
  expect(calls.password).toBeUndefined()
  await page.locator('#rg-pass2').fill('secret12')
  await page.locator('.rg-btn').click()
  await expect.poll(() => calls.password).toEqual({ password: 'secret12' })

  // 6. Итог — с кнопкой, а не таймером.
  await expect(page.locator('.rg-title')).toHaveText('Регистрация пройдена')
  await expect(page.locator('.rg-btn')).toBeVisible()
})

test('«Изменить» на шаге кода возвращает к почте с введёнными данными', async ({ page }) => {
  const calls = {}
  await mockBackend(page, calls)
  await page.goto('/?screen=reg-name')
  await page.locator('#rg-name').fill('Анна', { timeout: 20_000 })
  await page.locator('.dob-field__part--day').fill('14')
  await page.locator('.dob-field__part--month').fill('03')
  await page.locator('.dob-field__part--year').fill('1998')
  await page.locator('.rg-btn').click()
  await page.locator('#rg-email').fill('anna@mail.com')
  await page.locator('#rg-phone').fill('7000004567')
  await page.locator('.rg-btn').first().click()

  await page.locator('.rg-to .rg-link').click()
  await expect(page.locator('#rg-email')).toHaveValue('anna@mail.com')
  await expect(page.locator('#rg-phone')).toHaveValue(/700/)
})
