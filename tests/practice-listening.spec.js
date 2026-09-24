import { test, expect } from '@playwright/test'

// Баннер «Аудирование» на странице Практики: промо мини-игры listening.
// Проверяем, что баннер рендерится во вкладке «Аудирование», а переключатель
// уровня в шапке синхронизирован с уровнем пользователя (languageLevel из
// /api/auth/me).

function mockAuth(page, languageLevel) {
  return page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel },
      }),
    }),
  )
}

test.describe('Практика — баннер «Аудирование»', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'баннер — десктопный дизайн')

  const level = (page) => page.locator('.pk-levels__btn[aria-checked="true"]')

  test('уровень в шапке совпадает с уровнем пользователя', async ({ page }) => {
    await mockAuth(page, 'B1')
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    const banner = page.locator('#sec-listening')
    await expect(banner).toBeVisible({ timeout: 15000 })

    // Заголовок, описание, CTA — контент баннера.
    await expect(banner.locator('.pk-banner__title')).toContainText('Тренируй Listening')
    await expect(banner.locator('.pk-banner__cta')).toHaveText('Перейти к тренировке')

    // Уровень синхронизирован с пользователем (B1, не дефолтный A1).
    await expect(level(page)).toHaveText('B1')
  })

  test('баннер только во вкладке «Аудирование»: во «Письме» скрыт', async ({ page }) => {
    await mockAuth(page, 'A2')
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    const banner = page.locator('#sec-listening')
    await expect(banner).toBeVisible({ timeout: 15000 })

    await page.locator('.pk-skill', { hasText: 'Письмо' }).click()
    await expect(banner).toHaveCount(0)

    await page.locator('.pk-skill', { hasText: 'Аудирование' }).click()
    await expect(banner).toBeVisible()
  })

  test('дефолт A1, если уровень пользователя не задан', async ({ page }) => {
    await mockAuth(page, null)
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    await expect(level(page)).toBeVisible({ timeout: 15000 })
    await expect(level(page)).toHaveText('A1')
  })
})
