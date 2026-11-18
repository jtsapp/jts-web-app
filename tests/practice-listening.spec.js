import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'

// Карточка мини-игры «Тренируй Listening» на странице Практики. С 17.11.2026 игра — карточка вкладок «Аудирование»
// и «Игры» (файл методиста). Проверяем, где она живёт, и что переключатель уровня под вкладками синхронизирован с
// уровнем пользователя (languageLevel из /api/auth/me).

async function mockAuth(page, languageLevel) {
  // Замки develop с 29.10.2026 (документы платформы, разделы тарифа) — иначе вместо Практики их экран.
  await mockGates(page)
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

test.describe('Практика — карточка мини-игры «Listening»', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'десктопный дизайн')

  const level = (page) => page.locator('.pk-levels__btn[aria-checked="true"]')

  test('уровень в шапке совпадает с уровнем пользователя', async ({ page }) => {
    await mockAuth(page, 'B1')
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    await expect(page.locator('.pk-skills')).toBeVisible({ timeout: 15000 })

    // Уровень синхронизирован с пользователем (B1, не дефолтный A1).
    await expect(level(page)).toHaveText('B1')
  })

  test('карточка игры — в «Аудировании» и в «Играх», а в «Чтении» её нет', async ({ page }) => {
    await mockAuth(page, 'A2')
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
    await page.goto('/?screen=practice')

    // С 18.11.2026 игр в Практике нет: «Аудирование» без мини-игры, она — в разделе меню «Игры».
    const card = page.locator('#sec-listening')
    await expect(page.locator('#sec-listenchoose')).toBeVisible({ timeout: 15000 })
    await expect(card).toHaveCount(0)

    await page.goto('/?screen=games')
    await expect(card).toBeVisible({ timeout: 15000 })
    await expect(card.locator('.pk-card__title')).toHaveText('Тренируй Listening в мини-игре')
    // У «Игр» уровня нет: игры его не знают.
    await expect(page.locator('.pk-levels')).toHaveCount(0)
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
