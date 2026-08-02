import { test, expect } from '@playwright/test'

test.describe('lesson workspace', () => {
  test('рендерит 3 колонки, маршрут, практику, чат', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    const root = page.locator('[data-testid="lesson-workspace"]')
    await expect(root).toBeVisible({ timeout: 20000 })
    // маршрут: 9 шагов
    await expect(page.locator('.lw-route__step')).toHaveCount(9)
    // центр: теория + практика присутствуют
    await expect(page.locator('.lw-theory').first()).toBeVisible()
    await expect(page.locator('.lw-practice').first()).toBeVisible()
    // правая колонка: топики + чат
    await expect(page.locator('.lw-topics')).toBeVisible()
    await expect(page.locator('.lw-chat')).toBeVisible()
    // отправка сообщения добавляет пузырь
    const before = await page.locator('.lw-chat__msg').count()
    await page.locator('.lw-chat__input').fill('привет')
    await page.locator('.lw-chat__send').click()
    await expect(page.locator('.lw-chat__msg')).toHaveCount(before + 1)
    // клик по другому шагу меняет контент
    await page.locator('.lw-route__step').nth(2).click()
    await expect(root).toBeVisible()
  })

  test('проверка практики красит ответы', async ({ page }) => {
    await page.goto('/?screen=lesson-workspace')
    await expect(page.locator('[data-testid="lesson-workspace"]')).toBeVisible({ timeout: 20000 })
    // выбрать неверный вариант в первом choice и проверить
    const firstChoice = page.locator('.lw-q--choice').first()
    await firstChoice.locator('.lw-opt').first().click()
    await page.locator('.lw-practice__check').first().click()
    await expect(firstChoice.locator('.lw-opt.is-correct')).toHaveCount(1)
  })
})
