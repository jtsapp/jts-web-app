import { test, expect } from '@playwright/test'

// Регрессия на баг мобильной вёрстки welcome-экрана:
//   1) панель входа .cta наследовала десктопный border-radius:999px и при
//      вертикальной раскладке превращалась в «раздутую пилюлю» с торчащими
//      кнопками — на мобилке это должна быть аккуратная скруглённая карточка;
//   2) чёрный футер .footer убираем на мобилке на всех экранах, где он есть
//      (welcome и registration/chat рендерят <Footer/>).
// Десктоп остаётся без изменений: футер виден, .cta — пилюля.
//
// App показывает welcome/registration только после restoreSession()+профиля,
// поэтому ждём реальный рендер экрана (иначе toBeHidden ложно пройдёт на
// ещё-не-смонтированном .footer).

test.describe('welcome / панель входа — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 720, 'только узкий вьюпорт')

  test('.cta — скруглённая карточка, кнопки не выходят за её края', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('.cta')
    await expect(cta).toBeVisible({ timeout: 20_000 })

    // Не пилюля (999px), а умеренное скругление карточки.
    await expect(cta).toHaveCSS('border-radius', '30px')
    await expect(cta).toHaveCSS('flex-direction', 'column')

    // Обе кнопки лежат внутри карточки по горизонтали (никакого overflow).
    const card = await cta.boundingBox()
    for (const label of ['Регистрация', 'Войти']) {
      const btn = await page.getByRole('button', { name: label }).boundingBox()
      expect(btn.x).toBeGreaterThanOrEqual(card.x - 0.5)
      expect(btn.x + btn.width).toBeLessThanOrEqual(card.x + card.width + 0.5)
    }
  })

  for (const [name, url, ready] of [
    ['welcome', '/', '.hero'],
    ['registration', '/?screen=chat', '.reg-header'],
  ]) {
    test(`чёрный футер скрыт на экране ${name}`, async ({ page }) => {
      await page.goto(url)
      // Дождаться, пока экран действительно смонтирован...
      await expect(page.locator(ready)).toBeVisible({ timeout: 20_000 })
      // ...и только теперь проверять, что его футер спрятан (display:none).
      const footer = page.locator('.footer')
      await expect(footer).toHaveCount(1)
      await expect(footer).toBeHidden()
    })
  }
})

test.describe('welcome / панель входа — десктоп', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 720, 'только широкий вьюпорт')

  test('.cta — пилюля, футер виден (десктоп не тронут)', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.cta')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.cta')).toHaveCSS('border-radius', '999px')
    await expect(page.locator('.footer')).toBeVisible()
  })
})
