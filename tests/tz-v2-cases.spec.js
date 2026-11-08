import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { gateReply } from './helpers/login.js'

// ТЗ v2.0 «Луна-трекер», раздел 10 «Тест-кейсы» — то, что проверяется экраном (этап 5). Номер кейса — в имени теста
// (`кейс 3`, `кейс 17`…); сводка, чем покрыт каждый из 44, — docs/assistant-eval/tz-v2-test-cases.md. Остальные экранные
// кейсы уже стоят в своих спеках: 4 и 5 — ge-plan.spec.js, 19 и 28 (правая колонка), 37 (домашка) — home-tz-v2.spec.js,
// события Луны 1, 11, 13 — assistant-proactive.spec.js. Бэкенд и модель подменены: проверяется экран, а не Claude.
// Матрица: три формата (с преподавателем, Self Study, демо), три языка, 1440 / 834 / 390. IELTS не трогаем (решение 10),
// телефон — своя раскладка по приложению (решение 6): на 390 проверяется, что ничего не сломано, а не макет ТЗ.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const pad = (n) => String(n).padStart(2, '0')
const NOW = new Date()
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayShift = (n) => isoDay(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + n))
const at = (days, hh = 18) => `${dayShift(days)}T${pad(hh)}:00:00`
const today = dayShift(0)
// понедельник: «просроченное этой недели» до него не дотягивается
const isMonday = NOW.getDay() === 1

const ALL_SECTIONS = ['lessons', 'homework', 'practice', 'speaking', 'vocabulary', 'review', 'grammar', 'speed']
const SECTIONS = {
  teacher: { known: true, tariff: 'GENERAL', format: 'GROUP', allowed: ALL_SECTIONS },
  self: { known: true, tariff: 'SELF', format: 'SELF', allowed: ['practice', 'speaking', 'vocabulary', 'review', 'grammar', 'speed'] },
  demo: { known: false, allowed: [] },
}

const profile = (format) => ({
  onboarded: true,
  purpose: 'travel',
  targetLevel: 'B2',
  fromLevel: 'B1',
  dailyMinutes: 45,
  deadlineWindow: 'none',
  route: format === 'teacher' ? 'group' : 'self_study',
  deadline: { state: 'days', date: isoDay(new Date(NOW.getTime() + 160 * 86400000)), daysRemaining: 160, approximate: false },
  journey: { start: 'A2', current: { level: 'B1', percent: 8 }, target: 'B2', reached: false },
})

// Данные — латиницей: на английском интерфейсе кириллица на экране — только из словаря, а не из фикстур (кейс 17).
const DAY = [
  { id: 1, date: today, kind: 'course', module: null, minutes: 30, got: 0, status: 'available', overdue: false, movable: true },
  { id: 2, date: today, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 6, status: 'in_progress', overdue: false, movable: true },
  { id: 3, date: today, kind: 'practice', module: 'vocabulary_sr', minutes: 10, got: 10, status: 'completed', overdue: false, movable: false },
  { id: 5, date: today, kind: 'custom', origin: 'teacher', module: null, minutes: 20, got: 0, status: 'available', overdue: false, movable: false, title: 'Watch an episode', extra: { title: 'Watch an episode' } },
]
const planOf = (tasks) => ({
  shortDay: null, stopDay: null, today, state: 'ready', route: 'self_study', dailyMinutes: 45, planStart: today, planUntil: dayShift(7),
  liveMissing: false, week: { done: 2, total: 12 }, tasks,
})

const homework = [
  { id: 41, title: 'My neighbourhood, now and usually', status: 'ASSIGNED', dueDate: '2026-08-18', exercises: [] },
  { id: 42, title: 'How many friends do you really have?', status: 'ASSIGNED', dueDate: dayShift(3), exercises: [{ id: 1 }, { id: 2 }] },
  { id: 43, title: 'Homework from lesson 15.10', status: 'SUBMITTED' },
]
const occurrences = [{ lessonId: 501, teacherName: 'Aigerim', durationMinutes: 60, lessonStatus: 'SCHEDULED', scheduledAt: at(2) }]

