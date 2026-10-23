import { test, expect } from '@playwright/test'
import { FRESH_PROFILE } from './tour-helper.js'

// Тур «Главной» и «Поздравляем с покупкой!» не открываются разом (жалоба
// 22.10.2026: менеджер снял демо-флаг, ученик зашёл — карточка тура «Ваша
// практика» легла поверх окна покупки, а его кнопку накрыло затемнение тура).
// Окно — событие, тур подождёт: сначала поздравление, после «Отлично» — тур.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test.use(FRESH_PROFILE)

async function setup(page) {
  // Аккаунт был демо на этом браузере (purchaseCelebration.js помнит), а теперь — нет.
  await page.addInitScript((token) => {
    localStorage.setItem('jts_access_token', token)
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('jts_was_demo', '1')
      sessionStorage.setItem('seeded', '1')
    }
  }, jwt)
  const me = { userId: 7, name: 'Акежан', role: 'USER', languageLevel: 'A1', isDemoAccount: false }
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/mobile/level-progress')) {
      return route.fulfill(json({ level: 'A1', next: 'A2', percent: 25, done: 6, total: 24, remaining: 18 }))
    }
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
}

test('окно покупки открывается без тура, тур — после него', async ({ page }) => {
  await setup(page)
  await page.goto('/?screen=home')

  const bought = page.getByRole('dialog', { name: 'Поздравляем с покупкой!' })
  await expect(bought).toBeVisible({ timeout: 20000 })
  // Тур успел бы решить открыться за это время (useScreenTour ждёт только данные «Главной»).
  await expect(page.locator('.hm-level')).toBeVisible({ timeout: 20000 })
  await page.waitForTimeout(1500)
  await expect(page.locator('.t-tour')).toHaveCount(0)

  // Кнопка окна доступна: её не накрывает затемнение тура.
  await bought.getByRole('button').click()
  await expect(bought).toHaveCount(0)

  // Теперь — тур с приветствия.
  await expect(page.locator('.t-tour__intro-go')).toBeVisible({ timeout: 10000 })
})
