import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { gateReply } from './helpers/login.js'

// «Задачи на сегодня» по направлениям (задача 218 доски): ученик общего курса, у которого есть ещё IELTS и SAT, видит на
// «Главной» одну карточку с секцией на направление — счётчик у каждой, общий в шапке, раскрытие мышью и клавиатурой,
// «+ ещё N». Бэкенд подменён целиком. TRACKS_SHOTS=<папка> — снять скриншоты (компьютер, тёмная тема, планшет, телефон).

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.TRACKS_SHOTS

const pad = (n) => String(n).padStart(2, '0')
const NOW = new Date()
const today = `${NOW.getFullYear()}-${pad(NOW.getMonth() + 1)}-${pad(NOW.getDate())}`
const B1_LESSONS = JSON.parse(fs.readFileSync('public/course/b1/index.json', 'utf8')).lessons.length

const profile = {
  onboarded: true,
  purpose: 'work',
  targetLevel: 'B2',
  fromLevel: 'B1',
  dailyMinutes: 45,
  deadlineWindow: 'none',
  route: 'self_study',
  deadline: { state: 'days', date: '2027-04-01', daysRemaining: 160, approximate: false },
  journey: { start: 'A2', current: { level: 'B1', percent: 8 }, target: 'B2', reached: false },
}

// General English: две свои задачи открыты, одна сделана; задача преподавателя в «Сегодня» не входит
const gePlan = {
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
    { id: 5, date: today, kind: 'custom', origin: 'teacher', module: null, minutes: 20, got: 0, status: 'available', overdue: false, movable: false, extra: { title: 'Посмотри серию' } },
  ],
}

// IELTS: пять задач программы дня, одна сделана
const ieltsTask = (id, over) => ({ id, date: today, sec: 'reading', kind: 'type', sub: 'tfng', n: 1, minutes: 20, status: 'available', ...over })
const ieltsDash = {
  programme: {
    enrollment: { status: 'active', studyMode: 'self_study', programmeName: 'Band 7 · 12 недель' },
    currentWeek: 3,
    tasks: [
      ieltsTask(101, { status: 'completed' }),
      ieltsTask(102, { sec: 'writing', kind: 't2', sub: 'opinion', minutes: 40 }),
      ieltsTask(103, { sec: 'listening', kind: 'dc', sub: null, minutes: 15 }),
      ieltsTask(104, { sec: 'speaking', kind: 'p2', sub: null, minutes: 15 }),
      ieltsTask(105, { sec: 'vocab', kind: 'vocab', sub: 'education', minutes: 10 }),
    ],
  },
}

async function setup(page, { lang = 'ru', theme = null } = {}) {
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'B1', isDemoAccount: false, phone: '77001234567' }
  await page.addInitScript(
    ([token, l, th]) => {
      localStorage.setItem('jts_access_token', token)
      localStorage.setItem('jts_tours_off', '1')
      localStorage.setItem('lang', l)
      if (th) localStorage.setItem('jts_theme', th)
    },
    [jwt, lang, theme],
  )
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    if (url.includes('/cabinet/my-sections')) {
      return route.fulfill(json({ known: true, tariff: 'SELF', format: 'SELF', allowed: ['practice', 'speaking', 'vocabulary', 'review', 'grammar', 'speed'] }))
    }
    const gate = gateReply(url)
    if (gate) return route.fulfill(json(gate))
    if (url.includes('/mobile/ielts/plan/me')) {
      return route.fulfill(json({ ieltsAccount: false, purchased: true, onboarded: true, access: true, track: 'academic', programmeName: 'Band 7 · 12 недель' }))
    }
    if (url.includes('/mobile/ielts/dashboard')) return route.fulfill(json(ieltsDash))
    if (url.includes('/mobile/sat/me')) return route.fulfill(json({ purchased: true, access: true, onboarded: true, diagnosticDone: true }))
    if (url.includes('/mobile/sat/roadmap')) return route.fulfill(json({ roadmap: { active: 2, phases: [{ n: 2, kind: 'group' }] } }))
    if (url.includes('/mobile/sat/schedule')) {
      return route.fulfill(json({ inGroup: true, lessons: [{ number: 5, startsAt: `${today}T19:00:00+05:00`, section: 'RW', status: 'PLANNED', skillIds: ['rw.words'] }] }))
    }
    if (url.includes('/mobile/sat/today-tasks')) return route.fulfill(json({ practiceToday: 4, openErrors: 3, reviewedToday: 0 }))
    if (url.includes('/mobile/ge/plan')) return route.fulfill(json(gePlan))
    if (url.includes('/mobile/ge/profile')) return route.fulfill(json(profile))
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'B1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'B1', next: 'B2', track: 'SELF_STUDY', percent: 8, done: 3, total: 36, remaining: 33 }))
    }
    if (url.includes('/mobile/lesson-modules') && url.includes('/progress')) return route.fulfill(json({ done: ['L1', 'L2', 'L3'], total: B1_LESSONS }))
    if (url.includes('/mobile/lesson-modules')) return route.fulfill(json([{ id: 5, level: 'B1', orderIndex: 0 }]))
    if (url.includes('/admin/lessons/occurrences')) return route.fulfill(json([]))
    if (url.includes('/admin/homework/my')) return route.fulfill(json([]))
    if (url.includes('/student/assignments')) return route.fulfill(json([]))
    if (url.includes('/mobile/trial-request')) return route.fulfill(json({ requested: false, managerAssigned: false }))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
  await page.route('**/api/placement/attempts', (route) => route.fulfill(json({ envelope: null })))
}

