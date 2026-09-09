import { test, expect } from '@playwright/test'

// Онбординг-тур «Практики» и «Обучения»: тот же движок, что у дашборда тьютора
// (src/tutor/OnboardingTour.jsx), но шаги свои и отметка «показан» — своя на
// каждый экран. Контракт:
//   — при первом заходе тур выходит сам, второй раз уже нет;
//   — карточка целиком в экране и НЕ накрывает подсветку (высокие секции
//     ленты обрезаются прожектором, иначе поповеру негде встать);
//   — кнопка «?» в углу открывает тур заново.

// Идём по всем шагам тура, проверяя геометрию на каждом. Возвращает число шагов.
async function walkTour(page, viewport) {
  await page.waitForSelector('.t-tour__pop', { timeout: 20000 })
  const total = Number((await page.locator('.t-tour__count').textContent()).split('/')[1])
  expect(total).toBeGreaterThan(1)

  for (let step = 1; ; step++) {
    await page.waitForTimeout(500) // transition поповера между шагами
    const { pop, hole, overlap } = await page.evaluate(() => {
      const pop = document.querySelector('.t-tour__pop').getBoundingClientRect()
      const hole = document.querySelector('.t-tour__hole')?.getBoundingClientRect()
      const overlap =
        hole &&
        !(pop.right < hole.left || pop.left > hole.right || pop.bottom < hole.top || pop.top > hole.bottom)
      return { pop: { t: pop.top, b: pop.bottom, l: pop.left, r: pop.right }, hole: Boolean(hole), overlap }
    })
    expect(pop.t, `шаг ${step}: поповер вылез за верх`).toBeGreaterThanOrEqual(0)
    expect(pop.b, `шаг ${step}: поповер вылез за низ`).toBeLessThanOrEqual(viewport.height + 1)
    expect(pop.l, `шаг ${step}: поповер вылез за левый край`).toBeGreaterThanOrEqual(0)
    expect(pop.r, `шаг ${step}: поповер вылез за правый край`).toBeLessThanOrEqual(viewport.width + 1)
    expect(hole, `шаг ${step}: нет прожектора`).toBe(true)
    expect(overlap, `шаг ${step}: поповер накрывает подсвеченный элемент`).toBe(false)

    // Заголовок и текст шага — из словаря, а не ключи (i18n.jsx, зона useI18n).
    expect(await page.locator('.t-tour__title').textContent()).not.toContain('tour.')
    expect(await page.locator('.t-tour__text').textContent()).not.toContain('tour.')

    const isLast = (await page.locator('.t-tour__count').textContent()).startsWith(`${total}/`)
    await page.locator('.t-tour__ok').click()
    if (isLast) break
  }

  await expect(page.locator('.t-tour__pop')).toHaveCount(0)
  // Скролл страницы тур запирал — после закрытия он снова свободен.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  return total
}

test.describe('онбординг-тур «Практики»', () => {
  test('выходит сам, проходится целиком и второй раз не выходит', async ({ page, viewport }) => {
    await page.goto('/?screen=practice')
    await expect(page.locator('.pp')).toBeVisible({ timeout: 15000 })

    const total = await walkTour(page, viewport)
    // Шагов ровно столько, сколько секций нашлось на экране: тур сам
    // пропускает те, которых нет (комиксы до первой заливки, чужой фильтр).
    expect(total).toBeGreaterThanOrEqual(5)

    await page.goto('/?screen=practice')
    await expect(page.locator('.pp')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(700)
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
  })

  test('кнопка «?» открывает тур заново и возвращает ленту в «Все»', async ({ page }) => {
    await page.goto('/?screen=practice')
    await expect(page.locator('.pp')).toBeVisible({ timeout: 15000 })
    await page.locator('.t-tour__skip').click()
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)

    // Под выбранным чипом остальных секций в DOM нет — «?» обязан вернуть «Все»,
    // иначе тур из семи шагов свёлся бы к одному.
    await page.locator('.pp-chip').nth(3).click()
    await expect(page.locator('.pp-chip--on')).not.toHaveText(/^(Все|All|Барлығы)$/)

    // Кнопок «?» в DOM две — в мобильной шапке и в углу кабинета; на каждом
    // вьюпорте видна ровно одна (см. .learn__bell / .mtop в styles.css).
    await page.locator('.tour-help:visible').click()
    await expect(page.locator('.t-tour__pop')).toBeVisible()
    await expect(page.locator('.pp-chip--on')).toHaveText(/^(Все|All|Барлығы)$/)
  })
})

test.describe('онбординг-тур «Обучения»', () => {
  test('выходит сам на карте уровней и проходится целиком', async ({ page, viewport }) => {
    await page.goto('/?screen=kingdom')
    await expect(page.locator('.lp-isle')).toBeVisible({ timeout: 15000 })

    const total = await walkTour(page, viewport)
    // Шаг про замки отпадает, когда закрытых городов нет, — оттуда «не меньше».
    expect(total).toBeGreaterThanOrEqual(2)

    await page.goto('/?screen=kingdom')
    await expect(page.locator('.lp-isle')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(700)
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
  })
})
