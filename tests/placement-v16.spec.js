import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { LEGAL_VERSION } from '../src/lib/legalDocuments.js'

// Тест уровня v16 при первом входе (спека 2026-10-14-placement-v16-first-login-design.md): у нового ученика роадмап
// «Главной» закрыт блюром → тест открывается экраном с iframe → итог уходит в наши роуты и профиль GE → маршрут →
// открытый блок цели и отчёт теста. Бэкенд и наши роуты подменены.
//
// Сорок вопросов в e2e не проходим: итог отдаём тем же крючком, которым его отдаёт сам тест
// (JTSPlacementConfig.openLearning), с настоящим конвертом v16 (__fixtures__/envelope-b1.json).

// Фейковый микрофон Chrome — для окна говорения. Флаги запуска нельзя задать группе (они требуют своего воркера),
// поэтому на весь файл; остальным тестам они не мешают.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

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
  // Замки поверх приложения у вошедшего (с 29.10.2026): без этих двух ответов вместо экрана теста — «Документы платформы».
  await page.route('**/user/legal-documents**', (route) => route.fulfill(json({ version: LEGAL_VERSION, acceptedAt: '2026-10-29T10:00:00' })))
  await page.route('**/cabinet/my-sections', (route) => route.fulfill(json({ known: false, allowed: [] })))
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
  await expect(page.frameLocator('.pl-page__frame').getByText('Давайте определим')).toBeVisible()
  return f.evaluate((env) => window.JTSPlacementConfig.openLearning(env, { intent: 'open_existing_roadmap' }), ENVELOPE)
}

test('ученик без анкеты: закрытый роадмап → тест v16 → маршрут → блок цели и отчёт', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
  const state = await setup(page, { level: 'A2' })
  await page.goto('/?screen=home')

  const locked = page.locator('.ge-locked')
  await expect(locked).toContainText('Здесь будет ваш маршрут', { timeout: 20000 })
  // остальная «Главная» работает: маршрута нет, на месте «Сегодня» — «Начните отсюда»
  await expect(page.locator('.hm-skills')).toBeVisible()
  await expect(page.locator('.hm-start')).toContainText('Начните отсюда')
  await locked.getByRole('button', { name: 'Пройти тест уровня' }).click()

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
  // цель и что делать дальше — отдельным блоком под сеткой (макет «Главная · редизайн»)
  await expect(page.locator('.pl-next')).toContainText('Путешествовать без переводчика')
  await expect(page.locator('.hm-start')).toHaveCount(0)
})

