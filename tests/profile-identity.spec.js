import { test, expect } from '@playwright/test'

// Регрессия на блок идентификации профиля у авторизованного пользователя без
// имени. Раньше:
//   • имя выводилось голым прочерком «—»;
//   • большой аватар показывал «J» (из фолбэка 'JTS'), а чип в шапке — «П» (из
//     подписи «Профиль»): две несвязанные буквы на одном экране.
// Теперь без имени везде один и тот же силуэт (SVG), а заголовок — «Без имени».

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Кабинет без входа не рисуется (lib/guestLogin.js) — входим учеником без имени.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: '', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
})

test.describe('профиль / идентификация без имени — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 560, 'только телефон')

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

    // Чёрный футер на мобиле скрыт.
    await expect(page.locator('.footer')).toBeHidden()

    // Профиль на телефоне — плашка «Сервисов» (вместо чипа шапки): тот же силуэт, без буквы «П».
    await page.locator('.mtab [data-tab="services"]').click()
    const topAvatar = page.locator('.svc-hero__avatar')
    await expect(topAvatar.locator('svg')).toHaveCount(1)
    await expect(topAvatar).not.toContainText('П')
  })
})

// Планшет (561–760): шапка с бургером и чипом профиля осталась — проверка чипа, которая раньше шла на всех узких.
test.describe('профиль / идентификация без имени — планшет', () => {
  test.use({ viewport: { width: 700, height: 900 } })
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'одного прогона на 700 достаточно')
  })

  test('чип профиля в шапке — силуэт без буквы «П»', async ({ page }) => {
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf')).toBeVisible({ timeout: 20_000 })
    const topAvatar = page.locator('.mtop__avatar')
    await expect(topAvatar.locator('svg')).toHaveCount(1)
    await expect(topAvatar).not.toContainText('П')
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
