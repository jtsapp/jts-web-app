import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { mockGates } from './helpers/login.js'

// Parts of Speech World (?screen=partsofspeech) без бэкенда: /mobile/parts-of-speech отдаёт бандл копии прототипа
// (src/practice/partsofspeech/__fixtures__/bundle.json — все 16 юнитов и 14 дел), картинки /__partsofspeech-media/* —
// пиксель webp из той же копии. Правильность экранов, проверки ответов и итогов — оракул (engine.test.js); здесь —
// путь ученика в настоящем браузере и связь с приложением.

const FIX = path.join(__dirname, '..', 'src', 'practice', 'partsofspeech', '__fixtures__')
const BUNDLE = JSON.parse(fs.readFileSync(path.join(FIX, 'bundle.json'), 'utf8'))
const HTML = fs.readFileSync(path.join(FIX, 'prototype-mini.html'), 'utf8')
const WEBP = Buffer.from(HTML.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)[1], 'base64')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const U1 = BUNDLE.UNITS[0]
const A1 = U1.acts[0]
const C1 = BUNDLE.CASES.find((c) => c.unit === U1.id)

async function mockBackend(page, { bundleStatus = 200, token = 'test-token' } = {}) {
  // Чистим хранилище один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест как раз проверяет, что прогресс
  // её переживает.
  await page.addInitScript((tk) => {
    window.__POS_E2E = true
    if (sessionStorage.getItem('e2e_pos_init')) return
    sessionStorage.setItem('e2e_pos_init', '1')
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
  await page.route('**/mobile/parts-of-speech**', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__partsofspeech-media/**', (r) => r.fulfill({ status: 200, contentType: 'image/webp', body: WEBP }))
}

const shadow = (page) => page.locator('.pos-host')
const open = (page, hash) => page.evaluate((h) => window.__pos.go(h), hash)

/** Ответить верно на задания упражнения classify с from-го (верный вариант — из данных задания). */
function answerAct(page, actId, answers) {
  return page.evaluate(
    ({ actId, answers }) => {
      const body = document.querySelector('.pos-host').shadowRoot.querySelector(`[id="${actId}"] .act-b`)
      for (const a of answers) {
        ;[...body.querySelectorAll('.opt')].find((o) => o.dataset.v === a).click()
        body.querySelector('[data-role="check"]').click()
        body.querySelector('[data-role="next"]').click()
      }
    },
    { actId, answers },
  )
}

/** Пройти открытую стадию «разложи карточки» верными ответами; движок синхронный — одним вызовом в странице. */
function sortStage(page) {
  return page.evaluate(() => {
    const sh = document.querySelector('.pos-host').shadowRoot
    let n = 0
    for (;;) {
      const cur = window.__pos.stage()
      const item = sh.querySelector('.g-play .g-item')
      if (!item || cur.pos >= cur.queue.length) break
      ;[...item.querySelectorAll('.g-bin')].find((b) => b.dataset.b === cur.queue[cur.pos].a).click()
      sh.querySelector('.g-bar .btn').click()
      n++
    }
    return n
  })
}

test('Практика → Грамматика → Parts of Speech World → юнит → упражнение → дело → стадия; прогресс переживает перезагрузку', async ({ page }) => {
  test.setTimeout(150_000)
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await mockBackend(page)
  await page.goto('/?screen=practice')
  const grammar = page.locator('.pk-skill', { hasText: 'Грамматика' })
  await expect(grammar).toBeVisible({ timeout: 60_000 })
  await grammar.click()
  // Вся карточка — кнопка перехода; Parts of Speech World — в «Тренажёрах», после Punctuation World.
  await expect(page.locator('#sec-partsofspeech .pk-card__title')).toHaveText('Parts of Speech World')
  await page.locator('#sec-partsofspeech').click()
  await expect(page).toHaveURL(/screen=partsofspeech/)

  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  await expect(host.locator('.w-stop')).toHaveCount(9)
  // картинка — ссылкой бакета, файл настоящий: браузер её загрузил
  const hero = host.locator('.w-hero-img')
  await expect(hero).toHaveAttribute('src', BUNDLE.IMG.hero)
  await expect.poll(() => hero.evaluate((i) => i.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0)

  // Юнит — ссылкой карты; адрес приложения прежний (роутер раздела — свой).
  await host.locator(`.w-stop-u a[href="#${U1.id}"]`).click()
  await expect(host.locator('h1.topic .term-en')).toHaveText(U1.title.en)
  await expect(page).toHaveURL(/screen=partsofspeech$/)

  // Перевод — кнопками шапки: под английским абзацем появляется русский; интерфейс остаётся английским.
  await host.locator('.langs [data-lang="ru"]').click()
  await expect(host.locator('.u-def .trl[lang="ru"]')).toBeVisible()
  await host.locator('.langs [data-lang="en"]').click()
  await expect(host.locator('.u-def .trl')).toHaveCount(0)

  // Практика: первое задание — руками, остальное — верными ответами.
  await host.locator('.mode-b.mode-p').click()
  const act = host.locator(`[id="${A1.id}"]`)
  await act.locator('.opt', { hasText: new RegExp(`^${A1.items[0].a}$`) }).click()
  await act.locator('[data-role="check"]').click()
  await expect(act.locator('.fb.good')).toBeVisible()
  await act.locator('[data-role="next"]').click()
  await answerAct(page, A1.id, A1.items.slice(1).map((it) => it.a))
  await expect(act.locator('.done-card .big')).toHaveText(`${A1.items.length} / ${A1.items.length}`)
  await expect(host.locator('.step.done .step-s')).toHaveText(`${A1.items.length} / ${A1.items.length}`)

  // Квест острова: «How to play» при первом знакомстве с механикой, затем стадия — первая карточка руками.
  await host.locator('.tabs a[data-tab="play"]').click()
  await expect(host.locator('.q-hero h1')).toHaveText('Quests')
  await host.locator(`a.g-case[href="#case-${C1.id}"]`).click()
  await expect(host.locator('.g-banner h1')).toHaveText(C1.title)
  expect(C1.stages[0].type).toBe('sort')
  await host.locator('.g-how-go').click()
  const first = C1.stages[0].items[0]
  await host.locator(`.g-bin[data-b="${first.a}"]`).click()
  await expect(host.locator('.g-fb.good')).toBeVisible()
  await host.locator('.g-bar .btn').click()
  expect(await sortStage(page)).toBe(C1.stages[0].items.length - 1)
  await expect(host.locator('.g-done .kicker')).toHaveText('Stage complete')
  await expect(host.locator('.g-steps li.done')).toHaveCount(1)

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30_000 })
  // карта помнит начатое: кнопка «Continue», квесты — «1/N» у дела
  await expect(host.locator('.w-hero .btn-xl').first()).toContainText('Continue')
  await open(page, '#bureau')
  await expect(host.locator(`a.g-case[href="#case-${C1.id}"] .g-case-s`)).toHaveText(`1/${C1.stages.length}`)
  await open(page, `#${U1.id}-practice`)
  await expect(host.locator('.step.done')).toHaveCount(1)
  await open(page, `#case-${C1.id}`)
  await expect(host.locator('.g-steps li.done')).toHaveCount(1)
  // «How to play» этой механики уже видели — вторая стадия открывается сразу со своей
  await expect(host.locator('.g-stage-h h2')).toHaveText(C1.stages[1].title)
  expect(pageErrors).toEqual([])
})

// Гостя приложение до экрана раздела не пускает: ?screen= без входа ведёт на приветствие с «Войти».
test('гость попадает на вход, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=partsofspeech')
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.pos-host')).toHaveCount(0)

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=partsofspeech')
  await expect(page2.locator('.pos-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки на карте, в уроке, в упражнении, в квестах и в стадии', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=partsofspeech')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  // урок с таблицами и островом с точками-словами
  await open(page, '#u02')
  await expect(host.locator('.isle-x')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  await open(page, '#u08-practice')
  await expect(host.locator('.steps')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  await open(page, '#bureau')
  await expect(host.locator('.q-board')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  // дело с планом улицы — самая широкая сцена
  const map = BUNDLE.CASES.find((c) => c.stages[0].type === 'map')
  await open(page, `#case-${map.id}`)
  await host.locator('.g-how-go').click()
  await expect(host.locator('.g-plan')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
  // дело c14 — его сцена приходит без svg (в прототипе у неё только подсказки): три огонька на картинке острова
  expect(BUNDLE.SCENES.c14.svg).toBeUndefined()
  await open(page, '#case-c14')
  await expect(host.locator('.g-banner h1')).toHaveText(BUNDLE.CASES.find((c) => c.id === 'c14').title)
  await expect(host.locator('.g-scene .g-clue')).toHaveCount(3)
  expect(await overflow()).toBeLessThanOrEqual(0)
  // шторка карты (кнопка «Map» есть в уроке) открывается внутри колонки раздела
  await open(page, '#u02')
  await host.locator('#menuBtn').click()
  await expect(host.locator('nav.side.open')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
})
