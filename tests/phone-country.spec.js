import { test, expect } from '@playwright/test'

// Экран входа по телефону: селектор кода страны вместо захардкоженного
// флага России и «+7». Регрессии:
//   1) по умолчанию — Казахстан (🇰🇿 +7), а не Россия;
//   2) можно выбрать другой код (напр. Узбекистан +998) и отправить номер;
//   3) КРИТИЧНО: для +7 на бэкенд уходит канонический «7XXXXXXXXXX» —
//      формат существующих пользователей, иначе вход по OTP сломается.

test.describe('код страны в телефонном вводе', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'достаточно одного вьюпорта')

  test('по умолчанию Казахстан +7, а не Россия', async ({ page }) => {
    await page.goto('/?screen=phone')
    await expect(page.locator('.phone-country__dial')).toHaveText('+7')

    await page.locator('.phone-country__btn').click()
    const items = page.locator('.phone-country__item')
    await expect(items.first()).toContainText('Казахстан')
    // Активен именно Казахстан (а не Россия).
    await expect(page.locator('.phone-country__item.is-active')).toContainText('Казахстан')
    // Россия остаётся доступной как вариант — просто не по умолчанию.
    await expect(items.filter({ hasText: 'Россия' })).toHaveCount(1)
  })

  test('выбор другого кода: Узбекистан +998', async ({ page }) => {
    await page.goto('/?screen=phone')
    await page.locator('.phone-country__btn').click()
    await page.locator('.phone-country__item', { hasText: 'Узбекистан' }).click()
    await expect(page.locator('.phone-country__dial')).toHaveText('+998')

    await page.locator('.phone-field input').fill('901234567')
    await expect(page.locator('.phone-field input')).toHaveValue('901 234 567')
    await expect(page.locator('.form-primary')).toBeEnabled()
  })

  test('на бэкенд для +7 уходит «7XXXXXXXXXX» (совместимость со старыми юзерами)', async ({ page }) => {
    // Перехватываем OTP-запрос и подставляем успешный ответ, чтобы поймать номер.
    let sentPhone = null
    await page.route('**/registration/initiate', async (route) => {
      sentPhone = JSON.parse(route.request().postData() || '{}').phone
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    })
    await page.route('**/auth/otp/request', async (route) => {
      sentPhone = JSON.parse(route.request().postData() || '{}').phone
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    })

    await page.goto('/?screen=phone')
    await page.locator('.phone-field input').fill('7771234567') // 10 цифр нац. номера
    await page.locator('.form-primary').click()

    await expect.poll(() => sentPhone).toBe('77771234567') // 7 + 10 цифр, без «+»
  })
})
