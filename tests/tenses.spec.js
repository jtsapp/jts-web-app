import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { mockGates } from './helpers/login.js'

// Tenses World (?screen=tenses) без бэкенда: /mobile/tenses отдаёт бандл копии прототипа
// (src/practice/tenses/__fixtures__/bundle.json — все 12 времён и 26 наборов), медиа /__tenses-media/* — крошечное
// mp4 и постер из той же копии, /api/tts — тихий mp3. Правильность экранов, проверки ответов и итогов — оракул
// (engine.test.js); здесь — путь ученика в настоящем браузере и связь с приложением.

const FIX = path.join(__dirname, '..', 'src', 'practice', 'tenses', '__fixtures__')
const BUNDLE = JSON.parse(fs.readFileSync(path.join(FIX, 'bundle.json'), 'utf8'))
const HTML = fs.readFileSync(path.join(FIX, 'prototype-mini.html'), 'utf8')
const MP4 = Buffer.from(HTML.match(/id="video-present-simple">([A-Za-z0-9+/=]+)<\/script>/)[1], 'base64')
const JPEG = Buffer.from(HTML.match(/poster: "data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/)[1], 'base64')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

async function mockBackend(page, { bundleStatus = 200, token = 'test-token' } = {}) {
  // Чистим хранилище один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест как раз проверяет, что прогресс
  // её переживает.
  await page.addInitScript((tk) => {
    window.__TENSES_E2E = true
    if (sessionStorage.getItem('e2e_tenses_init')) return
    sessionStorage.setItem('e2e_tenses_init', '1')
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
  await page.route('**/mobile/tenses**', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__tenses-media/**', (r) =>
    r.fulfill(r.request().url().endsWith('.mp4') ? { status: 200, contentType: 'video/mp4', body: MP4 } : { status: 200, contentType: 'image/jpeg', body: JPEG }))
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
}

const shadow = (page) => page.locator('.tns-host')

/**
 * Ответить на задания открытого набора с from-го: верно, как ученик, который знает ответ (верный вариант — из данных
 * задания). Движок синхронный, поэтому весь набор — одним вызовом в странице.
 */
function answerRest(page, setId, from) {
  return page.evaluate(
    ({ setId, from }) => {
      const sh = document.querySelector('.tns-host').shadowRoot
      const TW = window.__tenses.TW
      const $ = (s) => sh.querySelector(s)
      const $$ = (s) => [...sh.querySelectorAll(s)]
      const tname = (id) => TW.meta(id).name
      const optText = (b) => (b.querySelector('.tln') || b.querySelector('span')).textContent
      const type = (el, v) => {
        el.value = v
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const pick = (scope, text) => [...scope.querySelectorAll('.pr-opt')].find((b) => optText(b) === text).click()
      const items = TW.PRACTICE.SETS[setId].items
      for (const it of items.slice(from)) {
        if (it.t === 'choice' || it.t === 'meaning') pick($('#pr-card'), it.o[0])
        else if (it.t === 'name' || it.t === 'timeline') pick($('#pr-card'), tname(it.o[0]))
        else if (it.t === 'gap' || it.t === 'rewrite') {
          type($('#pr-card .pr-input'), it.a[0])
          $('#pr-card [data-a=check]').click()
        } else if (it.t === 'order') {
          for (const w of it.a.replace(/[.?!]$/, '').split(' ')) $$('#pr-card .pr-bank .pr-tile:not(.used)').find((b) => b.textContent === w).click()
          $('#pr-card [data-a=check]').click()
        } else if (it.t === 'error') {
          $$('#pr-card .pr-tok').find((b) => b.textContent === it.err).click()
          pick($('#pr-card .pr-err2'), it.o[0])
        } else if (it.t === 'text') {
          const gaps = it.parts.filter((p) => typeof p === 'object')
          $$('#pr-card .pr-text input').forEach((x, i) => type(x, gaps[i].a[0]))
          $('#pr-card [data-a=check]').click()
        }
        $('#pr-card [data-a=next]').click()
      }
      return items.length
    },
    { setId, from },
  )
}

test('Практика → Грамматика → Tenses World → время с видео → практика; прогресс переживает перезагрузку', async ({ page }) => {
  test.setTimeout(120_000)
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await mockBackend(page)
  await page.goto('/?screen=practice')
  const grammar = page.locator('.pk-skill', { hasText: 'Грамматика' })
  await expect(grammar).toBeVisible({ timeout: 60_000 })
  await grammar.click()
  // Вся карточка — кнопка перехода; Tenses World — в «Тренажёрах», сразу после «Тем по уровням».
  await expect(page.locator('#sec-tenses .pk-card__title')).toHaveText('Tenses World')
  await page.locator('#sec-tenses').click()
  await expect(page).toHaveURL(/screen=tenses/)

  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  await expect(host.locator('.map a.tile')).toHaveCount(12)
  await host.locator('a.tile[href="#/t/present-simple"]').click()

  // Видео — ссылкой бакета, с постером; файл настоящий: браузер дочитал метаданные, заглушки «не загрузилось» нет.
  await expect(host.locator('.lesson-head h1')).toHaveText('Present Simple')
  const video = host.locator('.cinema video')
  await expect(video).toHaveAttribute('poster', BUNDLE.TW.VIDEOS['present-simple'].poster)
  await expect(video.locator('source')).toHaveAttribute('src', BUNDLE.TW.VIDEOS['present-simple'].src)
  await expect.poll(() => video.evaluate((v) => v.readyState), { timeout: 15_000 }).toBeGreaterThan(0)
  await expect(host.locator('.cinema-screen .pending-in')).toHaveCount(0)

  // Перевод — кнопками шапки: подписи по-русски, переводы примеров появляются; адрес приложения прежний.
  await host.locator('.topbar [data-lang="ru"]').click()
  await expect(host.locator('.tws')).toHaveAttribute('lang', 'ru')
  await expect(host.locator('.usage .xlat:not([hidden])').first()).toBeVisible()
  await host.locator('.topbar [data-lang="en"]').click()
  await expect(page).toHaveURL(/screen=tenses/)

  // Практика времени: первое задание — руками, остальное — верными ответами.
  await host.locator('#practice a.pl-start').click()
  await expect(host.locator('#pr-card .pr-instr')).toHaveText('Choose the correct option.')
  await host.locator('#pr-card .pr-opt > span').getByText('boils', { exact: true }).click()
  await expect(host.locator('#pr-card .pr-fb.ok')).toBeVisible()
  await host.locator('#pr-card [data-a=next]').click()
  const total = await answerRest(page, 'present-simple', 1)
  await expect(host.locator('.pr-results h2')).toHaveText('Set complete')
  await expect(host.locator('.pr-results p').first()).toHaveText(`${total} of ${total} correct`)

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  const tile = host.locator('a.tile[href="#/t/present-simple"]')
  await expect(tile).toHaveClass(/visited/)
  await expect(tile.locator('.badge-prac')).toBeVisible()
  await expect(host.locator('.hero-actions a.btn').first()).toContainText('Continue: Present Simple')
  expect(pageErrors).toEqual([])
})

// Гостя приложение до экрана раздела не пускает: ?screen= без входа ведёт на приветствие с «Войти».
test('гость попадает на вход, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=tenses')
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.tns-host')).toHaveCount(0)

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=tenses')
  await expect(page2.locator('.tns-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки на карте, на странице времени и в задании', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=tenses')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  // самое длинное название и самые широкие таблицы — у Future Perfect Continuous
  await page.evaluate(() => window.__tenses.go('#/t/future-perfect-continuous/lab'))
  await expect(host.locator('#lab-box .machine-grid')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  // задание с линиями времени — три схемы в ряд
  await page.evaluate(() => window.__tenses.go('#/practice/recognise'))
  await expect(host.locator('#pr-card .pr-opt').first()).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.evaluate(() => window.__tenses.go('#/practice'))
  await expect(host.locator('.pr-path')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
})
