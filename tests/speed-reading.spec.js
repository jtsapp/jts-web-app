import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { FLAGS, silentWav } from './helpers/assistant-wake.js'

// «Скорочтение» (?screen=speed-reading) без бэкенда: ручки /mobile/speed-reading/** подменены, образец — роут
// сайта подменён и отдаёт тихий WAV с разметкой слов, распознавание (/api/transcribe) отвечает первыми 15 словами
// текста. Микрофон — фальшивое устройство Chrome, которое читает файл с тоном: MediaRecorder пишет настоящий
// звук, и в /api/transcribe уходит настоящий WAV. Правила итога — оракул прототипа (rules.test.js), движок по
// шагам — engine.test.js; здесь — путь ученика целиком в браузере.

const TONE_FILE = path.join(os.tmpdir(), 'jts-e2e-speed-tone.wav')
fs.writeFileSync(TONE_FILE, toneWav(16000 * 8, 16000))
test.use({ launchOptions: { args: [...FLAGS, `--use-file-for-fake-audio-capture=${TONE_FILE}`] } })

/** Тон 440 Гц WAV PCM 16 бит — чтобы запись не была пустой. */
function toneWav(n, rate) {
  const b = silentWav(n, rate)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), 44 + i * 2)
  return b
}

const BODY_A = 'Hello everyone! My name is Ali and I am twelve years old. I live in Almaty with my mum and dad.'
const BODY_B = 'Good morning, ladies and gentlemen, and welcome aboard Flight 512 from Astana to Istanbul. Please fasten your seat belts now.'
const WORDS_B = BODY_B.split(/\s+/)
const SAMPLE_B = { url: 'https://files.e2e.test/sample-b.wav', words: WORDS_B.map((w, i) => [w, +(i * 0.15).toFixed(2), +(i * 0.15 + 0.12).toFixed(2)]), wpm: 180 }
const TEXTS = [
  { id: 'hello', level: 'A1', icon: '👋', title: { ru: 'Знакомство', kk: 'Танысу', en: 'Introduce yourself' }, body: BODY_A, words: 20, sample: { ...SAMPLE_B, url: 'https://files.e2e.test/sample-a.wav', words: BODY_A.split(/\s+/).map((w, i) => [w, i * 0.4, i * 0.4 + 0.3]), wpm: 150 } },
  { id: 'flight', level: 'B1', icon: '✈️', title: { ru: 'Объявление в самолёте', kk: 'Ұшақтағы хабарландыру', en: 'Flight announcement' }, body: BODY_B, words: WORDS_B.length, sample: null },
]
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function mockBackend(page, { token = 'test-token', texts = TEXTS } = {}) {
  const server = { posts: [], sampleCalls: [], transcribe: [], attempts: [{ id: 1, textId: 'hello', speed: 1, durationSec: 31, wordsTotal: 20, wordsRead: 16, percent: 80, stars: 2, wpm: 31, scoredBy: 'server', coins: 4, createdAt: '2026-10-20T08:00:00Z' }] }
  await page.addInitScript((tk) => {
    if (sessionStorage.getItem('e2e_sr_init')) return
    sessionStorage.setItem('e2e_sr_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    localStorage.setItem('lang', 'ru')
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/speed-reading/texts**', (r) => r.fulfill(json(texts)))
  await page.route('**/mobile/speed-reading/attempts**', (r) => {
    if (r.request().method() === 'GET') return r.fulfill(json(server.attempts))
    const body = r.request().postDataJSON()
    server.posts.push(body)
    const attempt = { id: 100 + server.posts.length, ...body, coins: server.posts.length === 1 ? 4 : 0, createdAt: new Date().toISOString() }
    server.attempts.unshift(attempt)
    return r.fulfill(json({ attempt, coins: attempt.coins, balance: { coins: 50 } }))
  })
  await page.route('**/api/practice/speed-reading/sample**', (r) => {
    server.sampleCalls.push(r.request().postDataJSON())
    return r.fulfill(json({ sample: SAMPLE_B }))
  })
  await page.route('**/api/transcribe**', (r) => {
    server.transcribe.push(r.request().postDataBuffer())
    return r.fulfill(json({ text: WORDS_B.slice(0, 15).join(' ') }))
  })
  // Образцы — тихий WAV на 4 с: <audio> играет его по-настоящему, и подсветка идёт по его времени.
  await page.route('https://files.e2e.test/**', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav(16000 * 4, 16000) }))
  return server
}

// JS-ошибки страницы и консоли. Отказы чужих ручек (без бэкенда фальшивый токен получает 401 у dev-сервера) —
// не ошибки раздела; ручки самого раздела подменены все, и их сбой в консоли тест ловит.
function watchErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const url = m.location()?.url || ''
    if (m.text().startsWith('Failed to load resource') && !/speed-reading|transcribe|files\.e2e/.test(url)) return
    errors.push(`console: ${m.text()} ${url}`)
  })
  return errors
}

const host = (page) => page.locator('.srp-host')