// Навыки уровня B1 (/api/skills): у каждого не меньше пяти заданий — проценты, а не «мало данных».
const LEVEL_STATS = {
  listening: { done: 20, firstTry: 11 },
  speaking: { done: 10, firstTry: 6 },
  reading: { done: 8, firstTry: 6 },
  writing: { done: 10, firstTry: 4 },
  grammar: { done: 25, firstTry: 12 },
  vocab: { done: 20, firstTry: 9 },
}
const SHARE = Object.fromEntries(Object.entries(LEVEL_STATS).map(([k, v]) => [k, Math.round((v.firstTry / v.done) * 100)]))

async function setup(page, { format = 'teacher', lang = 'ru', tasks = DAY, chat = null, planExtra = null } = {}) {
  const demo = format === 'demo'
  const me = { userId: 7, name: 'Saken', role: 'USER', languageLevel: 'B1', isDemoAccount: demo, phone: '77001234567' }
  await page.addInitScript(
    ([token, l]) => {
      localStorage.setItem('jts_access_token', token)
      localStorage.setItem('jts_tours_off', '1')
      localStorage.setItem('lang', l)
    },
    [jwt, lang],
  )
  const calls = { chat: [] }
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    if (url.includes('/cabinet/my-sections')) return route.fulfill(json(SECTIONS[format]))
    const gate = gateReply(url)
    if (gate) return route.fulfill(json(gate))
    if (url.includes('/mobile/ge/plan')) return route.fulfill(json({ ...planOf(tasks), ...planExtra }))
    if (url.includes('/mobile/ge/profile')) return route.fulfill(json(profile(format)))
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'B1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'B1', next: 'B2', track: 'SELF_STUDY', percent: 8, done: 3, total: 36, remaining: 33 }))
    }
    if (url.includes('/mobile/lesson-modules') && url.includes('/progress')) return route.fulfill(json({ done: ['L1', 'L2', 'L3'], total: 36 }))
    if (url.includes('/mobile/lesson-modules')) return route.fulfill(json([{ id: 5, level: 'B1', orderIndex: 0 }]))
    if (url.includes('/admin/lessons/occurrences')) return route.fulfill(json(format === 'teacher' ? occurrences : []))
    if (url.includes('/admin/lessons/summary')) return route.fulfill(json({ conducted: 7, remaining: 9, cancelled: 0, rescheduled: 1 }))
    if (url.includes('/admin/homework/my')) return route.fulfill(json(format === 'teacher' ? homework : []))
    if (url.includes('/student/assignments')) return route.fulfill(json([]))
    if (url.includes('/mobile/trial-request')) return route.fulfill(json({ requested: false, managerAssigned: false }))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
  await page.route('**/api/skills**', (route) => route.fulfill(json({ stats: LEVEL_STATS, levelStats: LEVEL_STATS })))
  // Модель недоступна (кейс 22) или не нужна: окно Луны само ничего не придумывает — ответ задаёт тест.
  await page.route('**/api/assistant/chat', async (route) => {
    calls.chat.push(JSON.parse(route.request().postData() || '{}'))
    if (chat) return route.fulfill(chat)
    return route.fulfill(json({ error: 'model_failed' }, 502))
  })
  await page.route('**/api/assistant/speak', (route) => route.fulfill(json({ error: 'off' }, 503)))
  return calls
}

const learnText = (page) => page.locator('.learn').first().innerText()

