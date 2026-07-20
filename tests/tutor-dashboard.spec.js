import { test, expect } from '@playwright/test'

// Дашборд тьютора: виджет «План уроков» (хардкод-заглушка) убран, остались
// герой с микрофоном и превью сценариев. На мобилке раньше десктопные две
// колонки сжимались в кашу — контракт ниже фиксирует вертикальную раскладку.

test.describe('дашборд тьютора — контент', () => {
  test('плана уроков нет, сценарии на месте', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')

    // Герой: микрофон и подсказка занятия.
    await expect(page.locator('.t-dash__mic')).toBeVisible()

    // Секция в панели ровно одна — «Сценарии»; от плана уроков не осталось следов.
    await expect(page.locator('.t-panel__section')).toHaveCount(1)
    await expect(page.locator('.t-lessons')).toHaveCount(0)
    await expect(page.locator('.t-progress')).toHaveCount(0)
    await expect(page.locator('.t-scenarios .t-scenario').first()).toBeAttached()
  })
})

test.describe('дашборд тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('вертикальная раскладка без горизонтального скролла', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-dashboard')
    await expect(page.locator('.t-dash__mic')).toBeVisible()

    // Страница не расползается вширь (раньше десктопная сетка давала overflow).
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1)

    // Панель сценариев встаёт под героем и доступна по вертикальному скроллу.
    const scenarios = page.locator('.t-scenarios')
    await scenarios.scrollIntoViewIfNeeded()
    await expect(scenarios).toBeInViewport()
  })
})