test('Практика → Аудирование → Скорочтение: образец, запись, итог по серверу, попытка и «Мои попытки»', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = watchErrors(page)
  const server = await mockBackend(page)
  await page.goto('/?screen=practice')
  const listening = page.locator('.pk-skill', { hasText: 'Аудирование' })
  await expect(listening).toBeVisible({ timeout: 60_000 })
  await listening.click()
  const banner = page.locator('.pk-banner--speed-reading')
  await expect(banner.locator('.pk-banner__tag')).toHaveText('Новое')
  await banner.locator('.pk-banner__cta').click()
  await expect(page).toHaveURL(/screen=speed-reading/)
  const h = host(page)
  await expect(h).toHaveAttribute('data-texts', '2', { timeout: 30_000 })
  await expect(h).toHaveAttribute('data-source', 'api')

  // текст без образца — образец создаётся при открытии
  await h.locator('[data-act="text"][data-arg="flight"]').click()
  await expect.poll(() => server.sampleCalls).toEqual([{ id: 'flight' }])
  const listen = h.locator('[data-act="listen"]')
  await expect(listen).toContainText('Послушать образец')
  await expect(h.locator('.srstart')).toContainText('180 сл/мин')

  await h.locator('[data-act="speed"][data-arg="2"]').click()
  await expect(h.locator('.srstart')).toContainText('360 сл/мин')
  await listen.click()
  await expect(h.locator('#srlist span.on')).toHaveCount(1, { timeout: 5_000 })
  await expect(h.locator('#srlist')).toHaveCount(0, { timeout: 10_000 })

  // запись: отсчёт 3-2-1, бегущая строка, «Стоп»
  await h.locator('[data-act="begin"]').click()
  await expect(h.locator('.tele')).toBeVisible()
  await expect(h.locator('#telecount')).toHaveText('', { timeout: 5_000 })
  await page.waitForTimeout(1500)
  await h.locator('[data-act="stop"]').click()
  await expect(h.locator('.chero h2')).toHaveText('Прочитано 75%', { timeout: 30_000 })
  await expect(h.locator('#srsave')).toContainText('+4', { timeout: 10_000 })

  expect(server.transcribe).toHaveLength(1)
  const sent = server.transcribe[0].toString('latin1')
  expect(sent).toContain('RIFF')
  expect(sent).toContain('WAVE')
  expect(server.posts).toHaveLength(1)
  const body = server.posts[0]
  expect(Object.keys(body).sort()).toEqual(['durationSec', 'percent', 'scoredBy', 'speed', 'stars', 'textId', 'wordsRead', 'wordsTotal', 'wpm'])
  expect(body).toMatchObject({ textId: 'flight', speed: 2, wordsTotal: 20, wordsRead: 15, percent: 75, stars: 2, scoredBy: 'server' })
  expect(body.durationSec).toBeGreaterThanOrEqual(1)
  await expect(h.locator('audio').first()).toHaveAttribute('src', /^blob:/)
  await expect(h.locator('a[download]')).toHaveAttribute('download', /^speed-flight-\d{4}-\d{2}-\d{2}\.wav$/)

  // «Мои попытки»: своя — с плеером, с сервера — без
  const rows = h.locator('.srtries .lrow')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0).locator('audio')).toHaveCount(1)
  await expect(rows.nth(1)).toContainText('80%')

  // ещё раз — вторая попытка, монет уже нет
  await h.locator('[data-act="begin"]').click()
  await expect(h.locator('#telecount')).toHaveText('', { timeout: 5_000 })
  await page.waitForTimeout(800)
  await h.locator('[data-act="stop"]').click()
  await expect(h.locator('#srsave')).toContainText('Попытка сохранена', { timeout: 30_000 })
  await expect(h.locator('.srtries .lrow')).toHaveCount(3)
  expect(errors).toEqual([])
})

test('нет доступа к микрофону — экран-инструкция и демо, которое ничего не отправляет', async ({ page }) => {
  test.setTimeout(90_000)
  const server = await mockBackend(page)
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'))
  })
  await page.goto('/?screen=speed-reading&text=hello')
  const h = host(page)
  await expect(h).toHaveAttribute('data-texts', '2', { timeout: 60_000 })
  await expect(h.locator('.srtexts button.on')).toHaveAttribute('data-arg', 'hello')
  await h.locator('[data-act="begin"]').click()
  await expect(h.locator('.srstart h2')).toHaveText('Нет доступа к микрофону')
  await expect(h.locator('.srstart')).toContainText('NotAllowedError')
  await h.locator('[data-act="demo"]').click()
  await expect(h.locator('.tele')).toBeVisible()
  await expect(h.locator('#telecount')).toHaveText('', { timeout: 5_000 })
  await page.waitForTimeout(1000)
  await h.locator('[data-act="stop"]').click()
  await expect(h.locator('.card').first()).toContainText('Это демо без микрофона')
  expect(server.posts).toEqual([])
  expect(server.transcribe).toEqual([])
})

// Гостя приложение до экрана раздела не пускает: ?screen= без входа ведёт на приветствие с «Войти» (Д12 держит
// и оболочка — статус guest на случай выхода из аккаунта посреди раздела).
test('гость попадает на вход, без текстов — «Раздел готовится»', async ({ page }) => {
  const server = await mockBackend(page, { token: null })
  await page.goto('/?screen=speed-reading')
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.srp-host')).toHaveCount(0)
  expect(server.sampleCalls).toEqual([])

  const page2 = await page.context().newPage()
  await mockBackend(page2, { texts: [] })
  await page2.goto('/?screen=speed-reading')
  await expect(page2.locator('.srp-state[data-status="missing"]')).toBeVisible({ timeout: 60_000 })
})

test('360px: выбор, телесуфлёр и итог без горизонтальной прокрутки', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=speed-reading')
  const h = host(page)
  await expect(h).toHaveAttribute('data-texts', '2', { timeout: 60_000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow(), 'выбор').toBeLessThanOrEqual(0)
  await h.locator('[data-act="demo"]').click()
  await expect(h.locator('#telecount')).toHaveText('', { timeout: 5_000 })
  expect(await overflow(), 'телесуфлёр').toBeLessThanOrEqual(0)
  await h.locator('[data-act="stop"]').click()
  await expect(h.locator('.chero')).toBeVisible()
  expect(await overflow(), 'итог').toBeLessThanOrEqual(0)
})
