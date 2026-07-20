import { test, expect } from '@playwright/test'

// Регрессия на баг «после логина сайдбар не сворачивается на мобилке»
// (коммит revert(mobile) убрал адаптацию — экраны тьютора/обучения ломались).
// Контракт оболочки:
//   мобилка  → видна шапка .mtop, сайдбар off-canvas (спрятан), гамбургер
//              открывает drawer, оверлей/выбор пункта его закрывают, контент
//              экрана виден и не перекрыт;
//   десктоп  → шапки .mtop нет, сайдбар .sb на месте (статичная колонка).

// Экраны обеих зон: тьютор (.t-body) и обучение (.learn__body).
const SCREENS = ['tutor-welcome', 'kingdom']

test.describe('адаптивная оболочка — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  for (const screen of SCREENS) {
    test(`${screen}: шапка видна, сайдбар off-canvas, drawer открывается/закрывается`, async ({ page }) => {
      await page.goto(`/?screen=${screen}`)

      const topbar = page.locator('.mtop')
      const sidebar = page.locator('.sb')
      const overlay = page.locator('.sb-overlay')

      // Мобильная шапка на месте, десктопный сайдбар спрятан за левым краем.
      await expect(topbar).toBeVisible()
      await expect(sidebar).not.toBeInViewport()

      // Гамбургер выдвигает drawer поверх контента.
      await page.locator('.mtop__menu').click()
      await expect(sidebar).toHaveClass(/is-open/)
      await expect(sidebar).toBeInViewport()
      await expect(overlay).toBeVisible()

      // Клик по затемнению (справа от drawer, шириной ~320px) закрывает его.
      await overlay.click({ position: { x: 375, y: 400 } })
      await expect(sidebar).not.toHaveClass(/is-open/)
      await expect(sidebar).not.toBeInViewport()
    })
  }

  test('контент экрана виден и не перекрыт сайдбаром', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    // Заголовок приветствия должен попадать во вьюпорт (раньше уезжал за экран).
    await expect(page.locator('.t-welcome__title')).toBeInViewport()
  })
})

test.describe('адаптивная оболочка — десктоп', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 760, 'только широкий вьюпорт')

  test('шапки .mtop нет, сайдбар — статичная колонка', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.mtop')).toBeHidden()
    await expect(page.locator('.sb')).toBeInViewport()
  })
})