test('ученик без уровня: тест ставит уровень аккаунта', async ({ page }) => {
  const state = await setup(page, { level: null })
  await page.goto('/?screen=home')
  // На телефоне баннера маршрута нет — тест начинается кнопкой карточки уровня (дизайн приложения, спека 2026-10-26).
  const start = page.locator('.ge-locked:visible, .hm-level--phone:visible')
  await expect(start).toBeVisible({ timeout: 20000 })
  await start.getByRole('button', { name: 'Пройти тест уровня' }).click()
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

// Жалоба с прода 03.11.2026: ученик с тарифным уровнем прошёл тест, а «Главная» снова звала на него. Итог сохранялся
// только на экране итога; итог «Foundation» читался как «теста не было». Уровень тарифа тест не трогает ни в каком случае.
test.describe('пройденный тест не просит пройти его заново', () => {
  // Тест v16 настоящий, ответы — симулятором автора. Прогон (и анкета) готовы, экран и отметка автора — ещё нет.
  async function answerAllSections(page, { foundation = false } = {}) {
    await page.goto('/?screen=placement')
    const frame = page.locator('.pl-page__frame')
    await expect(frame).toBeVisible({ timeout: 20000 })
    const f = await (await frame.elementHandle()).contentFrame()
    await f.waitForFunction(() => typeof window.JTSPlacementConfig?.onComplete === 'function', null, { timeout: 30000 })
    await f.evaluate((wantFoundation) => {
      /* global simulateRealProfile, app, afterComplete, save, render */
      if (wantFoundation) {
        for (let i = 0; simulateRealProfile('A0', 0, i).overall !== 'Foundation'; i++) if (i > 200) throw new Error('нет Foundation')
      } else {
        simulateRealProfile('B1', 2, 1)
      }
      SELFTEST_ACTIVE = false
      app.goalOnboarding = { step: 5, selections: { travel: ['travel_independent'] }, customText: {}, followUpDrafts: { deadline: { value: '3_6_months', customText: '' } }, returnScreen: null }
      window.JTSStudentGoals.getData()
      app.studentGoals.selectedCategories = ['travel']
      app.studentGoals.completed = true
      app.completedByUser = false
    }, foundation)
    return f
  }

  // Тот же переход, что после последнего раздела у живого ученика: afterComplete → экран говорения, окно записи само.
  const finishCoreSections = (f) =>
    f.evaluate(() => {
      afterComplete()
      save()
      render()
    })

  test('прошёл три раздела и ушёл с говорения — итог уже сохранён, «Главная» на тест не зовёт', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'на телефоне отчёт теста и баннер маршрута скрыты (спека 2026-10-26)')
    const state = await setup(page, { level: 'A2' })
    const f = await answerAllSections(page)
    expect(state.attempts).toHaveLength(0)
    await finishCoreSections(f)

    await expect(page.locator('.pl-speak')).toBeVisible({ timeout: 15000 })
    await expect.poll(() => state.attempts.length, { timeout: 15000 }).toBeGreaterThan(0)
    expect(state.attempts[0].assessment.overallCEFR).toBe('B1')
    await expect.poll(() => state.puts.length).toBe(1)
    expect(state.level).toBe('A2')

    // ушёл, так и не открыв итог: закрыл вкладку и вернулся
    await page.goto('/?screen=home')
    await expect(page.locator('.pl-report__level')).toHaveText('B1', { timeout: 20000 })
    await expect(page.locator('.pl-report--missing')).toHaveCount(0)
    await expect(page.locator('.ge-invite')).toContainText('Выберите, как будете заниматься')
    await expect(page.locator('.ge-locked')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Пройти тест уровня' })).toHaveCount(0)
  })

  test('пропуск говорения сразу открывает итог', async ({ page }) => {
    await setup(page, { level: 'A2' })
    const f = await answerAllSections(page)
    await finishCoreSections(f)
    await page.locator('.pl-speak').getByRole('button', { name: 'Пропустить' }).click()
    await expect(page.frameLocator('.pl-page__frame').locator('.personal-results')).toBeVisible({ timeout: 15000 })
  })

  test('прогон, брошенный до итога прежней версией, сохраняется при следующем открытии теста', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'на телефоне отчёт теста скрыт (спека 2026-10-26)')
    const state = await setup(page, { level: 'A2' })
    const f = await answerAllSections(page)
    // Так выглядит застрявший ученик: говорение пропущено, итог не открывал, приложению ничего не ушло.
    await f.evaluate(() => {
      app.completedByUser = true
      app.speaking = { status: 'error' }
      app.active = 'S'
      app.screen = 'speaking'
      save()
    })
    expect(state.attempts).toHaveLength(0)

    await page.goto('/?screen=placement')
    await expect.poll(() => state.attempts.length, { timeout: 30000 }).toBeGreaterThan(0)
    expect(state.attempts[0].assessment.overallCEFR).toBe('B1')
  })

  test('итог «Foundation» у тарифного ученика: результат вместо «Не пройден», уровень тарифа на месте', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'на телефоне отчёт теста скрыт (спека 2026-10-26)')
    const state = await setup(page, { level: 'A2' })
    const f = await answerAllSections(page, { foundation: true })
    await f.evaluate(() => {
      app.screen = 'result'
      render()
    })
    await expect.poll(() => state.attempts.length, { timeout: 15000 }).toBeGreaterThan(0)
    expect(state.attempts.at(-1).assessment.overallCEFR).toBe(null)
    expect(state.level).toBe('A2')

    await page.goto('/?screen=home')
    const report = page.locator('.pl-report')
    await expect(report).toContainText('Начать с основ', { timeout: 20000 })
    await expect(report.locator('.pl-report__level')).toHaveText('Foundation')
    // На разделы он отвечал: уровня нет, но плитка не пишет «не пройдено», а показывает ответы.
    await expect(report).not.toContainText('не пройдено')
    await expect(report.locator('.pl-report__skill').first().locator('.pl-report__note')).toContainText(/\d+\D+\d+/)
    await expect(page.locator('.pl-report--missing')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Пройти тест уровня' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Пройти тест заново' })).toBeVisible()
  })
})

