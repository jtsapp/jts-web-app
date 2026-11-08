import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { gateReply } from './helpers/login.js'

// Новая «Главная» по ТЗ v2.0 «Луна-трекер» (разделы 5.1 и 5.4–5.7) на трёх форматах ученика: с преподавателем, Self Study
// и демо. Бэкенд подменён — проверяем сам экран: баннер ниже и «урок N из M», справа «Уроки с преподавателем» или
// «Ближайшее», ссылка на отчёт теста вместо самого отчёта, четыре плитки практики в ряд, раскладка планшета и что
// телефон остался прежним. HOME_SHOTS=<папка> — снять скриншоты (1440 и 834, ru и kk).

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.HOME_SHOTS

const pad = (n) => String(n).padStart(2, '0')
const NOW = new Date()
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const at = (days, hh = 18) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days)
  return `${isoDay(d)}T${pad(hh)}:00:00`
}
const today = isoDay(NOW)
const B1_LESSONS = JSON.parse(fs.readFileSync('public/course/b1/index.json', 'utf8')).lessons.length

const ALL_SECTIONS = ['lessons', 'homework', 'practice', 'speaking', 'vocabulary', 'review', 'grammar', 'speed']
const SECTIONS = {
  teacher: { known: true, tariff: 'GENERAL', format: 'GROUP', allowed: ALL_SECTIONS },
  self: { known: true, tariff: 'SELF', format: 'SELF', allowed: ['practice', 'speaking', 'vocabulary', 'review', 'grammar', 'speed'] },
  demo: { known: false, allowed: [] },
}

function profile(format) {
  return {
    onboarded: true,
    purpose: 'travel',
    targetLevel: 'B2',
    fromLevel: 'B1',
    dailyMinutes: 45,
    deadlineWindow: 'none',
    route: format === 'teacher' ? 'group' : 'self_study',
    deadline: { state: 'days', date: isoDay(new Date(NOW.getTime() + 160 * 86400000)), daysRemaining: 160, approximate: false },
    journey: { start: 'A2', current: { level: 'B1', percent: 8 }, target: 'B2', reached: false },
  }
}

const plan = {
  shortDay: null,
  today,
  state: 'ready',
  route: 'self_study',
  dailyMinutes: 45,
  planStart: today,
  planUntil: today,
  liveMissing: false,
  week: { done: 2, total: 12 },
  tasks: [
    { id: 1, date: today, kind: 'course', module: null, minutes: 30, got: 0, status: 'available', overdue: false, movable: true },
    { id: 2, date: today, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 6, status: 'in_progress', overdue: false, movable: true },
    { id: 3, date: today, kind: 'practice', module: 'vocabulary_sr', minutes: 10, got: 10, status: 'completed', overdue: false, movable: false },
    { id: 5, date: today, kind: 'custom', origin: 'teacher', module: null, minutes: 20, got: 0, status: 'available', overdue: false, movable: false, title: 'Посмотри серию', extra: { title: 'Посмотри серию' } },
  ],
}

const homework = [
  { id: 41, title: 'My neighbourhood, now and usually', status: 'ASSIGNED', dueDate: '2026-08-18', exercises: [] },
  { id: 42, title: 'How many friends do you really have?', status: 'ASSIGNED', dueDate: isoDay(new Date(NOW.getTime() + 3 * 86400000)), exercises: [{ id: 1 }, { id: 2 }] },
  { id: 43, title: 'Homework from lesson 15.10', status: 'SUBMITTED' },
  { id: 44, title: 'Unit 3 review', status: 'COMPLETED', grade: 5 },
]

const occurrences = [
  { lessonId: 501, teacherName: 'Айгерим', durationMinutes: 60, lessonStatus: 'SCHEDULED', scheduledAt: at(2) },
  { lessonId: 502, teacherName: 'Айгерим', durationMinutes: 60, lessonStatus: 'SCHEDULED', scheduledAt: at(4) },
]

