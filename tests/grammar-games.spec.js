import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// «Грамматика · игры» (?screen=grammar-games) без бэкенда: ручки /mobile/grammar-games/**
// отдают урезанную копию прототипа (src/practice/grammar-games/__fixtures__/bundle.json —
// шесть тем), сдача и «В словарь» подменены, /api/tts — тихий mp3. Верный ответ «Выбери
// форму» тест находит в фикстуре по тексту вопроса — как ученик, он видит только экран.
// Правильность наборов всех игр — оракул (engine.test.js), проход 125 тем — allTopics.test.js.

const BUNDLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'grammar-games', '__fixtures__', 'bundle.json'), 'utf8'))
const TOPIC = BUNDLE.topics['L1-01']
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

async function mockBackend(page, { indexStatus = 200, token = 'test-token' } = {}) {
  // Звёзды «сервера» — общие на вкладку: перезагрузка должна их показать.
  const server = { stars: {}, results: [], saved: [] }
  // Хранилище чистим один раз на вкладку: init-скрипт идёт и на перезагрузке.
  await page.addInitScript((tk) => {
    if (sessionStorage.getItem('e2e_gg_init')) return
    sessionStorage.setItem('e2e_gg_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/grammar-games', (r) => r.fulfill(indexStatus === 200 ? json(BUNDLE.index) : json({ messages: ['нет'] }, indexStatus)))
  await page.route('**/mobile/grammar-games/topics/*', (r) => {
    const id = decodeURIComponent(r.request().url().split('/').pop())
    return r.fulfill(BUNDLE.topics[id] ? json(BUNDLE.topics[id]) : json({ messages: ['нет'] }, 404))
  })
  await page.route('**/mobile/grammar-games/gloss', (r) => r.fulfill(json(BUNDLE.gloss)))
  await page.route('**/mobile/grammar-games/progress', (r) => r.fulfill(json({ stars: server.stars })))
  await page.route('**/mobile/grammar-games/result**', (r) => {
    const body = r.request().postDataJSON()
    server.results.push(body)
    const t = (server.stars[body.topicId] ||= {})
    const old = t[body.game] || 0
    t[body.game] = Math.max(old, body.stars)
    return r.fulfill(json({ best: t[body.game], coins: body.stars > old ? 2 : 0, balance: { coins: 10 } }))
  })
  await page.route('**/mobile/saved-words**', (r) => {
    server.saved.push(r.request().postDataJSON())
    return r.fulfill(json({ id: server.saved.length }))
  })
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
  return server
}

// JS-ошибки страницы и консоли. Отказы чужих ручек (без бэкенда фальшивый токен получает 401 у dev-сервера)
// — не ошибки раздела; ручки самого раздела подменены все, и их сбой в консоли тест ловит.
function watchErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const url = m.location()?.url || ''
    if (m.text().startsWith('Failed to load resource') && !/grammar-games/.test(url)) return
    errors.push(`console: ${m.text()} ${url}`)
  })
  return errors
}

const host = (page) => page.locator('.ggp-host')

async function answerPick(page) {
  const h = host(page)
  for (let i = 0; i < TOPIC.gap.length; i++) {
    await expect(h.locator('#blank')).toHaveText('?')
    const q = (await h.locator('.q').textContent()).trim()
    const g = TOPIC.gap.find((x) => q === x.s.replace('___', '?') + (x.h ? ` (${x.h})` : ''))
    expect(g, q).toBeTruthy()
    await h.locator('.opt').filter({ hasText: new RegExp(`^${reEsc(g.a)}$`) }).click()
  }
}