// Жалоба 16.10.2026: после записи окно говорения минуту молчало без единой кнопки, а потом само показывало уровень и
// «отзыв преподавателя» — раньше результатов остальных навыков. Теперь окно только ждёт оценку и закрывается, а отзыв —
// в итоге теста рядом со всеми навыками и в отчёте «Главной». Микрофон — фейковый у Chrome, оценка подменена.
test.describe('говорение', () => {
  test('после записи — ожидание без своего итога, отзыв — в результатах теста и на «Главной»', async ({ page }) => {
    test.setTimeout(120_000)
    const state = await setup(page, { level: 'A2' })
    let release
    const graded = new Promise((r) => {
      release = r
    })
    await page.route('**/api/placement/speaking', async (route) => {
      await graded
      return route.fulfill(
        json({
          status: 'completed',
          speaking_level: 'B1',
          confidence: 'medium',
          subscores: { range: 3, accuracy: 3, fluency: 3, coherence: 3, pronunciation: 80 },
          summary: 'Ты говоришь связно и уверенно.',
          strengths: ['Длинные фразы без пауз'],
          improvements: ['Прошедшее время: went, а не goed'],
          transcript: 'I goed to the park with my friends',
          topicId: 'b1-trip',
        }),
      )
    })

    await page.goto('/?screen=placement')
    const frame = page.locator('.pl-page__frame')
    await expect(frame).toBeVisible({ timeout: 20000 })
    const f = await (await frame.elementHandle()).contentFrame()
    await f.waitForFunction(() => typeof window.JTSSpeakingBuddy?.start === 'function', null, { timeout: 30000 })
    // Грамматика, чтение и аудирование — симулятором автора; говорение — по-настоящему, тем путём, которым тест сам
    // зовёт окно (экран Speaking после всех разделов).
    await f.evaluate(() => {
      /* global simulateRealProfile, app, render */
      simulateRealProfile('B1', 2, 1)
      SELFTEST_ACTIVE = false
      app.goalOnboarding = { step: 5, selections: { travel: ['travel_independent'] }, customText: {}, followUpDrafts: { deadline: { value: '3_6_months', customText: '' } }, returnScreen: null }
      window.JTSStudentGoals.getData()
      app.studentGoals.selectedCategories = ['travel']
      app.studentGoals.completed = true
      app.speaking = { status: 'not_assessed' }
      app.active = 'S'
      app.screen = 'speaking'
      render()
    })

    const modal = page.locator('.pl-speak')
    await modal.getByRole('button', { name: 'Начать подготовку' }).click()
    await modal.getByRole('button', { name: 'Я готов — записать' }).click()
    const stop = modal.getByRole('button', { name: 'Закончить ответ' })
    await expect(stop).toBeEnabled()
    await page.waitForTimeout(16_000) // короче MIN_SECONDS (15 с) окно запись не отправит
    await stop.click()

    // ожидание: прямо сказано, что нажимать ничего не нужно, и кнопок нет вовсе — ни «итога», ни «вернуться»
    await expect(modal.locator('.pl-speak__wait')).toContainText('Ничего нажимать не нужно')
    await expect(modal.getByRole('button')).toHaveCount(0)
    await expect(modal).not.toContainText('Ты говоришь связно')
    release()

    // окно закрылось само, тест открыл итог: отзыв — там, рядом с остальными навыками
    await expect(modal).toHaveCount(0, { timeout: 15000 })
    const results = page.frameLocator('.pl-page__frame')
    await expect(results.locator('.personal-results')).toBeVisible()
    await expect(results.locator('.jts-sf')).toContainText('Ты говоришь связно и уверенно.')
    await expect(results.locator('.jts-sf')).toContainText('Прошедшее время: went, а не goed')

    await expect.poll(() => state.attempts.length, { timeout: 15000 }).toBeGreaterThan(0)
    expect(state.attempts.at(-1).assessment.skillResults.S).toMatchObject({
      status: 'completed',
      level: 'B1',
      feedback: { summary: 'Ты говоришь связно и уверенно.', strengths: ['Длинные фразы без пауз'] },
    })
    // стенограмма речи в конверт не попадает — отчёту она не нужна
    expect(JSON.stringify(state.attempts.at(-1))).not.toContain('I goed to the park')

    await results.locator('#prLearn').click()
    await page.getByRole('button', { name: 'Учиться самостоятельно' }).click()
    const report = page.locator('.pl-report')
    await expect(report).toContainText('Отзыв о говорении', { timeout: 20000 })
    await expect(report).toContainText('Ты говоришь связно и уверенно.')
    await expect(report).toContainText('Прошедшее время: went, а не goed')
  })
})

