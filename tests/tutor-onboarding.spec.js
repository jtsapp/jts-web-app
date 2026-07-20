import { test, expect } from '@playwright/test'

// Онбординг тьютора на мобиле — регрессии на баги с реального телефона:
// маскоты вылезали из панели на кнопки выбора языка, карусель тьюторов не
// свайпалась (скроллился весь .t-content, ибо секция и сетка росли по
// контенту до ~950px), варианты профессии уезжали за левый край экрана.

test.describe('онбординг тьютора — мобилка', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 760, 'только узкий вьюпорт')

  test('язык: в панели карусель тьюторов, опции не перекрыты', async ({ page }) => {
    await page.goto('/?screen=tutor-lang')
    await expect(page.locator('.t-card__carousel')).toBeVisible()
    // Layout под параллельным прогоном стабилизируется не сразу.
    await page.waitForTimeout(400)
    // Статичная композиция маскотов скрыта (раньше вылезала на кнопки выбора).
    await expect(page.locator('.t-card__mascot')).toBeHidden()
    const panel = await page.locator('.t-card__panel').boundingBox()
    const carousel = await page.locator('.t-card__carousel').boundingBox()
    expect(carousel.y).toBeGreaterThanOrEqual(panel.y - 3)
    expect(carousel.y + carousel.height).toBeLessThanOrEqual(panel.y + panel.height + 3)
    // Опции языка выше панели и ничем не перекрыты.
    const lastOption = await page.locator('.t-lang__option').last().boundingBox()
    expect(lastOption.y + lastOption.height).toBeLessThanOrEqual(panel.y + 3)
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

  test('welcome: плашка с тьюторами — свайп-карусель', async ({ page }) => {
    await page.goto('/?screen=tutor-welcome')
    const car = page.locator('.t-card__carousel')
    await expect(car).toBeVisible()
    await expect(car.locator('.t-card__slide')).toHaveCount(3)
    const size = await car.evaluate((el) => ({ cw: el.clientWidth, sw: el.scrollWidth }))
    expect(size.sw).toBeGreaterThan(size.cw)
    await car.evaluate((el) => el.scrollBy({ left: 250, behavior: 'smooth' }))
    await page.waitForTimeout(700)
    expect(await car.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50)
  })
})

// Тур по дашборду: раньше поповер ехал вместе со скроллом (обёртка .scr-in с
// transform ломала position: fixed), ложился на подсвеченный элемент и резался
// краем экрана, а страница свободно скроллилась под туром.
test.describe('онбординг-тур по дашборду', () => {
  test('поповер в экране, не накрывает подсветку, скролл заперт', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-profession')
    // «Пропустить вопрос» ведёт через экран анализа на дашборд с туром.
    await page.locator('button', { hasText: 'Пропустить' }).first().click()
    await page.waitForSelector('.t-tour__pop', { timeout: 20000 })

    for (let step = 0; ; step++) {
      await page.waitForTimeout(600) // дожидаемся transition поповера
      const { pop, hole, overlap } = await page.evaluate(() => {
        const pop = document.querySelector('.t-tour__pop').getBoundingClientRect()
        const hole = document.querySelector('.t-tour__hole')?.getBoundingClientRect()
        const overlap =
          hole &&
          !(pop.right < hole.left || pop.left > hole.right || pop.bottom < hole.top || pop.top > hole.bottom)
        return { pop: { t: pop.top, b: pop.bottom, l: pop.left, r: pop.right }, hole: Boolean(hole), overlap }
      })
      expect(pop.t, `шаг ${step + 1}: поповер вылез за верх`).toBeGreaterThanOrEqual(0)
      expect(pop.b, `шаг ${step + 1}: поповер вылез за низ`).toBeLessThanOrEqual(viewport.height + 1)
      expect(pop.l).toBeGreaterThanOrEqual(0)
      expect(pop.r).toBeLessThanOrEqual(viewport.width + 1)
      expect(hole, `шаг ${step + 1}: нет прожектора`).toBe(true)
      expect(overlap, `шаг ${step + 1}: поповер накрывает подсвеченный элемент`).toBe(false)

      // Кнопка «ОК/Готово» реально видима: портал в body лишал её переменных
      // темы — фон становился прозрачным, белый текст «исчезал» на белом.
      const okBg = await page
        .locator('.t-tour__ok')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(okBg, `шаг ${step + 1}: у кнопки прозрачный фон`).not.toBe('rgba(0, 0, 0, 0)')

      // Скролл страницы под туром заперт.
      const y0 = await page.evaluate(() => scrollY)
      await page.mouse.move(195, 420)
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(250)
      expect(await page.evaluate(() => scrollY)).toBe(y0)

      const isLast = (await page.locator('.t-tour__count').textContent()).startsWith('2/')
      await page.locator('.t-tour__ok').click()
      if (isLast) break
    }

    // Тур закрыт, скролл разлочен.
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  })
})
