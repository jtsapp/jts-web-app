import { test, expect } from '@playwright/test'
import { FRESH_PROFILE, walkTour } from './tour-helper.js'

// Онбординг-тур «Практики» и «Обучения»: тот же движок, что у дашборда тьютора
// (src/tutor/OnboardingTour.jsx), но шаги свои и отметка «показан» — своя на
// каждый экран. Контракт:
//   — при первом заходе тур выходит сам, второй раз уже нет;
//   — карточка целиком в экране и НЕ накрывает подсветку (высокие секции
//     ленты обрезаются прожектором, иначе поповеру негде встать);
//   — кнопка «?» в углу открывает тур заново.

// Тур должен выйти — значит, профиль чистый (прогон целиком идёт с погашенными).
test.use(FRESH_PROFILE)

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
  // Регрессия: прожектор мерился один раз, на монтировании. Пока картинка
  // острова не загрузилась, у цели нулевая высота — подсветка оставалась
  // полоской у верхнего края, а карточка уезжала за ней (жалоба со скриншотом).
  test('прожектор переезжает на остров, когда картинка догрузилась', async ({ page }) => {
    await page.route('**/assets/learning/island.webp', async (route) => {
      await new Promise((r) => setTimeout(r, 1200))
      await route.continue()
    })
    await page.goto('/?screen=kingdom')
    await page.waitForSelector('.t-tour__pop', { timeout: 20000 })
    await page.waitForTimeout(2200)

    const { hole, target } = await page.evaluate(() => {
      const box = (el) => (el ? el.getBoundingClientRect() : null)
      const h = box(document.querySelector('.t-tour__hole'))
      const t = box(document.querySelector('.lp-isle__map'))
      return { hole: h && { top: h.top, height: h.height }, target: t && { height: t.height } }
    })
    expect(target.height).toBeGreaterThan(400)
    // Прожектор больше не полоска и стоит на острове, а не над ним.
    expect(hole.height).toBeGreaterThan(300)
    expect(hole.top).toBeLessThan(200)
  })

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