// ── кейс 3: есть просрочки ────────────────────────────────────────────────────────────────────────────────────────
test('кейс 3: просроченный урок стоит первым, «всё сделано» не пишется', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне блока «Сегодня» нет (решение 6)')
  test.skip(isMonday, 'в понедельник просроченного этой недели не бывает')
  const overdue = { id: 10, date: dayShift(-1), kind: 'course', module: null, minutes: 30, got: 0, status: 'available', overdue: true, movable: true }
  await setup(page, { tasks: [overdue, ...DAY] })
  await page.goto('/?screen=home')
  const card = page.locator('.ge-today')
  await expect(card).toBeVisible({ timeout: 20000 })
  const first = card.locator('.ge-task').first()
  await expect(first).toHaveClass(/is-course/)
  await expect(first.locator('.ge-task__chip.is-late')).toBeVisible()
  await expect(first.getByRole('button', { name: 'Начать' })).toBeVisible()
  await expect(card).not.toContainText('На сегодня всё сделано')
  // домашка: просроченная работа — первой, с меткой
  await expect(page.locator('.hm-tl .hm-blk__st').first()).toHaveText('Просрочено')
})

// ── кейс 17: язык KZ / EN — весь экран на выбранном языке ────────────────────────────────────────────────────────
const CYRILLIC = /[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/
// Подвал «Покупателям» (страницы Freedom Pay): у английского интерфейса — русские ссылки по решению владельца 08.11.2026.
const BUYER_PAGES_RU = ['Тарифы и цены', 'Оплата и получение доступа', 'Возврат средств', 'Контакты и реквизиты']
// Русские подписи «Главной», плана и подвала, которых в казахском словаре быть не должно.
const RU_MARKERS = [
  'Сегодня', 'Начать', 'Продолжить', 'Весь план', 'Ближайшее', 'Уроки с преподавателем', 'Сильные и слабые', 'Свободная практика',
  'Откроется', 'Зачем', 'мало времени', 'Результаты теста', 'Подключиться', 'Осталось уроков', 'Просрочено',
  'Тарифы и цены', 'Оплата и получение доступа', 'Возврат средств', 'Контакты и реквизиты',
]

for (const format of ['teacher', 'self', 'demo']) {
  test(`кейс 17: английский интерфейс, ${format} — на «Главной» и в плане нет кириллицы`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'компьютер; планшет — ниже, телефон — своя раскладка')
    await setup(page, { format, lang: 'en' })
    // все строки с кириллицей с обоих экранов и ширин — одним списком: падение сразу показывает всё. Ссылки подвала
    // «Покупателям» на английском интерфейсе — русские страницы: английских не делаем (решение владельца 08.11.2026,
    // «Оставить русские»; Footer.jsx, 50b391c6)
    const found = {}
    const cyr = async (key) => {
      found[key] = (await learnText(page)).split('\n').filter((l) => CYRILLIC.test(l) && !BUYER_PAGES_RU.includes(l.trim()))
    }
    for (const [w, h] of [[1440, 900], [834, 1112]]) {
      await page.setViewportSize({ width: w, height: h })
      await page.goto('/?screen=home')
      await expect(page.locator('.ge-today')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.hm-skills')).toBeVisible()
      await cyr(`home-${w}`)
    }
    await page.goto('/?screen=ge-plan')
    await expect(page.locator('.ge-plan')).toBeVisible({ timeout: 20000 })
    await cyr('plan')
    expect(found).toEqual({ 'home-1440': [], 'home-834': [], plan: [] })
  })

  test(`кейс 17: казахский интерфейс, ${format} — без русских подписей`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'компьютер; телефон — своя раскладка')
    await setup(page, { format, lang: 'kk' })
    const found = {}
    for (const [w, h] of [[1440, 900], [834, 1112]]) {
      await page.setViewportSize({ width: w, height: h })
      await page.goto('/?screen=home')
      await expect(page.locator('.ge-today')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.hm-skills')).toBeVisible()
      const text = await learnText(page)
      found[`home-${w}`] = RU_MARKERS.filter((w2) => text.includes(w2))
    }
    await page.goto('/?screen=ge-plan')
    await expect(page.locator('.ge-plan')).toBeVisible({ timeout: 20000 })
    const plan = await learnText(page)
    found.plan = RU_MARKERS.filter((w2) => plan.includes(w2))
    expect(found).toEqual({ 'home-1440': [], 'home-834': [], plan: [] })
  })
}

