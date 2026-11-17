import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { mockGates } from './helpers/login.js'

// Literature World (?screen=literature) без бэкенда: /mobile/literature отдаёт бандл копии прототипа
// (src/practice/literature/__fixtures__/bundle.json — все 26 пьес с урезанным текстом, проза, стихи, 78 слов),
// сцены и маскоты /__literature-media/* — пиксель webp из той же копии, видео входа — крошечное mp4. Картинки
// Wikimedia, превью YouTube и голос /api/tts тоже подменены: тест не ходит в сеть. Правильность экранов, заданий и
// ответов — оракул (engine.test.js); здесь — путь ученика в настоящем браузере и связь с приложением.

const FIX = path.join(__dirname, '..', 'src', 'practice', 'literature', '__fixtures__')
const BUNDLE = JSON.parse(fs.readFileSync(path.join(FIX, 'bundle.json'), 'utf8'))
const HTML = fs.readFileSync(path.join(FIX, 'prototype-mini.html'), 'utf8')
const WEBP = Buffer.from(HTML.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)[1], 'base64')
const MP4 = Buffer.from(HTML.match(/data:video\/mp4;base64,([A-Za-z0-9+/=]+)/)[1], 'base64')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const WORD = BUNDLE.x.words.find((w) => w.anchor.kind === 'item') || BUNDLE.x.words[0]

async function mockBackend(page, { bundleStatus = 200, token = 'test-token' } = {}) {
  // Чистим хранилище один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест как раз проверяет, что блокнот
  // её переживает.
  await page.addInitScript((tk) => {
    window.__LIT_E2E = true
    if (sessionStorage.getItem('e2e_lit_init')) return
    sessionStorage.setItem('e2e_lit_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  // Замки develop с 29.10.2026 (документы платформы, разделы тарифа) — иначе вместо Практики их экран.
  await mockGates(page)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'B1' } })))
  // к адресам бэкенда дописывается query (?jts_app=student) — глоб со ** на конце
  await page.route('**/mobile/literature**', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__literature-media/**', (r) =>
    r.fulfill(/\.mp4$/.test(r.request().url()) ? { status: 200, contentType: 'video/mp4', body: MP4 } : { status: 200, contentType: 'image/webp', body: WEBP }))
  // внешнее — без сети: картинки Wikimedia и превью YouTube — тот же пиксель, голос — пустой ответ
  for (const host of ['https://upload.wikimedia.org/**', 'https://commons.wikimedia.org/**', 'https://i.ytimg.com/**'])
    await page.route(host, (r) => r.fulfill({ status: 200, contentType: 'image/webp', body: WEBP }))
  await page.route('**/api/tts**', (r) => r.fulfill({ status: 204, body: '' }))
}

const shadow = (page) => page.locator('.lit-host')
const open = (page, hash) => page.evaluate((h) => window.__lit.go(h), hash)