async function setup(page, { format, lang = 'ru' }) {
  const demo = format === 'demo'
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'B1', isDemoAccount: demo, phone: '77001234567' }
  const envelope = JSON.parse(fs.readFileSync('src/placement/__fixtures__/envelope-b1.json', 'utf8'))
  envelope.assessment.completedAt = `${NOW.getFullYear()}-10-20T10:00:00Z`
  await page.addInitScript(
    ([token, l]) => {
      localStorage.setItem('jts_access_token', token)
      localStorage.setItem('jts_tours_off', '1')
      localStorage.setItem('lang', l)
    },
    [jwt, lang],
  )
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    if (url.includes('/cabinet/my-sections')) return route.fulfill(json(SECTIONS[format]))
    const gate = gateReply(url)
    if (gate) return route.fulfill(json(gate))
    if (url.includes('/mobile/ge/plan')) return route.fulfill(json(plan))
    if (url.includes('/mobile/ge/profile')) return route.fulfill(json(profile(format)))
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'B1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'B1', next: 'B2', track: 'SELF_STUDY', percent: 8, done: 3, total: 36, remaining: 33 }))
    }
    if (url.includes('/mobile/lesson-modules') && url.includes('/progress')) return route.fulfill(json({ done: ['L1', 'L2', 'L3'], total: B1_LESSONS }))
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
  await page.route('**/api/placement/attempts', (route) => route.fulfill(json({ envelope })))
}

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}
const boxOf = (loc) => loc.boundingBox()

for (const format of ['teacher', 'self', 'demo']) {
  test(`компьютер, ${format}: баннер ~230, правая колонка по формату, отчёт теста — ссылкой`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'компьютер; телефон — отдельным тестом')
    await setup(page, { format })
    await page.goto('/?screen=home')
    const banner = page.locator('.ge-goal')
    await expect(banner).toBeVisible({ timeout: 20000 })
    await expect(banner.locator('.ih-gb__nowtag')).toHaveText(`Сейчас · урок 4 из ${B1_LESSONS}`)
    // облачко — от прогресса дня: 10 мин словаря + 6 мин тьютора
    await expect(banner.locator('.ih-gb__bubble')).toHaveText('Сегодня уже 16 мин. Так держать!')
    const h = (await boxOf(banner)).height
    expect(h).toBeGreaterThan(200)
    expect(h).toBeLessThan(270)

    if (format === 'teacher') {
      const block = page.locator('.hm-tl')
      await expect(block).toBeVisible()
      await expect(page.locator('.hm-near')).toHaveCount(0)
      await expect(block.locator('.hm-week__day')).toHaveCount(7)
      await expect(block.locator('.hm-week__day.has-lesson')).toHaveCount(2)
      await expect(block.getByRole('button', { name: 'Подключиться' })).toBeEnabled()
      await expect(block).toContainText('Осталось уроков: 9')
      await expect(block).toContainText('От преподавателя в плане на сегодня: 1')
      await expect(block.locator('.hm-blk__row')).toHaveCount(3)
      await expect(block.locator('.hm-blk__st').first()).toHaveText('Просрочено')
      await expect(block.getByRole('button', { name: 'Открыть' })).toHaveCount(2)
      // значок меню — просроченные и заданные
      await expect(page.locator('.sb [data-nav="homework"] .sb__badge')).toHaveText('2')
    } else {
      const near = page.locator('.hm-near')
      await expect(near).toBeVisible()
      await expect(page.locator('.hm-tl')).toHaveCount(0)
      await expect(near.locator('.hm-week__day')).toHaveCount(7)
      if (format === 'demo') await expect(near.locator('.hm-near__trial')).toContainText('Пробный урок — бесплатно')
      await expect(near).toContainText('Review test · Unit 1')
      await expect(near).toContainText('30 вопросов · можно пройти сейчас')
    }
    // «Нет уроков» по дням и длинный отчёт теста с «Главной» ушли (ТЗ 5.7)
    await expect(page.getByText('Нет уроков')).toHaveCount(0)
    await expect(page.locator('.pl-report, .pl-next')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Пройти тест заново' })).toHaveCount(0)
    await expect(page.locator('.hm-skills__src')).toContainText('Уровень B1 (тест 20 октября)')

    // «Свободная практика» — четыре плитки в одну строку
    const tiles = page.locator('.hm-prac__tile')
    await expect(tiles).toHaveCount(4)
    const tops = await tiles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
    await shot(page, `home-${format}-1440-ru`)

    await page.getByRole('button', { name: 'Результаты теста →' }).click()
    await expect(page.locator('.pl-report__level')).toHaveText('B1', { timeout: 20000 })
    await expect(page).toHaveURL(/screen=placement-results/)
    await expect(page.getByRole('button', { name: 'Пройти тест заново' })).toHaveCount(0)
    if (format === 'teacher') await shot(page, 'results-1440-ru')
    await page.getByRole('button', { name: '← На главную' }).click()
    await expect(page.locator('.ge-goal')).toBeVisible()
  })

  test(`планшет 834, ${format}: столбик в порядке ТЗ — Сегодня, уроки, навыки, практика`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'ширину задаём сами')
    await page.setViewportSize({ width: 834, height: 1112 })
    await setup(page, { format })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-today')).toBeVisible({ timeout: 20000 })
    const side = page.locator(format === 'teacher' ? '.hm-tl' : '.hm-near')
    await expect(side).toBeVisible()
    // без маскота: колонка уже 840
    await expect(page.locator('.ge-goal .ih-gb__mascot img')).toBeHidden()
    const y = async (sel) => (await boxOf(page.locator(sel).first())).y
    const order = [await y('.ge-today'), await y(format === 'teacher' ? '.hm-tl' : '.hm-near'), await y('.hm-skills'), await y('.hm-prac')]
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    await shot(page, `home-${format}-834-ru`)
  })
}