test('Практика → Письмо → тема → правило → «Выбери форму» до результата; звёзды переживают перезагрузку', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = watchErrors(page)
  const server = await mockBackend(page)
  await page.goto('/?screen=practice')
  const writing = page.locator('.pk-skill', { hasText: 'Письмо' })
  await expect(writing).toBeVisible({ timeout: 60_000 })
  await writing.click()
  await page.locator('.pk-banner--grammar-games .pk-banner__cta').click()
  await expect(page).toHaveURL(/screen=grammar-games/)
  const h = host(page)
  await expect(h).toHaveAttribute('data-topics', '6', { timeout: 30_000 })
  await expect(h).toHaveAttribute('data-source', 'api')
  // уровень профиля A2 → L3 (Д11)
  await expect(h.locator('.lvcard.on .big')).toHaveText('A2 → B1')

  await h.locator('.lvcard').first().click()
  await h.locator('.tcard:not(.soon)').first().click()
  await expect(h.locator('.thead h1')).toContainText('To be')

  // 3D-карточка раскрывается в окно
  await h.locator('.c3d').first().click()
  await expect(h.locator('.ov .modal')).toBeVisible()
  await h.locator('.ov .x').click()
  await expect(h.locator('.ov')).toHaveCount(0)

  // слово кликается: перевод RU/KZ и «В словарь»
  await h.locator('.gt td .w').first().click()
  await expect(h.locator('#pop .tr b').first()).toHaveText('RU')
  await h.locator('#pop button', { hasText: 'В словарь' }).click()
  await expect(h.locator('#pop button', { hasText: 'В словаре' })).toBeDisabled()
  expect(server.saved.length).toBeGreaterThan(0)

  await h.locator('.cta .btn').click()
  await h.locator('.gcard.g-pick').click()
  await answerPick(page)
  await expect(h.locator('.result .big .y')).toHaveCount(3)
  await expect(h.locator('.toast')).toHaveText('Монеты: +2')
  expect(server.results).toEqual([{ topicId: 'L1-01', game: 'pick', stars: 3 }])

  await h.locator('.gtop .back').click()
  await expect(h.locator('.gcard.g-pick .stars .y')).toHaveCount(3)

  await page.reload()
  await expect(h).toHaveAttribute('data-topics', '6', { timeout: 60_000 })
  await h.locator('.lvcard').first().click()
  // «⭐» прототипа на экране — картинка эмодзи (emojify), в тексте остаётся только счёт
  await expect(h.locator('.tcard:not(.soon) .prog').first()).toContainText(`3/${(BUNDLE.index.topics[0].games.length) * 3}`)
  await expect(h.locator('.tcard:not(.soon) .prog img.emj').first()).toHaveAttribute('alt', '⭐')
  await h.locator('.tcard:not(.soon)').first().click()
  await h.locator('.tabs button').nth(1).click()
  await expect(h.locator('.gcard.g-pick .stars .y')).toHaveCount(3)
  expect(errors).toEqual([])
})

test('ссылка на тему открывает её сразу', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/?screen=grammar-games&topic=L2-22')
  await expect(host(page).locator('.thead h1')).toBeVisible({ timeout: 60_000 })
  await host(page).locator('.tabs button').nth(1).click()
  // у L2-22 нет «Разложи по корзинам» — 11 игр
  await expect(host(page).locator('.gcard')).toHaveCount(11)
})

test('гость видит просьбу войти, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=grammar-games')
  await expect(page.locator('.ggp-state[data-status="guest"]')).toBeVisible({ timeout: 60_000 })

  const page2 = await page.context().newPage()
  await mockBackend(page2, { indexStatus: 404 })
  await page2.goto('/?screen=grammar-games')
  await expect(page2.locator('.ggp-state[data-status="missing"]')).toBeVisible({ timeout: 60_000 })
})

test('360px: хаб, правило и игра без горизонтальной прокрутки', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=grammar-games&topic=L1-10')
  const h = host(page)
  await expect(h.locator('.thead h1')).toBeVisible({ timeout: 60_000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow(), 'правило').toBeLessThanOrEqual(0)
  // иконка темы — эмодзи-картинка; мобильное правило прототипа для маскота прятало и её
  await expect(h.locator('.thead .ic img.emj')).toBeVisible()
  await h.locator('.tabs button').nth(1).click()
  for (const g of ['pick', 'place', 'race', 'boss']) {
    await h.locator(`.gcard.g-${g}`).click()
    await expect(h.locator('.stage')).toBeVisible()
    expect(await overflow(), g).toBeLessThanOrEqual(0)
    await h.locator('.gtop .back').click()
  }
  await h.locator('.back').first().click()
  await expect(h.locator('.levels')).toBeVisible()
  expect(await overflow(), 'хаб').toBeLessThanOrEqual(0)
})
