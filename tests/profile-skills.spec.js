import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Кабинет без входа не рисуется (lib/guestLogin.js) — входим учеником без данных навыков. На телефоне профиль —
// экраны дизайна приложения (ProfilePhone, классы pfm-*), на компьютере — прежняя страница (SkillRatings).
test.describe('профиль / рейтинг навыков', () => {
  test('карточка навыков видна, 6 строк, у каждой 10 сегментов', async ({ page, viewport }) => {
    await loginAsStudent(page)
    await page.goto('/?screen=profile')
    if ((viewport?.width ?? 0) <= 560) {
      const rows = page.locator('.pfm-skill')
      await expect(rows).toHaveCount(6, { timeout: 20_000 })
      // Данных нет — шкала пустая, как у строк «нет данных» в кадре.
      await expect(rows.first().locator('.pfm-skill__segs i')).toHaveCount(10)
      await expect(rows.first().locator('.pfm-skill__segs i.is-on')).toHaveCount(0)
      return
    }
    await expect(page.locator('.pf')).toBeVisible({ timeout: 20_000 })
    const card = page.locator('.pf-skills')
    await expect(card).toBeVisible()
    await expect(card.locator('.pf-skill')).toHaveCount(6)
    // без данных — каждая шкала имеет 10 сегментов, 2 приглушённых заполнены
    const firstRow = card.locator('.pf-skill').first()
    await expect(firstRow.locator('.pf-skill__seg')).toHaveCount(10)
    await expect(firstRow.locator('.pf-skill__seg.is-muted')).toHaveCount(2)
  })
})