test('планшет 1100: уроки и навыки рядом, «Сегодня» во всю ширину', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'ширину задаём сами')
  await page.setViewportSize({ width: 1100, height: 900 })
  await setup(page, { format: 'teacher' })
  await page.goto('/?screen=home')
  await expect(page.locator('.hm-tl')).toBeVisible({ timeout: 20000 })
  const lessons = await boxOf(page.locator('.hm-tl'))
  const skills = await boxOf(page.locator('.hm-skills'))
  const today = await boxOf(page.locator('.ge-today'))
  expect(Math.abs(lessons.y - skills.y)).toBeLessThan(2)
  expect(today.width).toBeGreaterThan(lessons.width + skills.width)
})

test('казахский интерфейс: ключи на месте, без пустых строк', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'компьютер и планшет')
  for (const [w, h, name] of [[1440, 900, '1440'], [834, 1112, '834']]) {
    await page.setViewportSize({ width: w, height: h })
    for (const format of ['teacher', 'self', 'demo']) {
      await setup(page, { format, lang: 'kk' })
      await page.goto('/?screen=home')
      await expect(page.locator('.ge-goal .ih-gb__nowtag')).toHaveText(`Қазір · 4-сабақ (${B1_LESSONS} ішінен)`, { timeout: 20000 })
      await expect(page.locator(format === 'teacher' ? '.hm-tl' : '.hm-near')).toContainText(format === 'teacher' ? 'Мұғаліммен сабақтар' : 'Жақын арада')
      await expect(page.locator('.hm-prac')).toContainText('Еркін жаттығу')
      // сырой ключ i18n на экран не выходит
      await expect(page.locator('.hm--v2')).not.toContainText(/home\.(tl|near|week|skills)\./)
      await shot(page, `home-${format}-${name}-kk`)
      await page.unrouteAll({ behavior: 'ignoreErrors' })
    }
  }
})

test('телефон — прежние карточки по макету приложения, новых блоков нет', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'только телефон')
  await setup(page, { format: 'teacher' })
  await page.goto('/?screen=home')
  await expect(page.locator('.hm-sched')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.hm-hw')).toBeVisible()
  await expect(page.locator('.hm-tl')).toHaveCount(0)
  await expect(page.locator('.hm-skills__results')).toBeHidden()
})
