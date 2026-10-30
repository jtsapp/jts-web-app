import { test, expect } from '@playwright/test'
import { gateReply } from './helpers/login.js'

// «Главная» ученика на потолке курса (homeTopState → finish): уровень C1, анкеты GE нет — цель выше не поставить.
// До 31.10.2026 он получал прежнюю карточку уровня поверх нового макета; теперь сверху баннер «финиш курса».
// Бэкенд подменён — проверяем экран.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const profile = {
  onboarded: false,
  purpose: null,
  targetLevel: null,
  fromLevel: null,
  deadlineDate: null,
  deadlineWindow: null,
  dailyMinutes: null,
  startMode: null,
  route: null,
  onboardedAt: null,
  deadline: { state: 'none', date: null, daysRemaining: null, approximate: false },
  journey: { start: null, current: { level: 'C1', percent: 0 }, target: null, reached: false },
}

async function setup(page) {
  await page.addInitScript((token) => {
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('jts_tours_off', '1')
  }, jwt)
  const me = { userId: 7, name: 'Дарига', role: 'STUDENT', phone: '77001234567', languageLevel: 'C1', isDemoAccount: false }
  await page.route('**/api/profile?**', (route) =>
    route.request().method() === 'GET' ? route.fulfill(json({ profile: null })) : route.fallback(),
  )
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    const gate = gateReply(url)
    if (gate) return route.fulfill(json(gate))
    if (url.includes('/mobile/ge/profile')) return route.fulfill(json(profile))
    if (url.includes('/mobile/ge/plan')) return route.fulfill(json({ state: 'no_onboarding', tasks: [] }))
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'C1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'C1', next: null, track: 'SELF_STUDY', percent: 0, done: 0, total: 0, remaining: 0 }))
    }
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => route.fulfill(json({ configured: true, goal: null })))
}

test('C1 без анкеты: сверху «финиш курса», кнопка ведёт в практику', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'на телефоне «Главная» строго по приложению: баннеры GE скрыты')
  await setup(page)
  await page.goto('/?screen=home')
  const hero = page.locator('.ge-finish')
  await expect(hero).toBeVisible({ timeout: 20000 })
  await expect(hero.getByRole('heading', { name: 'Вы дошли до финиша курса' })).toBeVisible()
  await expect(hero).toContainText('C1 — вершина General English')
  // прежней карточки уровня на компьютере нет, «Начните отсюда» не предлагаем — теста и маршрута у финиша нет
  await expect(page.locator('.hm-level')).toBeHidden()
  await expect(page.locator('.hm-start')).toHaveCount(0)
  // фон и маскот баннера — картинки; снимок до их загрузки показывал пустую плашку
  await expect
    .poll(() => hero.locator('img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)), { timeout: 15000 })
    .toBe(true)
  await page.screenshot({ path: info.outputPath('home-finish-desktop.png') })
  await hero.getByRole('button', { name: 'Перейти к практике' }).click()
  await expect(page.locator('.hm-level')).toHaveCount(0)
  await expect(hero).toHaveCount(0)
})

test('C1 без анкеты на телефоне: баннер скрыт, карточка уровня на месте', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'телефонный вид')
  await setup(page)
  await page.goto('/?screen=home')
  await expect(page.locator('.hm-level--phone')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('.ge-finish')).toBeHidden()
  await page.screenshot({ path: info.outputPath('home-finish-phone.png') })
})
