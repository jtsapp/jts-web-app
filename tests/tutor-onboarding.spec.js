import { test, expect } from '@playwright/test'

// Онбординг тьютора на мобиле — регрессии на баги с реального телефона:
// маскоты вылезали из панели на кнопки выбора языка, карусель тьюторов не
// свайпалась (скроллился весь .t-content, ибо секция и сетка росли по
// контенту до ~950px), варианты профессии уезжали за левый край экрана.

test.describe('онбординг тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('язык: маскоты сидят внутри фиолетовой панели', async ({ page }) => {
    await page.goto('/?screen=tutor-lang')
    const panel = await page.locator('.t-card__panel').boundingBox()
    const mascot = await page.locator('.t-card__mascot').boundingBox()
    // Допуск 3px — скругления/субпиксели; ловим прежний вылет на ~145px.
    expect(mascot.y).toBeGreaterThanOrEqual(panel.y - 3)
    expect(mascot.y + mascot.height).toBeLessThanOrEqual(panel.y + panel.height + 3)
    // Опции языка не перекрыты маскотом.
    const lastOption = await page.locator('.t-lang__option').last().boundingBox()
    expect(lastOption.y + lastOption.height).toBeLessThanOrEqual(mascot.y + 3)
  })

  test('выбор тьютора: карусель свайпается со снапом внутри экрана', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-choose')
    const grid = page.locator('.t-choose__grid')
    await expect(grid).toBeVisible()

    // Скроллится сама карусель, а не вся страница.
    const size = await grid.evaluate((el) => ({ cw: el.clientWidth, sw: el.scrollWidth }))
    expect(size.cw).toBeLessThanOrEqual(viewport.width)
    expect(size.sw).toBeGreaterThan(size.cw)

    // Свайп переключает карточку: центр меняется и скролл реально сдвигается.
    const centerName = () =>
      page.evaluate(() => {
        const mid = window.innerWidth / 2
        return [...document.querySelectorAll('.t-tcard')]
          .map((c) => {
            const r = c.getBoundingClientRect()
            return { n: c.querySelector('.t-tcard__name').textContent, d: Math.abs(r.left + r.width / 2 - mid) }
          })
          .sort((a, b) => a.d - b.d)[0].n
      })
    // Кнопка «Выбрать» стартовой карточки целиком в экране (до свайпа).
    const btn = await page.locator('.t-tcard__choose').first().boundingBox()
    expect(btn.x).toBeGreaterThanOrEqual(0)
    expect(btn.x + btn.width).toBeLessThanOrEqual(viewport.width + 1)

    const first = await centerName()
    await grid.evaluate((el) => el.scrollBy({ left: 320, behavior: 'smooth' }))
    await page.waitForTimeout(800)
    expect(await centerName()).not.toBe(first)
    expect(await grid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)
  })

  test('профессия: поле и варианты во всю ширину, ввод работает', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-profession')
    const opts = page.locator('.t-prof__opt')
    await expect(opts.first()).toBeVisible()
    for (const box of await Promise.all([
      page.locator('.t-prof__input').boundingBox(),
      opts.first().boundingBox(),
      opts.last().boundingBox(),
    ])) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
    }
    await page.locator('.t-prof__input input').fill('Инженер-программист')
    await expect(page.locator('.t-prof__input input')).toHaveValue('Инженер-программист')
    await opts.nth(1).click()
    await expect(opts.nth(1)).toHaveClass(/is-picked/)
  })
})
