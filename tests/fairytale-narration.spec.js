import { test, expect } from '@playwright/test'

// Плашка рассказчика в сказке: на телефоне текст обрезался панелью браузера и не
// листался, а сама плашка закрывала героя (видео 02.11.2026).
//
// Движок сказки в приложении открывается только через квоту Практики, а стили у
// него те же, что у standalone-страницы, поэтому проверяем на ней. Общего правила
// приложения `.screen{min-height:100vh}` там нет — кладём его сами, числом: Chromium
// на компьютере не различает высоту с панелями браузера и без них, а 760 — это
// `100vh` телефона из видео при видимых 665.
const VISIBLE = 665
const LARGE_VIEWPORT = 760

const LONG =
  "Some pieces were no bigger than a grain of sand, and these blew about the wide world. When a splinter lodged in a person's eye, they saw everything crookedly, or saw only what was ugly. And when one pierced a heart, that was most dreadful of all — for the heart became like a lump of ice."

test.use({ viewport: { width: 392, height: VISIBLE }, hasTouch: true })

async function openNarration(page, text) {
  await page.goto('/practice/fairytales.html', { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: `.screen{min-height:${LARGE_VIEWPORT}px}` })
  await page.waitForFunction(() => typeof beginAs === 'function')
  await page.evaluate((en) => {
    const hero = TALES.find((p) => p.id === 'snow_queen').playable[0]
    chooseTale(TALES.find((p) => p.id === 'snow_queen'))
    beginAs(hero.key, hero.path)
    stopCinema()
    document.querySelector('#chaptercard').classList.remove('show')
    showNarration({ en }, null)
    clearLine() // реплика не должна смениться сама посреди проверки
  }, text)
  await expect(page.locator('#narration')).toHaveClass(/show/)
  // плашка выезжает снизу полсекунды
  await page.waitForTimeout(700)
}

const box = (page, selector) => page.locator(selector).first().boundingBox()

test('плашка целиком в видимой области, текст не обрезан панелью браузера', async ({ page }) => {
  await openNarration(page, LONG)
  const panel = await box(page, '#narration')
  expect(panel.y + panel.height).toBeLessThanOrEqual(VISIBLE + 1)
})

test('герой не закрыт: над плашкой видно не меньше половины фигуры', async ({ page }) => {
  await openNarration(page, LONG)
  const panel = await box(page, '#narration')
  const hero = await box(page, '.actor.player')
  expect(panel.y - hero.y).toBeGreaterThanOrEqual(hero.height / 2)
})

test('длинный текст листается пальцем до конца, а затухание снизу гаснет', async ({ page, context }) => {
  await openNarration(page, LONG)
  const text = page.locator('#narrText')
  await expect(text).toHaveClass(/more/)

  // Настоящее касание, а не присваивание scrollTop: иначе touch-action не проверить.
  const area = await text.boundingBox()
  const cdp = await context.newCDPSession(page)
  const x = area.x + area.width / 2
  let y = area.y + area.height - 8
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 0; i < 12; i += 1) {
    y -= 8
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => text.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)

  await text.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(text).not.toHaveClass(/more/)
})

test('новая реплика открывается с начала, короткой прокрутка не нужна', async ({ page }) => {
  await openNarration(page, LONG)
  const text = page.locator('#narrText')
  await text.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await page.evaluate(() => {
    showNarration({ en: 'The mirror broke.' }, null)
    clearLine()
  })
  await expect(text).toHaveText('The mirror broke.')
  expect(await text.evaluate((el) => el.scrollTop)).toBe(0)
  await expect(text).not.toHaveClass(/more/)
})