const shot = async (page, name, locator = null) => {
  if (!SHOTS) return
  // значки секций — маски из svg: снимок до их загрузки показал бы пустые места
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  if (locator) await locator.screenshot({ path: `${SHOTS}/${name}.png` })
  else await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

test('компьютер: секции IELTS, General English и SAT со счётчиками; раскрытие мышью и клавиатурой', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'компьютер; телефон — отдельным тестом')
  await setup(page)
  await page.goto('/?screen=home')
  const card = page.locator('.hm-trk')
  await expect(card).toBeVisible({ timeout: 20000 })
  await expect(card.getByRole('heading', { name: 'Задачи на сегодня' })).toBeVisible()
  // отдельной карточки «Сегодня» общего курса нет — она секцией внутри
  await expect(page.locator('.hm-card.ge-today')).toHaveCount(0)

  const ielts = card.getByRole('button', { name: /^IELTS/ })
  const ge = card.getByRole('button', { name: /^General English/ })
  const sat = card.getByRole('button', { name: /^SAT/ })
  await expect(ielts).toHaveAccessibleName('IELTS, 4 задачи')
  await expect(ge).toHaveAccessibleName('General English, 2 задачи')
  await expect(sat).toHaveAccessibleName('SAT, 3 задачи')
  await expect(card.locator('.hm-trk__total')).toHaveText('9 задач')
  const tops = await card.locator('.hm-trk__sec').evaluateAll((els) => els.map((e) => e.dataset.track))
  expect(tops).toEqual(['ielts', 'ge', 'sat'])

  // раскрыта первая с задачами — IELTS: три строки до «+ ещё 2 задания», сначала несделанные
  await expect(ielts).toHaveAttribute('aria-expanded', 'true')
  await expect(ge).toHaveAttribute('aria-expanded', 'false')
  const ieltsBody = card.locator('#hm-trk-ielts')
  await expect(ieltsBody.locator('.hm-trk__row')).toHaveCount(3)
  await expect(ieltsBody.locator('.hm-trk__row.is-done')).toHaveCount(0)
  await shot(page, 'tracks-1440-ru')
  await shot(page, 'tracks-card-1440-ru', card)
  await ieltsBody.getByRole('button', { name: '+ ещё 2 задания' }).click()
  await expect(ieltsBody.locator('.hm-trk__row')).toHaveCount(5)
  await expect(ieltsBody.locator('.hm-trk__row.is-done')).toHaveCount(1)
  await ieltsBody.getByRole('button', { name: 'Свернуть' }).click()
  await expect(ieltsBody.locator('.hm-trk__row')).toHaveCount(3)

  // клавиатура: из раскрытой секции IELTS Tab идёт по её кнопкам, с последней («+ ещё») — на шапку General English;
  // Enter раскрывает, пробел сворачивает
  await ieltsBody.getByRole('button', { name: '+ ещё 2 задания' }).focus()
  await page.keyboard.press('Tab')
  await expect(ge).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(ge).toHaveAttribute('aria-expanded', 'true')
  const geBody = card.locator('#hm-trk-ge')
  await expect(geBody.locator('.ge-today--embedded')).toBeVisible()
  await expect(geBody.getByRole('button', { name: /Весь план/ })).toBeVisible()
  await page.keyboard.press(' ')
  await expect(ge).toHaveAttribute('aria-expanded', 'false')
  await expect(geBody).toBeHidden()

  // мышью: SAT — три задания вкладки «Сегодня» SAT, ошибки с числом
  await sat.click()
  await expect(sat).toHaveAttribute('aria-expanded', 'true')
  const satBody = card.locator('#hm-trk-sat')
  await expect(satBody.locator('.hm-trk__row')).toHaveCount(3)
  await expect(satBody).toContainText('3 ошибки ждут разбора')
  await expect(satBody).toContainText('4 из 10')
  await ge.click()
  await shot(page, 'tracks-card-open-1440-ru', card)

  // «Начать» у задачи IELTS открывает раздел IELTS (taskRoute — как кнопка его вкладки «Сегодня»)
  await ieltsBody.locator('.hm-trk__row', { hasText: 'Opinion' }).getByRole('button', { name: 'Начать' }).click()
  await expect(page).toHaveURL(/screen=ielts/)
})

test('тёмная тема и казахский: карточка по направлениям', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'компьютер')
  await setup(page, { lang: 'kk', theme: 'dark' })
  await page.goto('/?screen=home')
  const card = page.locator('.hm-trk')
  await expect(card).toBeVisible({ timeout: 20000 })
  await expect(card.getByRole('heading', { name: 'Бүгінгі тапсырмалар' })).toBeVisible()
  await expect(card.locator('.hm-trk__total')).toHaveText('9 тапсырма')
  // карточка не белая на тёмном: фон — токен темы
  const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toBe('rgb(255, 255, 255)')
  await shot(page, 'tracks-1440-kk-dark')
  await shot(page, 'tracks-card-1440-kk-dark', card)
})

test('планшет 834: карточка во всю ширину, строки не налезают', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'ширину задаём сами')
  await page.setViewportSize({ width: 834, height: 1112 })
  await setup(page)
  await page.goto('/?screen=home')
  const card = page.locator('.hm-trk')
  await expect(card).toBeVisible({ timeout: 20000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await shot(page, 'tracks-834-ru')
})

test('телефон: как и «Сегодня» общего курса, карточки нет — блоки макета приложения прежние', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'телефон')
  await setup(page)
  await page.goto('/?screen=home')
  await expect(page.locator('.hm-sched, .hm-skills').first()).toBeVisible({ timeout: 20000 })
  // карточка в разметке есть (направления пришли), но телефон её не показывает
  await expect(page.locator('.hm-trk')).toHaveCount(1, { timeout: 20000 })
  await expect(page.locator('.hm-trk')).toBeHidden()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await shot(page, 'tracks-390-ru')
})
