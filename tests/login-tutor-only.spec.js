import { test, expect } from '@playwright/test'

// Регрессия: в режиме «только тьютор» (main) свежий вход по телефону вёл в
// королевства — экран success игнорировал TUTOR_ONLY и слал в 'kingdom',
// а до тьюторского голосового теста уровня пользователь не добирался вовсе.
// Бэкенд замокан: интересует только маршрутизация после успешного входа.

test('после входа открывается тьютор-зона, а не королевства', async ({ page }) => {
  const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/auth/otp/request', (r) => r.fulfill(json({ ok: true })))
  // Номер «занят» — иначе UI уходит в ветку регистрации вместо входа.
  await page.route('**/registration/initiate', (r) => r.fulfill(json({ error: 'exists' }, 400)))
  await page.route('**/auth/otp/verify', (r) => r.fulfill(json({ accessToken: 'e2e-token', name: 'Тест' })))
  // Уровень в профиле уже есть — именно этот случай раньше вёл в 'kingdom'.
  await page.route('**/user/language-level', (r) => r.fulfill(json({ languageLevel: 'B1' })))
  await page.route('**/api/profile/merge', (r) => r.fulfill(json({ ok: true })))
  await page.route('**/api/profile?**', (r) => r.fulfill(json({ configured: true, profile: null })))

  await page.goto('/?screen=phone')
  await page.locator('.phone-field input').fill('7771234567')
  await page.locator('.form-primary').click()

  const boxes = page.locator('.otp-box')
  await expect(boxes.first()).toBeVisible()
  // Инпуты сами перекидывают фокус на следующий — печатаем код подряд.
  await boxes.first().click()
  await page.keyboard.type('1234')
  await page.locator('.form-primary').click()

  // SuccessPage сам уводит дальше через ~1.8с: тьютор без анкеты → онбординг
  // (там и голосовой тест уровня), и никаких королевств.
  await expect(page.locator('.t-welcome__title')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.learn__body')).toHaveCount(0)
})
