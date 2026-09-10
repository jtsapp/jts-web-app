import { test, expect } from '@playwright/test'
import { FRESH_PROFILE, walkTour } from './tour-helper.js'

// Онбординг-тур «Уроков», «Домашней работы» и «Словаря» — движок общий с
// «Практикой» (см. practice-learning-tour.spec.js), проверяем своё:
//   — тур ученический: у преподавателя его нет ни автоматом, ни кнопкой «?»;
//   — экран с незагруженными данными тур не «съедает»: он закрывается без
//     отметки и выходит снова, когда данные приехали;
//   — шаги локализованы и карточка не накрывает подсветку.

// JWT с ролью — подписи никто не проверяет на клиенте, важен только payload
// (см. src/lib/jwt.js: роль читается из base64-середины токена).
const jwt = (role) =>
  ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role, sub: '1' })).toString('base64url'), 'sig'].join('.')

const auth = async (page, role = 'USER') => {
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt(role))
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { userId: 1, name: 'Test', role: 'USER', languageLevel: 'A2' } }),
    }),
  )
}

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

// Тур должен выйти — значит, профиль чистый (прогон целиком идёт с погашенными).
test.use(FRESH_PROFILE)

test.describe('онбординг-тур «Уроков»', () => {
  test('у ученика выходит сам, у преподавателя его нет', async ({ page, viewport }) => {
    await auth(page, 'USER')
    await page.goto('/?screen=lessons')
    await expect(page.locator('.ls__tabs')).toBeVisible({ timeout: 15000 })
    await walkTour(page, viewport)

    // Второй заход — тихо.
    await page.goto('/?screen=lessons')
    await expect(page.locator('.ls__tabs')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(700)
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
  })

  test('преподавателю тур не показывается и кнопки «?» у него нет', async ({ page }) => {
    await auth(page, 'TEACHER')
    await page.goto('/?screen=lessons')
    await expect(page.locator('.ls__tabs')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(900)
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)
    await expect(page.locator('.tour-help')).toHaveCount(0)
  })
})

test.describe('онбординг-тур «Домашней работы»', () => {
  const HOMEWORK = [
    {
      id: 7,
      title: 'Unit 3 — письмо другу',
      status: 'ASSIGNED',
      materials: [],
      answers: [],
      dueDate: '2026-12-31T00:00:00Z',
    },
  ]

  test('ждёт загруженный список и не сгорает на пустом экране', async ({ page, viewport }) => {
    await auth(page)
    // Первый заход — список не приехал: тур не должен ни показаться, ни
    // «сгореть» отметкой, иначе ученик не увидит его уже никогда.
    await page.route('**/admin/homework/my', (route) => route.fulfill({ status: 500, body: '{}' }))
    await page.route('**/student/assignments', (route) => route.fulfill(json([])))
    await page.goto('/?screen=homework')
    await expect(page.locator('.hw__error')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.t-tour__pop')).toHaveCount(0)

    // Второй заход, данные на месте — тур выходит.
    await page.unroute('**/admin/homework/my')
    await page.route('**/admin/homework/my', (route) => route.fulfill(json(HOMEWORK)))
    await page.goto('/?screen=homework')
    await expect(page.locator('.hw-list')).toBeVisible({ timeout: 15000 })
    await walkTour(page, viewport)
  })
})

test.describe('онбординг-тур «Словаря»', () => {
  const CATALOG = {
    levels: [
      { id: 'A1', name: 'A1', cards: 120 },
      { id: 'A2', name: 'A2', cards: 140 },
    ],
    fields: [{ id: 'work', key: 'work', en: 'Work', ru: 'Работа', kk: 'Жұмыс', cards: 40 }],
  }

  test('выходит сам на домашнем экране словаря', async ({ page, viewport }) => {
    await auth(page)
    await page.route('**/mobile/vocab-catalog', (route) => route.fulfill(json(CATALOG)))
    await page.goto('/?screen=vocab')
    await expect(page.locator('#vsec-levels')).toBeVisible({ timeout: 15000 })
    await walkTour(page, viewport)

    // «?» открывает заново.
    await page.locator('.tour-help:visible').click()
    await expect(page.locator('.t-tour__pop')).toBeVisible()
  })
})
