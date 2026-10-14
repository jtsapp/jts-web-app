import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Тест уровня v16 при первом входе (спека 2026-10-14-placement-v16-first-login-design.md): у нового ученика роадмап
// «Главной» закрыт блюром → тест открывается экраном с iframe → итог уходит в наши роуты и профиль GE → маршрут →
// открытый блок цели и отчёт теста. Бэкенд и наши роуты подменены.
//
// Сорок вопросов в e2e не проходим: итог отдаём тем же крючком, которым его отдаёт сам тест
// (JTSPlacementConfig.openLearning), с настоящим конвертом v16 (__fixtures__/envelope-b1.json).

const ENVELOPE = JSON.parse(fs.readFileSync(path.resolve('src/placement/__fixtures__/envelope-b1.json'), 'utf8'))
const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

function profileFrom(body, level, route = null) {
  return {
    onboarded: true,
    purpose: body.purpose,
    targetLevel: body.targetLevel,
    fromLevel: level,
    deadlineDate: null,
    deadlineWindow: body.deadlineWindow,
    dailyMinutes: body.dailyMinutes,
    startMode: body.startMode,
    route,
    onboardedAt: '2026-10-14T10:00:00',
    deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
    journey: { start: level, current: { level, percent: 0 }, target: body.targetLevel, reached: false },
  }
}

async function setup(page, { level = 'A2', tours = false, createdAt = null, profile = { onboarded: false } } = {}) {
  const state = { level, profile, puts: [], attempts: [] }
  await page.addInitScript(
    ({ token, tours }) => {
      localStorage.setItem('jts_access_token', token)
      if (!tours) localStorage.setItem('jts_tours_off', '1')
    },
    { token: jwt, tours },
  )
  const me = () => ({ userId: 7, name: 'Сакен', role: 'USER', languageLevel: state.level, isDemoAccount: false, createdAt })
  await page.route(/justtostudy\.kz/, (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('/mobile/ge/profile/route')) {
      state.profile = { ...state.profile, route: JSON.parse(req.postData()).route }
      return route.fulfill(json(state.profile))
    }
    if (url.includes('/mobile/ge/profile')) {
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData())
        state.puts.push(body)
        state.profile = profileFrom(body, state.level)
      }
      return route.fulfill(json(state.profile))
    }
    if (url.includes('/user/language-level')) {
      if (req.method() === 'PUT') state.level = new URL(url).searchParams.get('languageLevel')
      return route.fulfill(json({ languageLevel: state.level }))
    }
    if (url.includes('/user/me')) return route.fulfill(json(me()))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: state.level, next: 'B2', track: 'SELF_STUDY', percent: 0, done: 0, total: 36, remaining: 36 }))
    }
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me() })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
  await page.route('**/api/placement/complete', (route) => route.fulfill(json({ configured: false })))
  await page.route('**/api/placement/attempts', (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      state.attempts.push(JSON.parse(req.postData()).envelope)
      return route.fulfill(json({ configured: true, saved: true }))
    }
    return route.fulfill(json({ configured: true, envelope: state.attempts.at(-1) ?? null }))
  })
  return state
}

async function finishTestThroughBridge(page) {
  const frame = page.locator('.pl-page__frame')
  await expect(frame).toBeVisible()
  const f = await (await frame.elementHandle()).contentFrame()
  // Страница теста загрузилась и мост поставил крючки
  await f.waitForFunction(() => typeof window.JTSPlacementConfig?.openLearning === 'function', null, { timeout: 30000 })
  await expect(page.frameLocator('.pl-page__frame').getByText('JTS Placement Test')).toBeVisible()
  return f.evaluate((env) => window.JTSPlacementConfig.openLearning(env, { intent: 'open_existing_roadmap' }), ENVELOPE)
}

test('ученик без анкеты: закрытый роадмап → тест v16 → маршрут → блок цели и отчёт', async ({ page }) => {
  const state = await setup(page, { level: 'A2' })
  await page.goto('/?screen=home')

  const locked = page.locator('.ge-locked')
  await expect(locked).toContainText('Пройдите тест — построим ваш маршрут', { timeout: 20000 })
  // остальная «Главная» работает: закрыт только роадмап
  await expect(page.locator('.hm-skills')).toBeVisible()
  await locked.getByRole('button', { name: 'Пройти тест' }).click()

  expect(await finishTestThroughBridge(page)).toEqual({ accepted: true, persisted: true, navigated: true })

  // итог — в базу, анкета — в профиль GE; уровень тарифа (A2) не тронут, цель v16 (B1) выше него — берётся как есть
  expect(state.attempts).toHaveLength(1)
  expect(state.attempts[0].host.goalLabel.ru).toBe('Путешествовать без переводчика')
  expect(state.puts).toEqual([{ purpose: 'travel', targetLevel: 'B1', deadlineDate: null, deadlineWindow: '3-6m', dailyMinutes: 30, startMode: null }])
  expect(state.level).toBe('A2')

  await expect(page.getByRole('heading', { name: 'Как дойти до B1' })).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Учиться самостоятельно' }).click()

  await expect(page.locator('.ge-goal')).toBeVisible()
  await expect(page.locator('.ge-locked')).toHaveCount(0)
  const report = page.locator('.pl-report')
  await expect(report).toContainText('Результаты теста уровня')
  await expect(report.locator('.pl-report__level')).toHaveText('B1')
  await expect(report.locator('.pl-report__skill')).toHaveCount(4)
  await expect(report).toContainText('Путешествовать без переводчика')
})

