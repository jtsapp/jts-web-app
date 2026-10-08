import { test, expect } from '@playwright/test'
import { mockComics, openReader, scaleOf, shiftOf, center } from './helpers/comics.js'

// Зум страницы комикса мышью и тачпадом: Ctrl + колесо (так же браузеры шлют
// щипок тачпада), двойной клик, перетаскивание и прокрутка увеличенного листа,
// кнопки −/цифра/+ и клавиши + − 0. Пальцы — в comics-zoom.spec.js.

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'мышь и тачпад — только десктопный проект')
  await mockComics(page)
})

// Ctrl + колесо: Playwright отдаёт зажатые клавиши в событие колеса.
async function ctrlWheel(page, x, y, dy, times = 1) {
  await page.mouse.move(x, y)
  await page.keyboard.down('Control')
  for (let k = 0; k < times; k++) await page.mouse.wheel(0, dy)
  await page.keyboard.up('Control')
}

// Доля ширины и высоты листа под точкой экрана — по ней видно, осталась ли
// под курсором та же точка рисунка.
const fracAt = (img, x, y) =>
  img.evaluate((el, [px, py]) => {
    const r = el.getBoundingClientRect()
    return [(px - r.left) / r.width, (py - r.top) / r.height]
  }, [x, y])

test('Ctrl + колесо увеличивает под курсором, колесо водит увеличенный лист', async ({ page }) => {
  const img = await openReader(page)
  const count = page.locator('.cr__count')
  const dpr = await page.evaluate(() => window.devicePixelRatio)
  const [cx, cy] = await center(img)
  const [px, py] = [cx - 40, cy - 60]
  const before = await fracAt(img, px, py)

  await ctrlWheel(page, px, py, -100, 4)
  await expect.poll(() => scaleOf(img)).toBeGreaterThan(2)
  // Штатный зум браузера не включился — увеличилась только картинка.
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(dpr)
  // Под курсором та же точка листа, что и до увеличения.
  const after = await fracAt(img, px, py)
  expect(Math.abs(after[0] - before[0])).toBeLessThan(0.02)
  expect(Math.abs(after[1] - before[1])).toBeLessThan(0.02)
  await expect(page.locator('.cr__stage--zoomed')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('ctrl-wheel.png') })

  // Простое колесо по увеличенному листу водит его, а не прокручивает страницу.
  const scrollY = await page.evaluate(() => window.scrollY)
  const s0 = await shiftOf(img)
  await page.mouse.wheel(0, 200)
  await expect.poll(async () => (await shiftOf(img))[1]).toBeLessThan(s0[1] - 100)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
  await expect(count).toHaveText('1 / 3')

  // Обратно колесом — до ровного ×1 (почти-единицу доводит пауза колеса).
  await ctrlWheel(page, px, py, 100, 8)
  await expect.poll(() => scaleOf(img)).toBe(1)
  await expect(page.locator('.cr__stage--zoomed')).toHaveCount(0)
})

test('двойной клик увеличивает и возвращает; мышью лист тянут; клик листает', async ({ page }) => {
  const img = await openReader(page)
  const count = page.locator('.cr__count')
  const [cx, cy] = await center(img)

  await page.mouse.dblclick(cx, cy)
  await expect.poll(() => scaleOf(img)).toBeCloseTo(2.5, 1)
  // Первый клик двойного не успел перелистнуть.
  await page.waitForTimeout(450)
  await expect(count).toHaveText('1 / 3')

  // Перетаскивание двигает лист и не листает — ни само, ни click после него.
  const s0 = await shiftOf(img)
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx - 150, cy - 100, { steps: 8 })
  await page.mouse.up()
  const s1 = await shiftOf(img)
  expect(s1[0]).toBeLessThan(s0[0] - 50)
  expect(s1[1]).toBeLessThan(s0[1] - 50)
  await page.waitForTimeout(450)
  await expect(count).toHaveText('1 / 3')

  // Клик по увеличенному листу тоже не листает: лист разглядывают.
  await page.mouse.click(cx, cy)
  await page.waitForTimeout(450)
  await expect(count).toHaveText('1 / 3')
  expect(await scaleOf(img)).toBeCloseTo(2.5, 1)

  await page.mouse.dblclick(cx, cy)
  await expect.poll(() => scaleOf(img)).toBe(1)
  await expect(count).toHaveText('1 / 3')

  // Обычный размер: клик — ровно одна страница вперёд.
  await page.waitForTimeout(400)
  await page.mouse.click(cx, cy)
  await expect(count).toHaveText('2 / 3')
  await page.waitForTimeout(600)
  await expect(count).toHaveText('2 / 3')
})