test('Практика → Чтение → Literature World → глава → пьеса → стих → слово в блокнот; блокнот переживает перезагрузку', async ({ page }) => {
  test.setTimeout(150_000)
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await mockBackend(page)
  await page.goto('/?screen=practice')
  const reading = page.locator('.pk-skill', { hasText: 'Чтение' })
  await expect(reading).toBeVisible({ timeout: 60_000 })
  await reading.click()
  // Вся карточка — кнопка перехода; Literature World — после «Комиксов», сказки — последние.
  await expect(page.locator('#sec-literature .pk-card__title')).toHaveText('Literature World')
  const order = await page.locator('[id^="sec-"]').evaluateAll((els) => els.map((e) => e.id))
  expect(order.indexOf('sec-literature')).toBe(order.indexOf('sec-comics') + 1)
  await page.locator('#sec-literature').click()
  await expect(page).toHaveURL(/screen=literature/)

  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  await expect(host.locator('.lw-entry h1')).toContainText('Open the book.')
  // сцена входа — ссылкой бакета, маскот — тоже; файл настоящий: браузер его загрузил
  const mascot = host.locator('.lw-role img').first()
  await expect(mascot).toHaveAttribute('src', BUNDLE.scenes.c_dexter)
  await expect.poll(() => mascot.evaluate((i) => i.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0)
  // язык раздела по умолчанию — язык приложения (русский)
  await expect(host.locator('#lang button.on')).toHaveText('РУС')

  // Глава I — дверь «The Globe» на карте; адрес приложения прежний (роутер раздела — свой).
  await host.locator('.lw-door').first().click()
  await expect(host.locator('.world-hero h1')).toHaveText('Shakespeare')
  await expect(page).toHaveURL(/screen=literature$/)
  // inline-обработчик разметки (onclick="go('play','romeo')") — делегированным обработчиком в области движка
  await host.locator('.world-hero .hero-ctas .btn').first().click()
  await expect(host.locator('.play-head h1')).toHaveText('Romeo and Juliet')
  await host.locator('.ptabs button').nth(1).click()
  await expect(host.locator('.reader .scene-h h2')).toBeVisible()
  await expect(host.locator('#script .sp').first()).toBeVisible()

  // Стих — карточкой «Поэзии»: текст, строки, вкладки Experience / Explore / Practise. На телефоне разделы шапки — за
  // бургером (inline-код прототипа $id('nav').classList.toggle)
  const burger = host.locator('.burger')
  if (await burger.isVisible()) await burger.click()
  await host.locator('#nav button', { hasText: 'Поэзия' }).click()
  await host.locator('#app .card').first().click()
  await expect(host.locator('#poem .ln').first()).toBeVisible()
  await host.locator('.stage-tabs button').nth(2).click()
  await expect(host.locator('#actBody')).toBeVisible()

  // Слово: «шесть шагов», блокнот; «Hear» — голос раздела (/api/tts), а не синтез браузера
  await open(page, `word/${WORD.id}`)
  await expect(host.locator('.whead h1')).toHaveText(WORD.word)
  const tts = page.waitForRequest((r) => r.url().includes('/api/tts'))
  await host.locator('.wstep button', { hasText: 'The word alone' }).click()
  await tts
  await host.locator('.whead .btn').click()
  await expect(host.locator('.whead .btn')).toContainText('In my notebook')
  // задание шага 4 — ответ уходит, вариант подсвечен
  await host.locator('#wprac .opts button').first().click()
  await expect(host.locator('#wprac .opts button.ok')).toHaveCount(1)

  // Поиск — форма с inline onsubmit (this.q.value) в настоящем браузере
  await open(page, 'words')
  await host.locator('.find input[name="q"]').fill('heart')
  await host.locator('.find input[name="q"]').press('Enter')
  await expect(host.locator('.page-head h1')).toHaveText('“heart”')

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  await open(page, 'words')
  await expect(host.locator('.panel.nb .wchips button')).toHaveText([WORD.word])
  expect(pageErrors).toEqual([])
})

// Гостя приложение до экрана раздела не пускает: ?screen= без входа ведёт на приветствие с «Войти».
test('гость попадает на вход, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=literature')
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.lit-host')).toHaveCount(0)

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=literature')
  await expect(page2.locator('.lit-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки на входе, в главе, в читалке, у стиха, у слова и в мастерской', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=literature')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  for (const [hash, sel] of [
    ['shakespeare', '.world-hero h1'],
    ['play/romeo/read/1.1', '#script .sp'],
    ['item/po-tiger', '#poem .ln'],
    [`word/${WORD.id}`, '.whead h1'],
    ['workshop/rhyme', '#wsb'],
    ['periods', '.eras-v'],
  ]) {
    await open(page, hash)
    await expect(host.locator(sel).first()).toBeVisible()
    expect(await overflow(), hash).toBeLessThanOrEqual(0)
  }
})
