import { test, expect } from '@playwright/test'

// Регрессия на блок идентификации профиля у авторизованного пользователя без
// имени. Раньше:
//   • имя выводилось голым прочерком «—»;
//   • большой аватар показывал «J» (из фолбэка 'JTS'), а чип в шапке — «П» (из
//     подписи «Профиль»): две несвязанные буквы на одном экране.
// Теперь без имени везде один и тот же силуэт (SVG), а заголовок — «Без имени».

test.describe('профиль / идентификация без имени — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 720, 'только узкий вьюпорт')

  test('имя «Без имени», аватары — силуэт без букв, футер скрыт', async ({ page }) => {
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf')).toBeVisible({ timeout: 20_000 })

    // Заголовок имени — локализованный плейсхолдер, не «—».
    const name = page.locator('.pf-name')
    await expect(name).toHaveText('Без имени')

    // Большой аватар: силуэт (svg), без буквы «J».
    const heroAvatar = page.locator('.pf-avatar__initial')
    await expect(heroAvatar.locator('svg')).toHaveCount(1)
    await expect(heroAvatar).not.toContainText('J')

    // Чип профиля в шапке: тот же силуэт, без буквы «П».
    const topAvatar = page.locator('.mtop__avatar')
    await expect(topAvatar.locator('svg')).toHaveCount(1)
    await expect(topAvatar).not.toContainText('П')

    // Чёрный футер на мобиле скрыт.
    await expect(page.locator('.footer')).toBeHidden()
  })
})

test.describe('профиль / идентификация без имени — десктоп', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 720, 'только широкий вьюпорт')

  test('сайдбар-аватар — силуэт без буквы', async ({ page }) => {
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf')).toBeVisible({ timeout: 20_000 })
    const sbAvatar = page.locator('.sb__avatar')
    await expect(sbAvatar.locator('svg')).toHaveCount(1)
    await expect(sbAvatar).not.toContainText('J')
  })
})