// ── кейс 43: везде «ты» (RU) / «сен» (KZ) ─────────────────────────────────────────────────────────────────────────
// Те же проверки, что зонд делает на ответах Луны (scripts/assistant-eval/run.js): «вы»-местоимения и повелительное
// на -ите/-йте; у казахского — «сіз» и вежливое -ңыз/-ңіз.
const FORMAL = /(^|[^а-яё])(вы|вас|вам|вами|ваш|ваша|ваше|ваши|вашего|вашей|вашему|вашим|ваших|вашу)(?=[^а-яё]|$)/i
const IMPERATIVE_V = /[а-яё]{3,}(ите|йте)(?=[^а-яё]|$)/gi
const NOT_IMPERATIVE = new Set(['сайте', 'защите', 'элите', 'граните', 'аппетите', 'алфавите', 'визите', 'кредите', 'орбите', 'плите', 'транзите'])
const SIZ = /(^|[^а-яәіңғүұқөһ])(сіз|сізге|сізді|сіздің|сізбен|сізде|сізден|сіздер)(?=[^а-яәіңғүұқөһ]|$)/i
const POLITE_KK = /[а-яәіңғүұқөһ]{2,}(ыңыз|іңіз|ңыз|ңіз|ыңыздар|іңіздер)(?=[^а-яәіңғүұқөһ]|$)/gi

function formalLines(text, lang) {
  return text.split('\n').filter((line) => {
    if (lang === 'kk') return SIZ.test(line) || (line.match(POLITE_KK) || []).length > 0
    if (FORMAL.test(line)) return true
    return (line.match(IMPERATIVE_V) || []).some((w) => !NOT_IMPERATIVE.has(w.toLowerCase()))
  })
}

for (const lang of ['ru', 'kk']) {
  for (const format of ['teacher', 'self', 'demo']) {
    test(`кейс 43: обращение на «${lang === 'ru' ? 'ты' : 'сен'}» — «Главная» и «Мой план», ${format}`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'тексты одни на всех ширинах; телефон — другие карточки, своя проверка ниже')
      await setup(page, { format, lang })
      await page.goto('/?screen=home')
      await expect(page.locator('.ge-today')).toBeVisible({ timeout: 20000 })
      await expect(page.locator('.hm-skills')).toBeVisible()
      const home = formalLines(await learnText(page), lang)
      await page.goto('/?screen=ge-plan')
      await expect(page.locator('.ge-plan')).toBeVisible({ timeout: 20000 })
      const plan = formalLines(await learnText(page), lang)
      expect({ home, plan }).toEqual({ home: [], plan: [] })
    })
  }
}

// ── кейсы 19 и 44: формат ученика — меню и готовые вопросы Луны ──────────────────────────────────────────────────
const CHIPS = {
  teacher: { has: ['Как перенести урок?', 'Где мои домашки?'], not: ['Как записаться на пробный урок?'] },
  self: { has: ['Что мне делать сегодня?'], not: ['Как перенести урок?', 'Где мои домашки?'] },
  demo: { has: ['Как записаться на пробный урок?'], not: ['Как перенести урок?', 'Где мои домашки?'] },
}
for (const format of ['teacher', 'self', 'demo']) {
  test(`кейс 19: ${format} — «Уроки» и «Домашняя работа» в меню только с преподавателем`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'меню телефона — нижняя панель по макету приложения (решение 6)')
    await setup(page, { format })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-today')).toBeVisible({ timeout: 20000 })
    // ТЗ 4.2: у Self Study этих пунктов нет, у демо — как у Self Study. Демо здесь — без ответа о разделах тарифа
    // (known: false), как в home-tz-v2.spec.js.
    const menu = page.locator('.sb')
    const shown = async (key) => (await menu.locator(`[data-nav="${key}"]`).count()) > 0
    await expect(menu.locator('[data-nav="home"]')).toBeVisible()
    const want = format === 'teacher'
    expect({ lessons: await shown('lessons'), homework: await shown('homework') }).toEqual({ lessons: want, homework: want })
  })

  test(`кейс 44: ${format} — готовые вопросы Луны по формату`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'окно на телефоне — лист снизу; набор вопросов тот же')
    await setup(page, { format })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-today')).toBeVisible({ timeout: 20000 })
    // готовые вопросы окна: открытие окна ушло модели, модель недоступна — под приветствием вопросы формата
    await page.getByRole('button', { name: 'Помощник' }).click()
    const dialog = page.getByRole('dialog', { name: 'Луна' })
    const chips = dialog.locator('.asst__chip')
    await expect(chips.first()).toBeVisible({ timeout: 15000 })
    const labels = await chips.allInnerTexts()
    for (const c of CHIPS[format].has) expect(labels, `${format}: есть «${c}»`).toContain(c)
    for (const c of CHIPS[format].not) expect(labels, `${format}: нет «${c}»`).not.toContain(c)
  })
}

