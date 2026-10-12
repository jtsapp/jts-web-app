import { test, expect } from '@playwright/test'

// Анкета General English на «Главной» (спека 2026-10-12): учащийся без анкеты видит приглашение, проходит анкету,
// выбирает формат и попадает на блок цели; правка цели — три шага. Бэкенд подменён — проверяем экраны и запросы.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

function profileFrom(body, route = null) {
  return {
    onboarded: true,
    purpose: body.purpose,
    targetLevel: body.targetLevel,
    fromLevel: 'A2',
    deadlineDate: body.deadlineDate,
    deadlineWindow: body.deadlineDate ? 'date' : body.deadlineWindow,
    dailyMinutes: body.dailyMinutes,
    startMode: body.startMode,
    route,
    onboardedAt: '2026-10-12T10:00:00',
    deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
    journey: { start: 'A2', current: { level: 'A2', percent: 50 }, target: body.targetLevel, reached: false },
  }
}

async function setup(page, initial) {
  const state = { profile: initial, puts: [] }
  await page.addInitScript((token) => {
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('jts_tours_off', '1')
  }, jwt)
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A2', isDemoAccount: false }
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
        state.profile = profileFrom(body, state.profile?.route ?? null)
      }
      return route.fulfill(json(state.profile))
    }
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A2' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'A2', next: 'B1', track: 'SELF_STUDY', percent: 50, done: 18, total: 36, remaining: 18 }))
    }
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
  return state
}

test('учащийся без анкеты: приглашение → анкета → маршрут → блок цели', async ({ page }) => {
  const state = await setup(page, { onboarded: false })
  await page.goto('/?screen=home')
  const invite = page.locator('.ge-invite')
  await expect(invite).toContainText('Составим ваш план', { timeout: 20000 })
  await invite.getByRole('button').click()

  await expect(page.getByText('Шаг 1 из 4')).toBeVisible()
  await page.getByRole('radio', { name: /Работа и карьера/ }).click()
  await page.locator('.ih-ob__cta').click()
  await expect(page.getByRole('radio', { name: /^A2/ })).toBeDisabled()
  await page.getByRole('radio', { name: /^B2/ }).click()
  await page.locator('.ih-ob__cta').click()
  await page.getByRole('radio', { name: /Без срока/ }).click()
  await page.locator('.ih-ob__cta').click()
  await expect(page.locator('.ih-obday__term').first()).toContainText('до цели')
  await page.locator('.ih-ob__cta').click()

  await expect(page.getByRole('heading', { name: 'Как дойти до B2' })).toBeVisible()
  await expect(page.locator('.ih-route__opt')).toHaveCount(3)
  await expect(page.locator('.ih-route__opt.is-rec h2')).toHaveText('В группе')
  await page.getByRole('button', { name: 'Учиться самостоятельно' }).click()

  await expect(page.locator('.ge-goal')).toBeVisible()
  await expect(page.locator('.ge-goal')).toContainText('Срок не указан')
  expect(state.puts).toEqual([{ purpose: 'work', targetLevel: 'B2', deadlineDate: null, deadlineWindow: 'none', dailyMinutes: 30, startMode: null }])
  expect(state.profile.route).toBe('self_study')
})

test('правка цели с «Главной» — три шага и снова маршрут', async ({ page }) => {
  await setup(page, profileFrom({ purpose: 'work', targetLevel: 'B2', deadlineDate: null, deadlineWindow: 'none', dailyMinutes: 30, startMode: null }, 'self_study'))
  await page.goto('/?screen=home')
  await expect(page.locator('.ge-goal')).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: /Указать срок/ }).click()
  await expect(page.getByText('Шаг 1 из 3')).toBeVisible()
  await page.locator('.ih-ob__cta').click()
  await page.getByRole('radio', { name: /Через 3–6 месяцев/ }).click()
  await page.locator('.ih-ob__cta').click()
  await page.locator('.ih-ob__cta').click()
  await expect(page.getByRole('heading', { name: 'Как дойти до B2' })).toBeVisible()
})
