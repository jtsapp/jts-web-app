import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { mockGates } from './helpers/login.js'

// Pronunciation World (?screen=pronunciation) без бэкенда: /mobile/pronunciation отдаёт бандл урезанной копии
// прототипа (src/practice/pronunciation/__fixtures__/bundle.json — A0, темы A0.1 и A0.3), медиа /__pron-media/* —
// тихий mp3 и пиксель webp, /api/tts — тихий mp3. Верные ворота Echo Gates наружу не выдаются (как и ученику),
// поэтому тест берёт их у самой игры: window.__PRON_E2E открывает api движка. Правильность экранов и раундов —
// оракул (engine.test.js).

const BUNDLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'pronunciation', '__fixtures__', 'bundle.json'), 'utf8'))
const TOPIC = BUNDLE.levels[0].modules[0].id
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}
// 1×1 webp
const PIXEL = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64')

async function mockBackend(page, { bundleStatus = 200, token = 'test-token' } = {}) {
  // Чистим хранилище один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест как раз проверяет, что прогресс
  // её переживает.
  await page.addInitScript((tk) => {
    window.__PRON_FAST = true
    window.__PRON_E2E = true
    if (sessionStorage.getItem('e2e_pron_init')) return
    sessionStorage.setItem('e2e_pron_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  // Замки develop с 29.10.2026 (документы платформы, разделы тарифа) — иначе вместо Практики их экран.
  await mockGates(page)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  // к адресам бэкенда дописывается query (?jts_app=student) — глоб со ** на конце
  await page.route('**/mobile/pronunciation**', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__pron-media/**', (r) =>
    r.fulfill(r.request().url().endsWith('.mp3') ? { status: 200, contentType: 'audio/mpeg', body: silentMp3() } : { status: 200, contentType: 'image/webp', body: PIXEL }))
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
}

const shadow = (page) => page.locator('.prn-host')

/** Пройти открытый раунд Echo Gates: каждое эхо — в его ворота (верные ворота — у самой игры). */
async function playRound(page) {
  const host = shadow(page)
  for (let guard = 0; guard < 60; guard++) {
    const handle = await page.waitForFunction(() => {
      const G = window.__pron?.P._game()
      if (!G) return null
      if (G.ended) return { ended: true }
      const echo = G.live.find((x) => x.sel)
      return echo ? { gate: echo.item.gate } : null
    }, null, { timeout: 15_000 })
    const next = await handle.jsonValue()
    if (next.ended) return
    await host.locator(`.gate-hit[data-g="${next.gate}"]`).click()
  }
  throw new Error('раунд не закончился')
}

test('Практика → Говорение → тема → объяснение до конца → раунд со звездой; прогресс переживает перезагрузку', async ({ page }) => {
  test.setTimeout(120_000)
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await mockBackend(page)
  await page.goto('/?screen=practice')
  const speaking = page.locator('.pk-skill', { hasText: 'Говорение' })
  await expect(speaking).toBeVisible({ timeout: 60_000 })
  await speaking.click()
  // Вся карточка — кнопка перехода (редизайн 29.10.2026, баннера с кнопкой больше нет).
  await page.locator('#sec-pronunciation').click()
  await expect(page).toHaveURL(/screen=pronunciation/)

  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  await expect(host.locator('.w-hero h1')).toHaveText('Pronunciation World')
  // Карта пишет открытый уровень при каждой отрисовке, а хранилище шлёт событие и на свою запись: перерисовка карты
  // по событию зацикливалась (Maximum call stack). Переход по региону и «снимок сервера» обязаны пройти тихо.
  await host.locator('a.rg[href="#/level/A0"]').click()
  await page.evaluate(() => window.dispatchEvent(new Event('pronunciation-progress')))
  await expect(host.locator('.rg.on')).toHaveAttribute('href', '#/level/A0')

  // Объяснение: все экраны «Next», последний — «Ваша очередь» и вход в игру.
  await host.locator(`.topic a.btn.learn[href="#/learn/${TOPIC}"]`).click()
  await expect(host.locator('.learnv')).toBeVisible()
  // Перевод — кнопкой внутри объяснения: русский текст показывается, английский остаётся.
  await host.locator('.lmain [data-trbtn="ru"]').first().click()
  await expect(host.locator('.pron')).toHaveAttribute('data-tr', 'ru')
  await expect(host.locator('.lmain .tr-ru').first()).toBeVisible()
  for (let i = 0; i < 20 && (await host.locator('#lnext').count()); i++) await host.locator('#lnext').click()
  await expect(host.locator('.l-end .tryit')).toBeVisible()
  await expect(page.locator('.asst__launcher')).toBeVisible()

  // «Let's practise!» — вспышка портала, затем вступление раунда 1.
  await host.locator('.lnav-end .portal-go').click()
  await expect(host.locator('#g-go')).toBeVisible()
  // В раунде кнопки Луны нет: она ложилась на ворота (styles.css, data-game экрана).
  await expect(host).toHaveAttribute('data-game', '1')
  await expect(page.locator('.asst__launcher')).toBeHidden()
  await host.locator('#g-go').click()
  // Первый раз — «Как играть».
  await host.locator('#tut-ok').click()
  await playRound(page)
  await expect(host.locator('.g-card.result .res-num')).toContainText('100%')
  await expect(host.locator('.g-card.result .res-star.on')).toBeVisible()

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  const topic = host.locator('.topic', { has: page.locator(`a.btn.learn[href="#/learn/${TOPIC}"]`) })
  await expect(topic.locator('a.btn.learn.seen')).toBeVisible()
  await expect(topic.locator('.stars i.on')).toHaveCount(1)
  expect(pageErrors).toEqual([])
})

// Гостя приложение до экрана раздела не пускает: ?screen= без входа ведёт на приветствие с «Войти».
test('гость попадает на вход, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=pronunciation')
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.prn-host')).toHaveCount(0)

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=pronunciation')
  await expect(page2.locator('.prn-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки на карте, в объяснении и в игре', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=pronunciation')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  // экран со схемой — второй в объяснении A0.3 (рот и губы шире текста)
  await page.evaluate(() => window.__pron.go('#/learn/A0.3/2'))
  await expect(host.locator('.beat .visual')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.evaluate((id) => window.__pron.go(`#/play/${id}`), TOPIC)
  await expect(host.locator('#g-go')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
})