test('кнопки −/цифра/+ и клавиши + − 0', async ({ page }) => {
  const img = await openReader(page)
  const panel = page.locator('.cr__zoom')
  const pct = panel.locator('.cr__zoomPct')
  const plus = panel.getByRole('button', { name: 'Увеличить' })
  const minus = panel.getByRole('button', { name: 'Уменьшить' })

  await expect(panel).toBeVisible()
  await expect(pct).toHaveText('100%')
  await expect(minus).toBeDisabled()
  // На компьютере сброс — цифра в панели; отдельной кнопки нет.
  await expect(page.locator('.cr__unzoom')).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('panel-100.png') })

  await plus.click()
  await expect(pct).toHaveText('150%')
  await expect.poll(() => scaleOf(img)).toBeCloseTo(1.5, 2)
  await plus.click()
  await expect(pct).toHaveText('225%')
  await expect(page.locator('.cr__unzoom')).toBeHidden()
  await page.screenshot({ path: test.info().outputPath('buttons.png') })
  await minus.click()
  await expect(pct).toHaveText('150%')
  await pct.click()
  await expect(pct).toHaveText('100%')
  await expect.poll(() => scaleOf(img)).toBe(1)

  // Потолок: «+» гаснет на ×4.
  for (let k = 0; k < 4; k++) await page.keyboard.press('+')
  await expect(pct).toHaveText('400%')
  await expect(plus).toBeDisabled()
  // 4 / 1.5 ≈ 2.67, подпись округлена до 5%.
  await page.keyboard.press('-')
  await expect(pct).toHaveText('265%')
  await page.keyboard.press('0')
  await expect(pct).toHaveText('100%')
  // «=» — та же клавиша, что «+», без Shift.
  await page.keyboard.press('=')
  await expect(pct).toHaveText('150%')
  await expect(page.locator('.cr__count')).toHaveText('1 / 3')
})

test('полный экран: панель зума под шапкой и гаснет в простое', async ({ page }) => {
  const img = await openReader(page)
  await page.locator('.cr__full').click()
  await expect(page.locator('.cr--full')).toBeVisible()
  const [cx, cy] = await center(img)
  await ctrlWheel(page, cx, cy, -100, 3)
  await expect.poll(() => scaleOf(img)).toBeGreaterThan(1.5)

  // Панель ничто не накрывает: в её центре — она сама.
  const panel = page.locator('.cr__zoom')
  await expect(panel).toBeVisible()
  const b = await panel.boundingBox()
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.cr__zoom') !== null, [
    b.x + b.width / 2,
    b.y + b.height / 2,
  ])
  expect(hit).toBe(true)
  await page.screenshot({ path: test.info().outputPath('full-zoomed.png') })

  // Мышь не двигается — панель гаснет вместе с шапкой.
  await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).opacity), { timeout: 6000 }).toBe('0')
})

test('щипок тачпада в Safari (gesture-события) увеличивает лист', async ({ page }) => {
  const img = await openReader(page)
  const [cx, cy] = await center(img)
  // Хрома с этими событиями нет — шлём их так, как их шлёт Safari на Mac:
  // scale считается от начала щипка, касаний при этом нет.
  const prevented = await page.evaluate(([x, y]) => {
    const stage = document.querySelector('.cr__stage')
    const fire = (type, scale) => {
      const e = new Event(type, { bubbles: true, cancelable: true })
      Object.assign(e, { scale, clientX: x, clientY: y })
      stage.dispatchEvent(e)
      return e.defaultPrevented
    }
    return [fire('gesturestart', 1), fire('gesturechange', 1.5), fire('gesturechange', 2), fire('gestureend', 2)]
  }, [cx, cy])
  expect(prevented).toEqual([true, true, true, true])
  await expect.poll(() => scaleOf(img)).toBeCloseTo(2, 1)
})
