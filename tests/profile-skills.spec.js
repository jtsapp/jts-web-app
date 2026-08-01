import { test, expect } from '@playwright/test'

test.describe('профиль / рейтинг навыков', () => {
  test('карточка навыков видна, 6 строк, у каждой 10 сегментов', async ({ page }) => {
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf')).toBeVisible({ timeout: 20_000 })
    const card = page.locator('.pf-skills')
    await expect(card).toBeVisible()
    await expect(card.locator('.pf-skill')).toHaveCount(6)
    // без данных (гость) — каждая шкала имеет 10 сегментов, 2 приглушённых заполнены
    const firstRow = card.locator('.pf-skill').first()
    await expect(firstRow.locator('.pf-skill__seg')).toHaveCount(10)
    await expect(firstRow.locator('.pf-skill__seg.is-muted')).toHaveCount(2)
  })
})