// ── кейс 22: LLM недоступен ───────────────────────────────────────────────────────────────────────────────────────
test('кейс 22: модель недоступна — приветствие шаблоном, на вопрос — плашка с повтором, экран цел', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  // первая реплика не пришла — окно не пустое и без плашки: обычное приветствие и вопросы
  await expect(dialog.locator('.asst__chip').first()).toBeVisible({ timeout: 15000 })
  await expect(dialog.locator('.asst__msg').first()).toBeVisible()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  expect(calls.chat.length).toBeGreaterThan(0)
  // свой вопрос — плашка с повтором, окно и экран работают
  const box = dialog.getByRole('textbox')
  await box.fill('Что мне делать сегодня?')
  await box.press('Enter')
  const alert = dialog.getByRole('alert')
  await expect(alert).toBeVisible({ timeout: 15000 })
  await expect(alert.getByRole('button')).toBeVisible()
  await expect(page.locator('.hm--v2, .hm').first()).toBeVisible()
})

// ── кейс 21: планшет и телефон — без горизонтальной прокрутки ─────────────────────────────────────────────────────
for (const [w, h] of [[834, 1112], [390, 844]]) {
  test(`кейс 21: ${w} px — «Главная», «Мой план» и окно Луны без горизонтальной прокрутки`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'ширину задаём сами')
    await page.setViewportSize({ width: w, height: h })
    await setup(page)
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    await page.goto('/?screen=home')
    await expect(page.locator(w > 560 ? '.ge-today' : '.hm').first()).toBeVisible({ timeout: 20000 })
    expect(await overflow(), 'Главная').toBeLessThanOrEqual(1)
    await page.goto('/?screen=ge-plan')
    await expect(page.locator('.ge-plan')).toBeVisible({ timeout: 20000 })
    expect(await overflow(), 'Мой план').toBeLessThanOrEqual(1)
    await page.goto('/?screen=home')
    await page.getByRole('button', { name: 'Помощник' }).click()
    await expect(page.getByRole('dialog', { name: 'Луна' })).toBeVisible()
    expect(await overflow(), 'окно Луны').toBeLessThanOrEqual(1)
  })
}

