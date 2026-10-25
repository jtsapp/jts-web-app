import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Word Hunt (?screen=wordhunt) без бэкенда: /mobile/word-hunt отдаёт бандл урезанной копии прототипа
// (src/practice/wordhunt/__fixtures__/bundle.json, медиа — data-URI), /api/tts — тихий mp3. Сетку кроссворда
// тест решает по ответам движка: флаг window.__WORDHUNT_E2E открывает его api (WordHuntPage) — ученику ответы
// не видны, правильность сеток и досок проверяет оракул (engine.test.js).

const BUNDLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'wordhunt', '__fixtures__', 'bundle.json'), 'utf8'))
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

async function mockBackend(page, { bundleStatus = 200, token = 'test-token', lang = null } = {}) {
  // Хранилище чистим один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест проверяет, что прогресс её
  // переживает.
  await page.addInitScript(
    ({ tk, lg }) => {
      window.__WORDHUNT_E2E = {}
      if (sessionStorage.getItem('e2e_wh_init')) return
      sessionStorage.setItem('e2e_wh_init', '1')
      const toursOff = localStorage.getItem('jts_tours_off')
      localStorage.clear()
      if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
      if (tk) localStorage.setItem('jts_access_token', tk)
      if (lg) localStorage.setItem('lang', lg)
    },
    { tk: token, lg: lang },
  )
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/word-hunt**', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['Word Hunt ещё не загружен'] }, bundleStatus)))
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
}

const shadow = (page) => page.locator('.whp-host')
const view = (page) => page.evaluate(() => window.__WORDHUNT_E2E.api?.snapshot().view)

async function openLesson(page, lv) {
  const host = shadow(page)
  await host.locator(`[data-a="gal"][data-lv="${lv}"]`).click()
  await expect.poll(() => view(page)).toBe('galaxy')
  await host.locator('#journey .node').first().click()
  await expect(host.locator('#scrim .sheet')).toBeVisible()
}

test('кроссворд с клавиатуры → итог; прогресс переживает перезагрузку', async ({ page }) => {
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await mockBackend(page)
  await page.goto('/?screen=wordhunt')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator('.hero .cta')).toContainText('Начать путешествие')

  await openLesson(page, 'A0')
  await host.locator('[data-a="playXw"]').click()
  await expect.poll(() => view(page)).toBe('xw')
  const words = await page.evaluate(() => window.__WORDHUNT_E2E.api.snapshot().xw.ents.length)
  for (let guard = 0; guard < 300; guard++) {
    const letter = await page.evaluate(() => {
      const G = window.__WORDHUNT_E2E.api.snapshot().xw
      return G && !G.over ? G.ents[G.cur.e].cells[G.cur.i].sol : null
    })
    if (!letter) break
    await page.keyboard.press(letter.toLowerCase())
  }
  await expect(host.locator('#v-result h1')).toHaveText('Кроссворд решён', { timeout: 10000 })
  await expect(host.locator('#gainN')).toHaveText(`+${words}`, { timeout: 5000 })

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator('.hero .cta')).toContainText('Продолжить')
  await expect(host.locator('#topStars')).toHaveText(String(words))
  expect(pageErrors).toEqual([])
})

test('поиск слов мышью: протянуть по буквам — слово найдено', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/?screen=wordhunt')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await openLesson(page, 'A0')
  await host.locator('[data-a="tab"][data-m="ws"]').click()
  await host.locator('[data-a="playWs"]').click()
  await expect.poll(() => view(page)).toBe('ws')
  const { cells, total } = await page.evaluate(() => {
    const G = window.__WORDHUNT_E2E.api.snapshot().ws
    return { cells: G.B.words[0].cells, total: G.B.words.length }
  })
  const center = async (i) => {
    const b = await host.locator(`#wsBoard .hc[data-c="${i}"]`).boundingBox()
    return [b.x + b.width / 2, b.y + b.height / 2]
  }
  const [x0, y0] = await center(cells[0])
  const [x1, y1] = await center(cells[cells.length - 1])
  await page.mouse.move(x0, y0)
  await page.mouse.down()
  await page.mouse.move(x1, y1, { steps: 8 })
  await page.mouse.up()
  await expect(host.locator('#wsCount')).toHaveText(`1 / ${total}`)
  await expect(host.locator('.wc.fd')).toHaveCount(1)
})

test('слово без записи звучит через Soniox (/api/tts)', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/?screen=wordhunt')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await openLesson(page, 'B2')
  await host.locator('[data-a="playXw"]').click()
  await expect.poll(() => view(page)).toBe('xw')
  const tts = page.waitForRequest(/\/api\/tts\?.*v=Freya/)
  await host.locator('[data-x="listen"]').click()
  expect(new URL((await tts).url()).searchParams.get('t')).toMatch(/^[a-z][a-z '-]+$/i)
})

test('казахский интерфейс приложения — раздел на KZ', async ({ page }) => {
  await mockBackend(page, { lang: 'kk' })
  await page.goto('/?screen=wordhunt')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator('.hero .cta')).toContainText('Саяхатты бастау')
  await expect(host.locator('.wh')).toHaveAttribute('lang', 'kk')
})

test('гость видит просьбу войти, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=wordhunt')
  await expect(page.locator('.whp-state[data-status="guest"]')).toBeVisible({ timeout: 30000 })

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=wordhunt')
  await expect(page2.locator('.whp-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки на главной и в кроссворде', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=wordhunt')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await openLesson(page, 'A0')
  await host.locator('[data-a="playXw"]').click()
  await expect.poll(() => view(page)).toBe('xw')
  expect(await overflow()).toBeLessThanOrEqual(0)
})