// Решение владельца 14.10: учившихся до теста v16 не заставлять — на «Главной» тест просто числится непройденным.
test.describe('учится до теста v16', () => {
  const OLD = '2026-09-01T10:00:00'

  test('анкеты нет — баннер зовёт на тест, но маршрут не «закрыт»', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
    await setup(page, { level: 'A2', createdAt: OLD })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-invite')).toContainText('Здесь будет ваш маршрут', { timeout: 20000 })
    await expect(page.locator('.ge-locked')).toHaveCount(0)
    await page.locator('.ge-invite').getByRole('button', { name: 'Пройти тест уровня' }).click()
    await expect(page.locator('.pl-page__frame')).toBeVisible()
  })

  test('маршрут есть — он на месте, «Результаты теста уровня» пустые и зовут на тест', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'на телефоне «Главная» строго по приложению: блоки GE, план и отчёт теста скрыты (спека 2026-10-26)')
    const goal = profileFrom({ purpose: 'work', targetLevel: 'B2', deadlineWindow: 'none', dailyMinutes: 30, startMode: null }, 'A2', 'self_study')
    await setup(page, { level: 'A2', createdAt: OLD, profile: goal })
    await page.goto('/?screen=home')
    await expect(page.locator('.ge-goal')).toBeVisible({ timeout: 20000 })
    const missing = page.locator('.pl-report--missing')
    await expect(missing).toContainText('Не пройден')
    await expect(page.locator('.ge-locked')).toHaveCount(0)
    await missing.getByRole('button', { name: 'Пройти тест уровня' }).click()
    await expect(page.locator('.pl-page__frame')).toBeVisible()
  })
})

test.describe('тур', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  // Макет «Первый заход» и решение владельца 21.10.2026: приветствие → подсказки → новому ученику тест открывается сам.
  test('новый ученик без уровня: приветствие, первая подсказка — про закрытый роадмап, после тура сразу тест', async ({ page }) => {
    await setup(page, { level: null, tours: true })
    await page.goto('/?screen=home')
    await expect(page.locator('.t-tour__intro')).toContainText('Сакен', { timeout: 20000 })
    await page.locator('.t-tour__intro-go').click()
    await expect(page.locator('.t-tour__title')).toHaveText('Здесь будет ваш маршрут')
    await page.locator('.t-tour__skip').click()
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
    await expect(page.locator('.pl-page__frame')).toBeVisible({ timeout: 20000 })
  })

  test('учившийся до теста: тест остаётся на «Главной», после тура — окно «Жёсткий режим»', async ({ page }) => {
    await setup(page, { level: 'A2', tours: true, createdAt: '2026-09-01T10:00:00' })
    await page.goto('/?screen=home')
    await expect(page.locator('.t-tour__intro')).toBeVisible({ timeout: 20000 })
    await page.locator('.t-tour__intro-skip').click()
    const invite = page.getByRole('dialog', { name: 'Жесткий режим общения' })
    await expect(invite).toBeVisible()
    await invite.getByRole('button', { name: 'Оставить обычный режим' }).click()
    await expect(invite).toHaveCount(0)
    await expect(page.locator('.pl-page__frame')).toHaveCount(0)
  })
})
