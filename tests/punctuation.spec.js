import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { mockGates } from './helpers/login.js'

// Punctuation World (?screen=punctuation) без бэкенда: /mobile/punctuation отдаёт бандл урезанной копии прототипа
// (src/practice/punctuation/__fixtures__/bundle.json — страницы 1 и 7), картинки /__punct-media/* — пиксель webp,
// /api/tts — тихий mp3. Верный знак наружу не выдаётся (как и ученику), поэтому тест берёт его у самой игры:
// window.__PUNCT_E2E открывает api движка. «Меньше движения» включено — игра у прототипа сама сжимает паузы до
// 120 мс и не рисует конфетти, — иначе семь стадий шли бы минуты. Правильность экранов и заданий — оракул
// (engine.test.js).

const BUNDLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'punctuation', '__fixtures__', 'bundle.json'), 'utf8'))
const PAGE = BUNDLE.LESSONS.TOPICS[0].id
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
    window.__PUNCT_E2E = true
    if (sessionStorage.getItem('e2e_punct_init')) return
    sessionStorage.setItem('e2e_punct_init', '1')
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
  await page.route('**/mobile/punctuation**', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__punct-media/**', (r) => r.fulfill({ status: 200, contentType: 'image/webp', body: PIXEL }))
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
}

const shadow = (page) => page.locator('.pct-host')
const attr = (v) => v.replace(/["\\]/g, '\\$&')

/** Пройти открытое приключение до финала, отвечая верно (верный знак — у самой игры). */
async function playAdventure(page) {
  const host = shadow(page)
  for (let guard = 0; guard < 400; guard++) {
    const handle = await page.waitForFunction(() => {
      const root = document.querySelector('.pct-host')?.shadowRoot
      if (root?.querySelector('.scard.win')) return { win: true }
      const d = window.__punct?.debug()
      const w = d?.W.wait
      if (!w) return null
      if (w.kind === 'ok') return { kind: 'ok' }
      if (w.kind === 'pick') return { kind: 'pick', raft: !!root.querySelector('.rafts'), ans: d.W.ans }
      if (w.kind === 'send') return { kind: 'send', gaps: d.W.stitch.gaps.map((g) => ({ id: g.id, v: g.v, a: g.a })) }
      return null
    }, null, { timeout: 15_000 })
    const next = await handle.jsonValue()
    if (next.win) return
    if (next.kind === 'ok') await host.locator('[data-a3="ok"]').click()
    else if (next.kind === 'pick') {
      const opts = await host.locator('.obj[data-v],.raft[data-v]').evaluateAll((els) => els.map((e) => e.dataset.v))
      const v = opts.find((x) => (next.raft ? x === 'f' : next.ans.includes(x)))
      await host.locator(`[data-a3="pick"][data-v="${attr(v)}"]`).click()
    } else {
      for (const g of next.gaps) {
        if (g.v === g.a) continue
        await host.locator(`.gap[data-k="${g.id}"]`).click()
        await host.locator(`.picker [data-v="${attr(g.a)}"]`).click()
      }
      await host.locator('[data-a3="send"]').click()
    }
    // ждём, пока игра примет ответ: ожидание того же вида снимается движком сразу после клика
    await page.waitForFunction((kind) => window.__punct?.debug().W.wait?.kind !== kind, next.kind, { timeout: 15_000 }).catch(() => {})
  }
  throw new Error('приключение не закончилось')
}

test('Практика → Грамматика → страница → урок до конца → приключение со звёздами; прогресс переживает перезагрузку', async ({ page }) => {
  test.setTimeout(180_000)
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBackend(page)
  await page.goto('/?screen=practice')
  const grammar = page.locator('.pk-skill', { hasText: 'Грамматика' })
  await expect(grammar).toBeVisible({ timeout: 60_000 })
  await grammar.click()
  await page.locator('#sec-punctuation').click()
  await expect(page).toHaveURL(/screen=punctuation/)

  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  await expect(host.locator('.hero h1')).toHaveText('Punctuation World')
  await expect(host.locator('.isle-tab')).toHaveCount(5)

  // Урок: «Start · Learn · page 1» → секции; перевод — кнопкой Айзере, английский остаётся.
  await host.locator(`.hero .step-btn[data-go="#/lesson/${PAGE}"]`).click()
  await expect(host.locator('.l-head h1')).toHaveText(BUNDLE.LESSONS.TOPICS[0].title)
  await host.locator('.l-head [data-act="tr"][data-k="ru"]').click()
  await expect(host.locator('.punct')).toHaveAttribute('data-tr', 'ru')
  await expect(host.locator('.defcard .tr-ru')).toBeVisible()
  // «Fix it» раскрывает исправление.
  const fix = host.locator('[data-act="fix"]').first()
  await fix.click()
  await expect(fix).toHaveText('Fixed')
  // Полоса шагов — прокрутка внутри тени, адрес приложения прежний.
  const url = page.url()
  await host.locator('.stepnav a[href="#s-play"]').click()
  await expect(host.locator('.gate .playbtn')).toBeInViewport()
  expect(page.url()).toBe(url)
  await expect(page.locator('.asst__launcher')).toBeVisible()

  // «Play now» → приключение во всю колонку; кнопки Луны нет (она ложилась на камни).
  await host.locator('.gate .playbtn').click()
  await expect(host.locator('.adv.game')).toBeVisible()
  await expect(host).toHaveAttribute('data-game', '1')
  await expect(page.locator('.asst__launcher')).toBeHidden()
  await playAdventure(page)
  await expect(host.locator('.scard.win h1')).toHaveText('The lighthouse is lit!')
  await expect(host.locator('.scard.win .big-stars i.on')).toHaveCount(3)

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  // Страница прочитана и сыграна: отметка Learn и три звезды Play, звёзды в шапке раздела. Остров A1 пройден, и
  // главная открывает следующий (A2) — свой берём вкладкой.
  await expect(host.locator('.isle-tab[aria-selected="true"]')).toHaveAttribute('data-k', 'A2')
  await host.locator('.isle-tab[data-k="A1"]').click()
  const topic = host.locator(`.topic[data-go="#/lesson/${PAGE}"]`)
  await expect(topic.locator('.st-l.on')).toBeVisible()
  await expect(topic.locator('.st-p.on .stars i.on')).toHaveCount(3)
  await expect(host.locator('.top .pill b')).toHaveText('3')
  // Перевод — настройка устройства: пережил перезагрузку.
  await expect(host.locator('.punct')).toHaveAttribute('data-tr', 'ru')
  expect(pageErrors).toEqual([])
})

// Гостя приложение до экрана раздела не пускает: ?screen= без входа ведёт на приветствие с «Войти».
test('гость попадает на вход, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=punctuation')
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.pct-host')).toHaveCount(0)

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=punctuation')
  await expect(page2.locator('.pct-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки на главной, в уроке и в игре', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBackend(page)
  await page.goto('/?screen=punctuation')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.evaluate((id) => window.__punct.go(`#/lesson/${id}`), BUNDLE.LESSONS.TOPICS[1].id)
  await expect(host.locator('.l-head h1')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.evaluate((id) => window.__punct.go(`#/play/${id}`), PAGE)
  await expect(host.locator('#objs')).toBeVisible({ timeout: 15_000 })
  expect(await overflow()).toBeLessThanOrEqual(0)
})