// ── кейс 23: Главная и «Мой план» — одни шаги и минуты ────────────────────────────────────────────────────────────
test('кейс 23: «Сегодня» и «Мой план» показывают одни задачи с одними минутами', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне блока «Сегодня» нет (решение 6)')
  await setup(page)
  await page.goto('/?screen=home')
  const today = page.locator('.ge-today')
  await expect(today.locator('.ge-task')).toHaveCount(3, { timeout: 20000 })
  // подпись урока курса — по тропе, она доезжает после плана: сравниваем, когда доехала на обоих экранах
  await expect(today.locator('.ge-task.is-course .ge-task__body > b')).toContainText('Урок:')
  const rows = async (loc) =>
    loc.locator('.ge-task').evaluateAll((els) => els.map((e) => ({ title: e.querySelector('b').textContent, meta: e.querySelector('.ge-task__meta').textContent })))
  const home = await rows(today)
  await page.goto('/?screen=ge-plan')
  const panel = page.getByRole('complementary', { name: 'Задачи дня' })
  await expect(panel.locator('.ge-task.is-course .ge-task__body > b')).toContainText('Урок:', { timeout: 20000 })
  const plan = await rows(panel)
  // в «Моём плане» сверх того — задача преподавателя; свои — те же названия, и минуты из строки «Сегодня» есть в плане
  for (const r of home) {
    const twin = plan.find((p) => p.title === r.title)
    expect(twin, `в плане есть «${r.title}»`).toBeTruthy()
    const min = /(\d+ \/ )?\d+ мин/.exec(r.meta)?.[0]
    expect(twin.meta, `минуты «${r.title}»`).toContain(min)
  }
  expect(plan.length).toBe(home.length + 1)
})

// ── кейс 20: «Стоит подтянуть» попадает в план ────────────────────────────────────────────────────────────────────
// План собирает бэкенд: разделу слабого навыка он дал больше практики и отдаёт plan.focus. Экран это объясняет: у шага —
// «Зачем» про слабый навык, медиа при слабом аудировании ведёт во вкладку «Аудирование», плитка — «Аудирование».
test('кейс 20: фокус плана — «Зачем» про слабый навык, «Откроется» и плитка «Аудирование»', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне блока «Сегодня» нет (решение 6)')
  const tasks = [
    { id: 21, date: today, kind: 'practice', module: 'media_practice', minutes: 20, got: 0, status: 'available', overdue: false, movable: true },
    ...DAY,
  ]
  await setup(page, { tasks, planExtra: { focus: { skill: 'listening', module: 'media_practice', since: today } } })
  await page.goto('/?screen=home')
  const row = page.locator('.ge-today .ge-task').first()
  await expect(row).toBeVisible({ timeout: 20000 })
  await expect(row.locator('.ge-task__why')).toHaveText('Зачем: Аудирование у тебя сейчас слабее остальных навыков, поэтому в плане на неделю на него больше времени.')
  await expect(row.locator('.ge-task__opens')).toHaveText('Откроется: Практика → Аудирование')
  await expect(row.locator('.ge-task__meta')).toContainText('Аудирование · 20 мин')
  await page.getByRole('button', { name: 'По навыкам' }).click()
  await expect(page.locator('.ge-sk__tile').filter({ hasText: 'Аудирование' })).toHaveCount(1)
})

// ── кейс 36: Главная и Профиль — одинаковые % ─────────────────────────────────────────────────────────────────────
test('кейс 36: проценты навыков на «Главной» и в Профиле совпадают', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне — другие карточки; расчёт общий')
  await setup(page)
  await page.goto('/?screen=home')
  const skills = page.locator('.hm-skills .hm-skill')
  await expect(skills).toHaveCount(6, { timeout: 20000 })
  await expect(skills.first().locator('.hm-skill__pct')).toHaveText(/%$/)
  const home = Object.fromEntries(
    await skills.evaluateAll((els) => els.map((e) => [e.querySelector('.hm-skill__name').textContent, e.querySelector('.hm-skill__pct').textContent])),
  )
  await page.goto('/?screen=profile')
  const rows = page.locator('.pf-skills .pf-skill')
  await expect(rows).toHaveCount(6, { timeout: 20000 })
  const prof = Object.fromEntries(
    await rows.evaluateAll((els) => els.map((e) => [e.querySelector('.pf-skill__name').textContent, e.querySelector('.pf-skill__meta').textContent])),
  )
  for (const [name, pct] of Object.entries(home)) expect(prof[name], name).toContain(pct)
  // и это те же цифры, что считает формула уровня (levelShare)
  expect(home['Говорение']).toBe(`${SHARE.speaking}%`)
})
