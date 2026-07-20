import { test, expect } from '@playwright/test'

// Внутренние экраны тьютор-зоны. До мобильной адаптации они рисовались
// десктопными колонками/сетками: manage резал историю, план уроков — карточки,
// сценарии — четвёртую колонку. Плюс демо-хардкод (переписка «Hello, Saken!»,
// семь одинаковых уроков) заменён реальными данными или пустыми состояниями.

// Ключевой контент каждого экрана, который обязан помещаться в экран целиком.
const SCREENS = [
  { screen: 'tutor-manage', content: '.t-manage__empty' },
  { screen: 'tutor-lesson-plan', content: '.t-plan__card' },
  { screen: 'tutor-scenarios', content: '.t-scen__card' },
  { screen: 'tutor-practice-result', content: '.t-result2__title' },
  { screen: 'tutor-error-analytics', content: '.t-erran__empty' },
  { screen: 'tutor-chat-history', content: '.t-chat__empty' },
]

test.describe('внутренние экраны тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  for (const { screen, content } of SCREENS) {
    test(`${screen}: контент внутри вьюпорта, без горизонтального клипа`, async ({ page, viewport }) => {
      await page.goto(`/?screen=${screen}`)
      const el = page.locator(content).first()
      await expect(el).toBeVisible()

      // Документ не шире экрана…
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1)

      // …и ключевой блок не срезан правым краем (раньше клипался контейнером).
      const box = await el.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(-1)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    })
  }

  test('сценарии: сетка в две колонки, обе видны целиком', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-scenarios')
    const cards = page.locator('.t-scen__card')
    await expect(cards.first()).toBeVisible()
    // Первая пара карточек лежит в одном ряду и обе помещаются в экран.
    const a = await cards.nth(0).boundingBox()
    const b = await cards.nth(1).boundingBox()
    expect(Math.abs(a.y - b.y)).toBeLessThan(2)
    expect(b.x + b.width).toBeLessThanOrEqual(viewport.width + 1)
  })
})

test.describe('внутренние экраны тьютора — контент', () => {
  test('план уроков — сюжетная цепочка сценариев, без демо-уроков', async ({ page }) => {
    await page.goto('/?screen=tutor-lesson-plan')
    await expect(page.locator('.t-plan__card')).toHaveCount(7)
    await expect(page.locator('.t-plan__title').first()).toHaveText('U.S. Visa Interview')
    // Демо-заглушка «Практика Present Continious» ушла вместе с опечаткой.
    await expect(page.locator('.t-plan')).not.toContainText('Continious')
  })

  test('история чатов без демо-переписки, разбор ошибок без демо-текста', async ({ page }) => {
    await page.goto('/?screen=tutor-chat-history')
    await expect(page.locator('.t-chat__empty')).toBeVisible()
    await expect(page.locator('.t-bubble')).toHaveCount(0)

    await page.goto('/?screen=tutor-error-analytics')
    await expect(page.locator('.t-erran__empty')).toBeVisible()
    await expect(page.locator('.t-erran__block')).toHaveCount(0)
  })
})
