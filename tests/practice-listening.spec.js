import { test, expect } from '@playwright/test'

// Баннер «Аудирование» на странице Практики: промо мини-игры listening.
// Проверяем, что баннер рендерится и бейдж уровня синхронизирован с уровнем
// пользователя (languageLevel из /api/auth/me). Кнопки пока заглушки.

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

  test('бейдж уровня совпадает с уровнем пользователя', async ({ page }) => {
    await mockAuth(page, 'B1')
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    const banner = page.locator('.pp-listen')
    await expect(banner).toBeVisible({ timeout: 15000 })

    // Заголовок, описание, CTA — контент баннера.
    await expect(banner.locator('.pp-listen__title')).toContainText('Тренируй Listening')
    await expect(banner.locator('.pp-listen__cta')).toHaveText('Перейти к тренировке')
    await expect(banner).toContainText('Собран по вашему уровню')

    // Уровень синхронизирован с пользователем (B1, не дефолтный A1).
    await expect(banner.locator('.pp-listen__level')).toHaveText('B1')
  })

  test('баннер только на вкладке «Все»: при выборе «Грамматика» скрыт', async ({ page }) => {
    await mockAuth(page, 'A2')
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    const banner = page.locator('.pp-listen')
    await expect(banner).toBeVisible({ timeout: 15000 })

    // Переключаемся на фильтр «Грамматика» — баннер должен исчезнуть.
    await page.getByRole('button', { name: 'Грамматика', exact: true }).click()
    await expect(banner).toHaveCount(0)

    // Возврат на «Все» — баннер снова виден.
    await page.getByRole('button', { name: 'Все', exact: true }).click()
    await expect(banner).toBeVisible()
  })

  test('дефолт A1, если уровень пользователя не задан', async ({ page }) => {
    await mockAuth(page, null)
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    const level = page.locator('.pp-listen__level')
    await expect(level).toBeVisible({ timeout: 15000 })
    await expect(level).toHaveText('A1')
  })
})
