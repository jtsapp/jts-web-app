import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'

// План по дням общего курса (спека 2026-10-13): «Сегодня» на «Главной» по плану бэкенда → «Весь план» → неделя →
// перенос своей задачи. «Сегодня» по ТЗ v2.0 (5.2–5.3): минуты дня, «По навыкам», «Зачем», «Откроется» и переход к
// уроку воркбука. Бэкенд подменён — проверяем экраны и запрос переноса. GE_SHOTS=<папка> — снять скриншоты.

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

function planWith(tasks, shortDay = null) {
  return {
    shortDay,
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

async function setup(page, { lang = null } = {}) {
  const state = {
    moves: [],
    dones: [],
    replans: [],
    shortDay: null,
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
  await page.addInitScript(([token, ui]) => {
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('jts_tours_off', '1')
    if (ui) localStorage.setItem('lang', ui)
  }, [jwt, lang])
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
    // «У меня мало времени» (ТЗ v2.0, 5.2): 20 минут — урок курса уходит на завтра, null — день как был
    if (/\/mobile\/ge\/plan\/replan/.test(url) && req.method() === 'POST') {
      const { minutes } = JSON.parse(req.postData())
      state.replans.push(minutes)
      state.shortDay = minutes ? { minutes } : null
      state.tasks = state.tasks.map((x) =>
        x.id === 1 ? (minutes ? { ...x, date: add(1), originalDate: today, status: 'planned', deferred: true } : { ...x, date: today, status: 'available', deferred: false }) : x)
      return route.fulfill(json({ ...planWith(state.tasks, state.shortDay), replan: { minutes, kept: 1, moved: minutes ? 1 : 0 } }))
    }
    if (url.includes('/mobile/ge/plan')) return route.fulfill(json(planWith(state.tasks, state.shortDay)))
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
  // после общего маршрута бэкенда: окно «Документы платформы» иначе закрывало «Главную» (его ответ — {})
  await mockGates(page)
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
  // шапка — сделанные минуты своих задач дня: словарь 15 + 6 минут разговора из 30 + 15 + 15
  await expect(card.locator('.ge-today__mins')).toHaveText('21 из 60 мин')
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '35')
  // урок курса подписан по тропе: L1, L2 пройдены — следующий шаг A2 — третий урок курса
  const course = card.locator('.ge-task.is-course')
  await expect(course).toContainText('Урок:')
  await expect(course).toContainText('Урок курса · 30 мин')
  // текущий шаг — урок курса: «Зачем» из уровня и цели анкеты, «Откроется» — путь по тропе
  await expect(course.locator('.ge-task__why')).toHaveText('Зачем: Следующий урок курса A2 — шаг к цели B2.')
  await expect(course.locator('.ge-task__opens')).toContainText('Откроется: Повторение → A2 →')
  await expect(card).toContainText('6 / 15 мин')
  // четыре своих задачи — по порядку; «готово · +N токенов» на localhost нет: награды только на dev-стенде
  await expect(card.getByRole('button', { name: 'По порядку' })).toHaveAttribute('aria-pressed', 'true')
  await expect(card.getByTestId('task-done-tokens')).toHaveCount(0)
  // домашка и задачи преподавателя — не в «Сегодня» (ТЗ v2.0 9.1): они в полном плане и в блоках расписания и домашки
  await expect(card).not.toContainText('Unit 3 · Past Simple')
  await expect(card).not.toContainText('Посмотри серию')
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

test('«У меня мало времени»: 20 минут — урок на завтра строкой «Перенесено», и обратно', async ({ page }, info) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  const state = await setup(page)
  await page.goto('/?screen=home')
  const card = page.locator('.ge-today')
  await expect(card).toBeVisible({ timeout: 20000 })
  await card.getByRole('button', { name: 'У меня мало времени' }).click()
  await card.getByRole('group', { name: 'Сколько времени сегодня?' }).getByRole('button', { name: '20 мин' }).click()
  await expect.poll(() => state.replans).toEqual([20])
  await expect(card).toContainText('План на сегодня — 20 мин')
  await expect(card.getByRole('heading', { name: 'Перенесено на другой день' })).toBeVisible()
  await expect(card.locator('.ge-task.is-course .ge-task__chip.is-moved')).toContainText('перенесено с')
  await shot(page, `home-low-time-${info.project.name}`)

  await card.getByRole('button', { name: 'Вернуть обычный план' }).click()
  await expect.poll(() => state.replans).toEqual([20, null])
  await expect(card.getByRole('button', { name: 'У меня мало времени' })).toBeVisible()
  await expect(card.getByRole('heading', { name: 'Перенесено на другой день' })).toHaveCount(0)
})

// День из шести своих задач (хвосты, перенос): блок сам открывается «По навыкам» (ТЗ 5.2), плитка раскрывает задачи
// навыка, «Откроется» называет конкретный материал, «Начать» открывает урок воркбука, а не каталог раздела (ТЗ 5.3).
const BUSY_DAY = [
  { id: 11, date: today, kind: 'course', module: null, minutes: 30, got: 0, status: 'available', overdue: false, movable: true },
  { id: 12, date: today, kind: 'practice', module: 'ai_tutor', minutes: 15, got: 0, status: 'available', overdue: false, movable: true },
  { id: 13, date: today, kind: 'practice', module: 'vocabulary_sr', minutes: 10, got: 10, status: 'completed', overdue: false, movable: false },
  { id: 14, date: today, kind: 'practice', module: 'workbooks', minutes: 15, got: 0, status: 'available', overdue: false, movable: true },
  { id: 15, date: today, kind: 'practice', module: 'media_practice', minutes: 15, got: 0, status: 'available', overdue: false, movable: true },
  { id: 16, date: today, kind: 'practice', module: 'shadowing', minutes: 10, got: 0, status: 'available', overdue: false, movable: true },
]

for (const lang of ['ru', 'kk']) {
  test(`больше пяти задач — «По навыкам», «Откроется» и «Начать» ведёт в урок воркбука (${lang})`, async ({ page }, info) => {
    test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
    const state = await setup(page, { lang })
    state.tasks = BUSY_DAY
    await page.goto('/?screen=home')
    const card = page.locator('.ge-today')
    await expect(card).toBeVisible({ timeout: 20000 })
    const ru = lang === 'ru'
    await expect(card.getByRole('button', { name: ru ? 'По навыкам' : 'Дағды бойынша' })).toHaveAttribute('aria-pressed', 'true')
    const tiles = card.locator('.ge-sk__tile')
    await expect(tiles).toHaveCount(5)
    await expect(tiles.nth(2)).toContainText(ru ? 'Говорение2 задачи · 25 мин' : 'Сөйлеу2 тапсырма · 25 мин')
    await shot(page, `home-skills-${lang}-${info.project.name}`)

    // «Чтение» — первый текст полки A2, «Говорение» — Speaking Buddy и первый урок шэдоуинга
    await tiles.nth(1).click()
    const open = card.locator('#ge-sk-open')
    await expect(open.locator('.ge-task__opens')).toHaveText(
      ru ? 'Откроется: Практика → Чтение A2 → «The Longest Experiment in the World»' : 'Ашылады: Тәжірибе → Оқылым A2 → «The Longest Experiment in the World»',
    )
    await tiles.nth(2).click()
    await expect(open.locator('.ge-task')).toHaveCount(2)
    await expect(open.locator('.ge-task__opens').nth(1)).toHaveText(
      ru ? 'Откроется: Практика → Шэдоуинг → «Speak Like Selena Gomez»' : 'Ашылады: Тәжірибе → Шэдоуинг → «Speak Like Selena Gomez»',
    )
    // повторное нажатие сворачивает
    await tiles.nth(2).click()
    await expect(open).toHaveCount(0)

    await tiles.nth(3).click()
    const wb = card.locator('#ge-sk-open .ge-task')
    await expect(wb.locator('.ge-task__opens')).toHaveText(
      ru ? 'Откроется: Практика → Воркбук A2 → урок 1 «Getting to know you»' : 'Ашылады: Тәжірибе → Воркбук A2 → 1-сабақ «Getting to know you»',
    )
    await shot(page, `home-skills-open-${lang}-${info.project.name}`)
    await wb.getByRole('button', { name: ru ? 'Начать' : 'Бастау' }).click()
    // открылся сам урок 1 воркбука A2, а не каталог юнитов
    await expect(page.locator('.wb-actionbar')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('body')).toContainText('Getting to know you')
  })
}

test('без ручки плана (старый бэкенд отвечает {}) — прежняя «Что сделать сегодня»', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  await setup(page)
  await page.route(/\/mobile\/ge\/plan/, (route) => route.fulfill(json({})))
  await page.goto('/?screen=home')
  await expect(page.locator('.ge-goal')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.ge-today')).toHaveCount(0)
})

test('задача преподавателя в полном плане: метка, комментарий и «Отметить выполненным»', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  const state = await setup(page)
  // в «Сегодня» на «Главной» задач преподавателя нет (ТЗ v2.0 9.1) — отмечает он их в «Моём плане»
  await page.goto('/?screen=ge-plan')
  const row = page.getByRole('complementary', { name: 'Задачи дня' }).locator('.ge-task.is-teacher')
  await expect(row).toBeVisible({ timeout: 20000 })
  await expect(row).toContainText('Посмотри серию')
  await expect(row).toContainText('Добавлено преподавателем')
  await expect(row).toContainText('Без субтитров')
  await row.getByRole('button', { name: 'Отметить выполненным' }).click()
  await expect.poll(() => state.dones).toEqual([{ id: '5', done: true }])
  await expect(row).toContainText('Выполнено')
})
