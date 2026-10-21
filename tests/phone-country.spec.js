import { test, expect } from '@playwright/test'

// Код страны в телефоне. Выбор страны живёт на шаге регистрации «Как с вами
// связаться?» (макет «Регистрация», 21.10.2026: «KZ +7 │ номер»). Регрессии:
//   1) по умолчанию — Казахстан (+7), а не Россия;
//   2) можно выбрать другой код (напр. Узбекистан +998);
//   3) КРИТИЧНО: для +7 на бэкенд уходит канонический «7XXXXXXXXXX» —
//      формат существующих пользователей, иначе вход по OTP сломается. Это же
//      и для входа по коду, где поле одно и страны в нём не выбрать.

test.describe('код страны в телефонном вводе', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'достаточно одного вьюпорта')

  test('по умолчанию Казахстан +7, а не Россия', async ({ page }) => {
    await page.goto('/?screen=reg-contacts')
    await expect(page.locator('.rg-phone__dial')).toHaveText('+7', { timeout: 20_000 })
    await expect(page.locator('.rg-phone__iso')).toHaveText('KZ')

    await page.locator('.rg-phone__country').click()
    const items = page.locator('.rg-phone__item')
    await expect(items.first()).toContainText('Казахстан')
    // Активен именно Казахстан (а не Россия).
    await expect(page.locator('.rg-phone__item.is-active')).toContainText('Казахстан')
    // Россия остаётся доступной как вариант — просто не по умолчанию.
    await expect(items.filter({ hasText: 'Россия' })).toHaveCount(1)
  })

  test('выбор другого кода: Узбекистан +998', async ({ page }) => {
    await page.goto('/?screen=reg-contacts')
    await page.locator('.rg-phone__country').click({ timeout: 20_000 })
    await page.locator('.rg-phone__item', { hasText: 'Узбекистан' }).click()
    await expect(page.locator('.rg-phone__dial')).toHaveText('+998')

    await page.locator('#rg-phone').fill('901234567')
    await expect(page.locator('#rg-phone')).toHaveValue('901 234 567')
  })

  test('регистрация: на бэкенд для +7 уходит «7XXXXXXXXXX»', async ({ page }) => {
    let sentPhone = null
    await page.route(/\/registration\/initiate/, async (route) => {
      sentPhone = JSON.parse(route.request().postData() || '{}').phone
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    })

    await page.goto('/?screen=reg-contacts')
    await page.locator('#rg-email').fill('anna@mail.com', { timeout: 20_000 })
    await page.locator('#rg-phone').fill('7771234567') // 10 цифр нац. номера
    await page.locator('.rg-btn').first().click()

    await expect.poll(() => sentPhone).toBe('77771234567') // 7 + 10 цифр, без «+»
  })

  test('вход по коду: десять цифр без кода уходят как «7XXXXXXXXXX»', async ({ page }) => {
    let sentPhone = null
    await page.route(/\/auth\/otp\/request/, async (route) => {
      sentPhone = JSON.parse(route.request().postData() || '{}').phone
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    })

    await page.goto('/?screen=phone')
    await page.locator('#rg-login-id').fill('777 123 45 67', { timeout: 20_000 })
    await page.locator('.rg-btn').first().click()

    await expect.poll(() => sentPhone).toBe('77771234567')
  })
})
