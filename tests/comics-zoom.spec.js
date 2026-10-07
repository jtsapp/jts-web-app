import { test, expect } from '@playwright/test'

// Зум страницы комикса пальцами: щипок, двойной тап, перетаскивание
// увеличенного листа. Мультитач Playwright сам не умеет — касания шлём через
// CDP (Input.dispatchTouchEvent), поэтому спека только для chromium и только
// на телефонном вьюпорте с тачем.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const COMIC = { id: 1, slug: 'yellow', title: 'Yellow', author: 'Jay Martin', pageCount: 3 }
const PAGES = [1, 2, 3].map((n) => ({ n, url: `/__e2e/comic/${n}.svg`, w: 1249, h: 1920 }))

// Страница — полосы и крупная цифра: по скриншоту видно, что увеличилось.
const svg = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="1249" height="1920" viewBox="0 0 1249 1920">
  <rect width="1249" height="1920" fill="#fff"/>
  ${Array.from({ length: 12 }, (_, k) => `<rect x="40" y="${60 + k * 155}" width="1169" height="120" rx="18" fill="hsl(${k * 30 + n * 40} 70% 80%)"/>`).join('')}
  <text x="624" y="1060" font-size="520" text-anchor="middle" font-family="sans-serif" fill="#222">${n}</text>
