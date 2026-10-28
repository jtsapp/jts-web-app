import { test, expect } from '@playwright/test'

// План по дням общего курса (спека 2026-10-13): «Сегодня» на «Главной» по плану бэкенда → «Весь план» → неделя →
// перенос своей задачи. Бэкенд подменён — проверяем экраны и запрос переноса. GE_SHOTS=<папка> — снять скриншоты.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// «Сегодня» — реальная дата прогона: экран сравнивает задачи с plan.today, а не с часами браузера, но месяц и неделя
// листаются от неё же, поэтому берём настоящую — тест не протухает со временем.
const iso = (d) => d.toISOString().slice(0, 10)
const TODAY = new Date()
const add = (n) => iso(new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate() + n)))
const today = add(0)

const profile = {
  onboarded: true,
  purpose: 'work',
  targetLevel: 'B2',
  fromLevel: 'A2',
  dailyMinutes: 30,
  deadlineWindow: 'none',
  route: 'self_study',
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: 'A2', current: { level: 'A2', percent: 40 }, target: 'B2', reached: false },
}

function planWith(tasks) {
  return {
    today,
    state: 'ready',
    route: 'self_study',
    dailyMinutes: 30,
    planStart: add(-7),
    planUntil: add(35),
    liveMissing: false,
    week: { done: 1, total: 4 },
    tasks,
  }
}

async function setup(page) {
  const state = {
    moves: [],
    dones: [],
    tasks: [
      { id: 1, date: today, kind: 'course', module: null, minutes: 30, got: 0, status: 'available', overdue: false, movable: true },
      { id: 2, date: today, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 6, status: 'in_progress', overdue: false, movable: true },
      { id: 3, date: today, kind: 'practice', module: 'vocabulary_sr', minutes: 15, got: 15, status: 'completed', overdue: false, movable: false },
      { id: 'hw:9', date: today, kind: 'homework', module: null, minutes: 0, got: 0, status: 'available', overdue: false, movable: false, title: 'Unit 3 · Past Simple', extra: { dueDate: today } },
      { id: 4, date: add(1), kind: 'practice', module: 'workbooks', minutes: 15, got: 0, status: 'planned', overdue: false, movable: true },
      // задача преподавателя (часть 3): своё задание с комментарием — ученик отмечает его сам
      { id: 5, date: today, kind: 'custom', origin: 'teacher', module: null, minutes: 20, got: 0, status: 'available', overdue: false, movable: false, title: 'Посмотри серию', extra: { title: 'Посмотри серию', note: 'Без субтитров', createdByName: 'Айгерим' } },
    ],
  }
  await page.addInitScript((token) => {
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('jts_tours_off', '1')
  }, jwt)
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A2', isDemoAccount: false }
  await page.route(/justtostudy\.kz/, (route) => {
    const req = route.request()
    const url = req.url()
    const moved = /\/mobile\/ge\/plan\/tasks\/([^/]+)\/date/.exec(url)
    if (moved && req.method() === 'PUT') {
      const { date } = JSON.parse(req.postData())
      state.moves.push({ id: moved[1], date })
      state.tasks = state.tasks.map((x) => (String(x.id) === moved[1] ? { ...x, date } : x))
      return route.fulfill(json({ id: Number(moved[1]), date }))
    }
    const marked = /\/mobile\/ge\/plan\/tasks\/([^/]+)\/done/.exec(url)
    if (marked && req.method() === 'PUT') {
      const { done } = JSON.parse(req.postData())
      state.dones.push({ id: marked[1], done })
      state.tasks = state.tasks.map((x) => (String(x.id) === marked[1] ? { ...x, status: done ? 'completed' : 'available', got: done ? 1 : 0 } : x))
      return route.fulfill(json({ id: Number(marked[1]), status: done ? 'completed' : 'available' }))
    }
    if (url.includes('/mobile/ge/plan')) return route.fulfill(json(planWith(state.tasks)))
    if (url.includes('/mobile/ge/profile')) return route.fulfill(json(profile))
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A2' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'A2', next: 'B1', track: 'SELF_STUDY', percent: 40, done: 14, total: 36, remaining: 22 }))
    }
    if (url.includes('/mobile/lesson-modules') && url.includes('/progress')) return route.fulfill(json({ done: ['L1', 'L2'], total: 36 }))
    if (url.includes('/mobile/lesson-modules')) return route.fulfill(json([{ id: 5, level: 'A2', orderIndex: 0 }]))
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
  return state
}

const shot = async (page, name) => {
  if (process.env.GE_SHOTS) await page.screenshot({ path: `${process.env.GE_SHOTS}/${name}.png`, fullPage: true })
}

test('«Сегодня» на «Главной» по плану → весь план → перенос задачи в неделе', async ({ page }, info) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  const state = await setup(page)
  await page.goto('/?screen=home')
  const card = page.locator('.ge-today')
  await expect(card).toBeVisible({ timeout: 20000 })
  await expect(card).toContainText('Неделя: 1 из 4')
  // урок курса подписан по тропе: L1, L2 пройдены — следующий шаг A2 — третий урок курса
  await expect(card.locator('.ge-task.is-course')).toContainText('Урок:')
  await expect(card).toContainText('6 / 15 мин')
  await expect(card).toContainText('Unit 3 · Past Simple')
  await expect(page.locator('.hm-recommend')).toHaveCount(0)
  await shot(page, `home-${info.project.name}`)

  await card.getByRole('button', { name: /Весь план/ }).click()
  await expect(page.getByRole('heading', { name: 'Мой план' })).toBeVisible()
  const panel = page.getByRole('complementary', { name: 'Задачи дня' })
  await expect(panel).toContainText('Разговор со Speaking Buddy')
  await shot(page, `plan-road-${info.project.name}`)

  await page.getByRole('tab', { name: 'Неделя' }).click()
  await expect(page).toHaveURL(/gePlanView=week/)
  await page.locator('.ih-wcard', { hasText: 'Воркбук' }).click()
  await page.getByRole('button', { name: /Перенести/ }).click()
  await page.getByLabel('Перенести на').fill(add(2))
  await expect.poll(() => state.moves).toEqual([{ id: '4', date: add(2) }])
  await shot(page, `plan-week-${info.project.name}`)

  await page.getByRole('tab', { name: 'Месяц' }).click()
  await expect(page.locator('.ih-month2')).toBeVisible()
  await shot(page, `plan-month-${info.project.name}`)
})

test('без ручки плана (старый бэкенд отвечает {}) — прежняя «Что сделать сегодня»', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  await setup(page)
  await page.route(/\/mobile\/ge\/plan/, (route) => route.fulfill(json({})))
  await page.goto('/?screen=home')
  await expect(page.locator('.ge-goal')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.ge-today')).toHaveCount(0)
})

test('задача преподавателя: метка, комментарий и «Отметить выполненным»', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  const state = await setup(page)
  await page.goto('/?screen=home')
  const row = page.locator('.ge-today .ge-task.is-teacher')
  await expect(row).toBeVisible({ timeout: 20000 })
  await expect(row).toContainText('Посмотри серию')
  await expect(row).toContainText('Добавлено преподавателем')
  await expect(row).toContainText('Без субтитров')
  await row.getByRole('button', { name: 'Отметить выполненным' }).click()
  await expect.poll(() => state.dones).toEqual([{ id: '5', done: true }])
  await expect(row).toContainText('Выполнено')
})
