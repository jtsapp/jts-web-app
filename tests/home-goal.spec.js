import { test, expect } from '@playwright/test'
import { FRESH_PROFILE } from './tour-helper.js'

// Цель уровня на «Главной»: цель выбирают медалью (тур её больше не спрашивает —
// с 21.10.2026 это делает тест уровня), дорожка сразу перестраивается до неё,
// выбор уходит на сервер и переживает перезагрузку. Бэкенд JTS и свои ручки
// подменены — проверяем сам экран.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test.use(FRESH_PROFILE)

async function setup(page) {
  const state = { goal: null, puts: [] }
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt)
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A0', isDemoAccount: false }
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A0' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'A0', next: 'A1', percent: 25, done: 6, total: 24, remaining: 18 }))
    }
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/profile/level-goal', (route) => {
    if (route.request().method() === 'PUT') {
      state.goal = JSON.parse(route.request().postData())
      state.puts.push(state.goal)
    }
    return route.fulfill(json({ configured: true, goal: state.goal }))
  })
  return state
}

const labels = (page) => page.locator('.hm-level__track .hm-level__lbl').allTextContents()

test('первый заход: тур без вопроса о цели, цель с медали переживает перезагрузку', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/?screen=home')

  // Тур начинается приветствием (макет «Первый заход», 21.10.2026), первая подсказка — про прогресс, без выбора.
  await page.locator('.t-tour__intro-go').click({ timeout: 20000 })
  const pop = page.locator('.t-tour__pop')
  await expect(pop).toBeVisible({ timeout: 20000 })
  await expect(pop.locator('.t-tour__title')).toHaveText('Здесь виден ваш прогресс')
  await expect(pop.getByRole('radio')).toHaveCount(0)
  await expect(pop.locator('.t-tour__ok')).toBeEnabled()

  // Тур идёт по остальным карточкам и закрывается; цель он не трогал.
  while (await pop.count()) {
    await pop.locator('.t-tour__ok').click()
    await page.waitForTimeout(400)
  }
  expect(state.puts).toEqual([])
  // после тура один раз предлагают «Жёсткий режим» — отказываемся
  await page.getByRole('dialog', { name: 'Жесткий режим общения' }).getByRole('button', { name: 'Оставить обычный режим' }).click()

  await page.locator('.hm-level__goal').click()
  const dlg = page.getByRole('dialog', { name: 'Ваша цель' })
  await dlg.getByRole('radio', { name: /B2/ }).click()
  await expect.poll(() => labels(page)).toEqual(['Старт', 'A1', 'A2', 'B1', 'Финиш · B2'])
  await expect(page.locator('.hm-level__goal')).toContainText('Цель — B2')
  expect(state.puts).toEqual([{ target: 'B2', from: 'A0' }])

  // Второй заход: тур уже пройден, цель на месте.
  await page.reload()
  await expect(page.locator('.hm-level')).toBeVisible({ timeout: 20000 })
  await expect.poll(() => labels(page)).toEqual(['Старт', 'A1', 'A2', 'B1', 'Финиш · B2'])
  await page.waitForTimeout(700)
  await expect(pop).toHaveCount(0)
})

test('медаль открывает смену цели', async ({ page }) => {
  await setup(page)
  // Тур этого теста не касается — гасим, чтобы не перехватывал клики.
  await page.addInitScript(() => localStorage.setItem('jts_tours_off', '1'))
  await page.goto('/?screen=home')
  await expect(page.locator('.hm-level__goal')).toBeVisible({ timeout: 20000 })

  await page.locator('.hm-level__goal').click()
  const dlg = page.getByRole('dialog', { name: 'Ваша цель' })
  await expect(dlg).toBeVisible()
  await dlg.getByRole('radio', { name: /B1/ }).click()

  await expect(dlg).toHaveCount(0)
  await expect.poll(() => labels(page)).toEqual(['Старт', 'Уровень A1', 'Уровень A2', 'Финиш · B1'])
})
