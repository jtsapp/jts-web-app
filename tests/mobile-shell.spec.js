import { test, expect } from '@playwright/test'

// Регрессия на баг «после логина сайдбар не сворачивается на мобилке»
// (коммит revert(mobile) убрал адаптацию — экраны тьютора/обучения ломались).
// Контракт оболочки:
//   планшет (561–760) → видна шапка .mtop, сайдбар off-canvas (спрятан),
//              гамбургер открывает drawer, оверлей/выбор пункта его закрывают,
//              контент экрана виден и не перекрыт;
//   телефон (≤560) → нижняя панель вместо бургера, см. mobile-tabbar.spec.js;
//   десктоп  → шапки .mtop нет, сайдбар .sb на месте (статичная колонка).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Экраны обеих зон: тьютор (.t-body) и обучение (.learn__body).
// tutor-dashboard рисует шапку сам (без TutorShell) — держим его в контракте.
const SCREENS = ['tutor-welcome', 'kingdom', 'tutor-dashboard']

// Кабинет без входа не рисуется (lib/guestLogin.js) — входим учеником, как tests/lessons-schedule.spec.js.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })),
  )
})

test.describe('адаптивная оболочка — планшет (561–760, бургер)', () => {
  // До 560px вместо бургера нижняя панель (mobile-tabbar.spec.js); бургер и drawer остались планшету.
  test.use({ viewport: { width: 700, height: 900 } })
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'одного прогона на 700 достаточно')
  })

  for (const screen of SCREENS) {
    test(`${screen}: шапка видна, сайдбар off-canvas, drawer открывается/закрывается`, async ({ page }) => {
      await page.goto(`/?screen=${screen}`)

      const topbar = page.locator('.mtop')
      const sidebar = page.locator('.sb')
      const overlay = page.locator('.sb-overlay')

      // Шапка на месте, сайдбар спрятан за левым краем, нижней панели нет.
      await expect(topbar).toBeVisible({ timeout: 15_000 })
      await expect(sidebar).not.toBeInViewport()
      await expect(page.locator('.mtab')).toBeHidden()

      // Гамбургер выдвигает drawer поверх контента.
      await page.locator('.mtop__menu').click()
      await expect(sidebar).toHaveClass(/is-open/)
      await expect(sidebar).toBeInViewport()
      await expect(overlay).toBeVisible()

      // Клик по затемнению (справа от drawer шириной ~320px) закрывает его.
      await overlay.click({ position: { x: 650, y: 400 } })
      await expect(sidebar).not.toHaveClass(/is-open/)
      await expect(sidebar).not.toBeInViewport()
    })
  }

  test('контент экрана виден и не перекрыт сайдбаром', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    // Заголовок приветствия должен попадать во вьюпорт (раньше уезжал за экран).
    await expect(page.locator('.t-pick__title')).toBeInViewport({ timeout: 15_000 })
  })
})

test.describe('адаптивная оболочка — десктоп', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  test('шапки .mtop нет, сайдбар — статичная колонка', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.sb')).toBeInViewport({ timeout: 15_000 })
    await expect(page.locator('.mtop')).toBeHidden()
  })
})