</svg>`

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'жесты пальцами — только телефонный проект')
  await page.addInitScript(() => {
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    localStorage.setItem('jts_access_token', 'test-token')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route(/\/mobile\/(karaoke|media-clips|audiobooks|tales)/, (r) => r.fulfill(json([])))
  await page.route('**/mobile/comics', (r) => r.fulfill(json([COMIC])))
  await page.route('**/mobile/comics/1', (r) => r.fulfill(json({ ...COMIC, pages: PAGES })))
  await page.route('**/__e2e/comic/*.svg', (r) => {
    const n = Number(r.request().url().match(/(\d+)\.svg$/)[1])
    return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(n) })
  })
})

async function openReader(page) {
  await page.goto('/?screen=practice')
  // Комиксы — во вкладке «Чтение», по умолчанию открыто «Аудирование».
  await page.locator('.pk-skills').getByRole('tab', { name: /Чтение/ }).click()
  await page.locator('#sec-comics').getByText('Yellow').first().click()
  const img = page.locator('.cr__img:not(.cr__img--off)')
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true)
  return img
}

function fingers(page) {
  let cdp
  const send = async (type, pts) => {
    cdp ??= await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: pts.map(([x, y], id) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })),
    })
  }
  return {
    async pinch(cx, cy, from, to, steps = 10) {
      await send('touchStart', [[cx - from / 2, cy], [cx + from / 2, cy]])
      for (let k = 1; k <= steps; k++) {
        const d = from + ((to - from) * k) / steps
        await send('touchMove', [[cx - d / 2, cy], [cx + d / 2, cy]])
      }
      await send('touchEnd', [])
    },
    async drag(x, y, dx, dy, steps = 8) {
      await send('touchStart', [[x, y]])
      for (let k = 1; k <= steps; k++) await send('touchMove', [[x + (dx * k) / steps, y + (dy * k) / steps]])
      await send('touchEnd', [])
    },
    async tap(x, y) {
      await send('touchStart', [[x, y]])
      await send('touchEnd', [])
    },
  }
}

// Масштаб из вычисленного transform (matrix(a, b, c, d, e, f) → a).
const scaleOf = (img) =>
  img.evaluate((el) => {
    const m = getComputedStyle(el).transform
    return m === 'none' ? 1 : Number(m.match(/matrix\(([^,]+)/)[1])
  })
const shiftOf = (img) =>
  img.evaluate((el) => {
    const m = getComputedStyle(el).transform
    if (m === 'none') return [0, 0]
    const v = m.match(/matrix\((.+)\)/)[1].split(',').map(Number)
    return [v[4], v[5]]
  })

async function center(img) {
  const b = await img.boundingBox()
  return [b.x + b.width / 2, b.y + b.height / 2]
}

test('щипок увеличивает лист, а не всю страницу; увеличенный лист не листается', async ({ page }) => {
  const img = await openReader(page)
  const f = fingers(page)
  const count = page.locator('.cr__count')
  await expect(count).toHaveText('1 / 3')

  const [cx, cy] = await center(img)
  await f.pinch(cx, cy, 60, 200)
  await expect.poll(() => scaleOf(img)).toBeGreaterThan(2.5)
  // Штатный зум браузера не включился — увеличилась только картинка.
  expect(await page.evaluate(() => window.visualViewport.scale)).toBe(1)
  await expect(page.locator('.cr__stage--zoomed')).toBeVisible()
  await expect(page.locator('.cr__unzoom')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('zoomed.png') })

  // Перетаскивание двигает лист и не листает.
  const before = await shiftOf(img)
  await f.drag(cx, cy, -120, -80)
  const after = await shiftOf(img)
  expect(after[0]).toBeLessThan(before[0] - 50)
  expect(after[1]).toBeLessThan(before[1] - 30)
  await expect(count).toHaveText('1 / 3')

  // Тап по увеличенному листу тоже не листает.
  await f.tap(cx, cy)
  await page.waitForTimeout(450)
  await expect(count).toHaveText('1 / 3')

  // Кнопка возвращает обычный размер.
  const btn = await page.locator('.cr__unzoom').boundingBox()
  await f.tap(btn.x + btn.width / 2, btn.y + btn.height / 2)
  await expect.poll(() => scaleOf(img)).toBe(1)
  await expect(page.locator('.cr__unzoom')).toHaveCount(0)
})

test('двойной тап увеличивает и возвращает; одиночный тап и свайп листают', async ({ page }) => {
  const img = await openReader(page)
  const f = fingers(page)
  const count = page.locator('.cr__count')
  const [cx, cy] = await center(img)

  await f.tap(cx, cy)
  await page.waitForTimeout(80)
  await f.tap(cx, cy)
  await expect.poll(() => scaleOf(img)).toBeCloseTo(2.5, 1)
  // Первый тап двойного не успел перелистнуть.
  await expect(count).toHaveText('1 / 3')

  await f.tap(cx, cy)
  await page.waitForTimeout(80)
  await f.tap(cx, cy)
  await expect.poll(() => scaleOf(img)).toBe(1)
  await expect(count).toHaveText('1 / 3')

  // Обычный размер: одиночный тап — ровно на одну страницу вперёд
  // (синтетический click не листает второй раз).
  await page.waitForTimeout(400)
  await f.tap(cx, cy)
  await expect(count).toHaveText('2 / 3')
  await page.waitForTimeout(800)
  await expect(count).toHaveText('2 / 3')

  // Свайп влево — следующая.
  await f.drag(cx + 100, cy, -220, 0)
  await expect(count).toHaveText('3 / 3')
})

test('зум сбрасывается при листании — назад страница возвращается обычной', async ({ page }) => {
  const img = await openReader(page)
  const f = fingers(page)
  const [cx, cy] = await center(img)
  await f.pinch(cx, cy, 60, 180)
  await expect.poll(() => scaleOf(img)).toBeGreaterThan(2)

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.cr__count')).toHaveText('2 / 3')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.cr__count')).toHaveText('1 / 3')
  await expect.poll(() => scaleOf(page.locator('.cr__img:not(.cr__img--off)'))).toBe(1)
  await expect(page.locator('.cr__stage--zoomed')).toHaveCount(0)
})

test.describe('планшет', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test('в полном экране щипок увеличивает лист, кнопка видна под панелью', async ({ page }) => {
    const img = await openReader(page)
    await page.locator('.cr__full').click()
    await expect(page.locator('.cr--full')).toBeVisible()
    const f = fingers(page)
    const [cx, cy] = await center(img)
    await f.pinch(cx, cy, 80, 240)
    await expect.poll(() => scaleOf(img)).toBeGreaterThan(2.5)
    expect(await page.evaluate(() => window.visualViewport.scale)).toBe(1)

    // Кнопку ничто не накрывает: в её центре — она сама.
    const btn = page.locator('.cr__unzoom')
    await expect(btn).toBeVisible()
    const b = await btn.boundingBox()
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.cr__unzoom') !== null, [
      b.x + b.width / 2,
      b.y + b.height / 2,
    ])
    expect(hit).toBe(true)
    await page.screenshot({ path: test.info().outputPath('tablet-full-zoomed.png') })

    await f.tap(b.x + b.width / 2, b.y + b.height / 2)
    await expect.poll(() => scaleOf(img)).toBe(1)
  })
})