test('ученик без уровня: тест ставит уровень аккаунта', async ({ page }) => {
  const state = await setup(page, { level: null })
  await page.goto('/?screen=home')
  await expect(page.locator('.ge-locked')).toBeVisible({ timeout: 20000 })
  await page.locator('.ge-locked').getByRole('button', { name: 'Пройти тест' }).click()
  await finishTestThroughBridge(page)
  await expect.poll(() => state.level).toBe('B1')
  // B1 по тесту, цель v16 «уже достигнута» → следующая плитка
  await expect.poll(() => state.puts.at(-1)?.targetLevel).toBe('B2')
  await expect(page.getByRole('heading', { name: 'Как дойти до B2' })).toBeVisible({ timeout: 20000 })
})

test('настоящий экран итога v16: итог сохраняется сам, «продолжить» ведёт на маршрут', async ({ page }) => {
  const state = await setup(page, { level: 'A2' })
  await page.goto('/?screen=placement')
  const frame = page.locator('.pl-page__frame')
  await expect(frame).toBeVisible({ timeout: 20000 })
  const f = await (await frame.elementHandle()).contentFrame()
  await f.waitForFunction(() => typeof window.JTSPlacementConfig?.onComplete === 'function', null, { timeout: 30000 })
  // Ответы — встроенным симулятором автора (ученик B1), анкета — «путешествовать без переводчика»; дальше — его же
  // экран итога, onComplete и кнопка «продолжить», без наших подстановок.
  await f.evaluate(() => {
    /* global simulateRealProfile, app, render */
    simulateRealProfile('B1', 2, 1)
    // eslint-disable-next-line no-global-assign
    SELFTEST_ACTIVE = false
    app.goalOnboarding = { step: 5, selections: { travel: ['travel_independent'] }, customText: {}, followUpDrafts: { deadline: { value: '3_6_months', customText: '' } }, returnScreen: null }
    window.JTSStudentGoals.getData() // заводит объект анкеты у свежего прогона
    app.studentGoals.selectedCategories = ['travel']
    app.studentGoals.completed = true
    app.screen = 'result'
    render()
  })
  await expect.poll(() => state.attempts.length, { timeout: 15000 }).toBeGreaterThan(0)
  expect(state.attempts[0].assessment.overallCEFR).toBe('B1')
  expect(state.attempts[0].goals.primaryGoal).toBe('travel_independent')
  await page.frameLocator('.pl-page__frame').locator('#prLearn').click()
  await expect(page.getByRole('heading', { name: 'Как дойти до B1' })).toBeVisible({ timeout: 20000 })
  expect(state.puts).toHaveLength(1)
})

// Решение владельца 14.10: учившихся до теста v16 не заставлять — на «Главной» тест просто числится непройденным.
test.describe('учится до теста v16', () => {
  const OLD = '2026-09-01T10:00:00'

  test('анкеты нет — без блюра, карточка «Тест уровня не пройден»', async ({ page }) => {
    await setup(page, { level: 'A2', createdAt: OLD })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-invite')).toContainText('Тест уровня не пройден', { timeout: 20000 })
    await expect(page.locator('.ge-locked')).toHaveCount(0)
    await page.locator('.ge-invite').getByRole('button', { name: 'Пройти тест' }).click()
    await expect(page.locator('.pl-page__frame')).toBeVisible()
  })

  test('маршрут есть — он на месте, под ним «Тест уровня · Не пройден»', async ({ page }) => {
    const goal = profileFrom({ purpose: 'work', targetLevel: 'B2', deadlineWindow: 'none', dailyMinutes: 30, startMode: null }, 'A2', 'self_study')
    await setup(page, { level: 'A2', createdAt: OLD, profile: goal })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-goal')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.pl-report--missing')).toContainText('Не пройден')
    await expect(page.locator('.ge-locked')).toHaveCount(0)
  })
})

test.describe('тур', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test('новый ученик без уровня: сначала тур, первый шаг — про закрытый роадмап', async ({ page }) => {
    await setup(page, { level: null, tours: true })
    await page.goto('/?screen=home')
    await expect(page.locator('.t-tour__pop')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.t-tour__title')).toHaveText('Здесь будет ваш маршрут')
    await page.locator('.t-tour__skip').click()
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
    await expect(page.locator('.ge-locked')).toBeVisible()
  })
})
