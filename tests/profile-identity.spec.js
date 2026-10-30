import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'

// Регрессия на блок идентификации профиля у авторизованного пользователя без
// имени. Раньше:
//   • имя выводилось голым прочерком «—»;
//   • большой аватар показывал «J» (из фолбэка 'JTS'), а чип в шапке — «П» (из
//     подписи «Профиль»): две несвязанные буквы на одном экране.
// Теперь без имени везде один и тот же силуэт (SVG), а заголовок — «Без имени».

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Кабинет без входа не рисуется (lib/guestLogin.js) — входим учеником без имени.
test.beforeEach(async ({ page }) => {
  // Замки 29.10 («Документы платформы», разделы тарифа) иначе встают поверх профиля.
  await mockGates(page)
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: '', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
})

test.describe('профиль / идентификация без имени — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 560, 'только телефон')

  test('имя «Без имени», аватары — силуэт без букв, футер скрыт', async ({ page }) => {
    await page.goto('/?screen=profile')
    // Профиль телефона — экраны дизайна приложения (ProfilePhone): герой «Сервисов» со своей «назад».
    await expect(page.locator('.pfm-hero')).toBeVisible({ timeout: 20_000 })

    // Заголовок имени — локализованный плейсхолдер, не «—».
    const name = page.locator('.pfm-hero .svc-hero__name b')
    await expect(name).toHaveText('Без имени')

    // Аватар героя: силуэт (svg), без буквы «J».
    const heroAvatar = page.locator('.pfm-hero__ava')
    await expect(heroAvatar.locator('svg')).toHaveCount(1)
    await expect(heroAvatar).not.toContainText('J')

    // Чёрный футер на мобиле скрыт.
    await expect(page.locator('.footer')).toBeHidden()

    // Нижней панели на профиле нет (внутренний экран, как в приложении); «назад» без истории ведёт в «Сервисы» —
    // там плашка профиля с тем же силуэтом, без буквы «П».
    await expect(page.locator('.mtab')).toHaveCount(0)
    await page.locator('.pfm-nav__btn').first().click()
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
