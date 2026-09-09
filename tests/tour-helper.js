import { expect } from '@playwright/test'

// Прогон целиком идёт с погашенными турами (storageState в playwright.config.js):
// тур — модалка и перехватывает клики у тестов про другое. Тестам самого тура
// нужен наоборот чистый профиль — они объявляют его через test.use(FRESH_PROFILE).
export const FRESH_PROFILE = { storageState: { cookies: [], origins: [] } }

// Идём по всем шагам тура, проверяя геометрию на каждом. Возвращает число шагов.
export async function walkTour(page, viewport) {
  await page.waitForSelector('.t-tour__pop', { timeout: 20000 })
  const total = Number((await page.locator('.t-tour__count').textContent()).split('/')[1])
  expect(total).toBeGreaterThan(1)

  for (let step = 1; ; step++) {
    await page.waitForTimeout(500) // transition поповера между шагами
    // Шаги без своего элемента тур пропускает сам, и последние из них могут
    // отпасть все разом — тогда он просто закрывается (см. OnboardingTour).
    if (!(await page.locator('.t-tour__pop').count())) return total
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
