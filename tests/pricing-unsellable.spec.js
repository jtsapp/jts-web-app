import { test, expect } from '@playwright/test'
import { gateReply } from './helpers/login.js'

// 15.11.2026 на проде у 46 из 49 тарифов не было тарифа уроков или срока: «Купить» вело к 422 OFFER_UNAVAILABLE,
// и витрина молча открывала WhatsApp. Теперь непродаваемого нет в списке, а отказ сервера объясняется в корзине.
// Бэкенд подменён целиком: настоящий заказ завёл бы платёж, заявка — сделку в amoCRM.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.SHOT_DIR

const offer = (code, title, price, lessons, purchasable) => ({ code, kind: 'INDIVIDUAL', title, price, currency: 'KZT',
  lessons, durationMinutes: 60, months: 1, channels: ['WEB_FREEDOM'], purchasable })
const CATALOG = [
  offer('ind-60-8', '8 уроков', 60000, 8, true),
  offer('ind-60-12', '12 уроков', 90000, 12, true),
  offer('ind-60-24', '24 урока', 168000, 24, false),
]

async function signIn(page, { refuse }) {
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A1', isDemoAccount: false }
  const calls = { orders: 0, catalog: 0 }
  let catalog = CATALOG
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt)
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    const gate = gateReply(url)
    if (gate) return route.fulfill(json(gate))
    if (url.includes('/catalog/offers')) {
      calls.catalog += 1
      return route.fulfill(json(catalog))
    }
    if (url.includes('/mobile/orders') && route.request().method() === 'POST') {
      calls.orders += 1
      // Тариф сняли с продажи, пока ученик выбирал: сервер отказывает, и следующий каталог его уже не отдаёт.
      catalog = CATALOG.map((o) => (o.code === refuse ? { ...o, purchasable: false } : o))
      return route.fulfill(json({ code: 'OFFER_UNAVAILABLE', messages: ['Предложение недоступно: ' + refuse] }, 422))
    }
    if (url.includes('/mobile/leads')) return route.fulfill(json({ accepted: true }))
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  await page.route('**/api/landing/checkout**', (route) => route.fulfill(json({ origin: null })))
  return calls
}

const tile = (page, title) => page.locator('.pr-tile').filter({ has: page.locator('.pr-tile__title', { hasText: new RegExp(`^${title}$`) }) })

test('непродаваемого тарифа нет на витрине', async ({ page }) => {
  await signIn(page, { refuse: 'ind-60-12' })
  await page.goto('/?screen=pricing')
  await expect(tile(page, '8 уроков')).toBeVisible()
  await expect(tile(page, '12 уроков')).toBeVisible()
  await expect(tile(page, '24 урока')).toHaveCount(0)
})

test('отказ 422 — причина в корзине, WhatsApp не открывается, тариф уходит', async ({ page, context }, info) => {
  const calls = await signIn(page, { refuse: 'ind-60-12' })
  const popups = []
  context.on('page', (p) => popups.push(p.url()))
  await page.goto('/?screen=pricing')

  await tile(page, '12 уроков').getByLabel('Добавить в заказ').click()
  await page.locator('.pr-cart__pay').click()
  await page.getByRole('button', { name: /Оплатить картой/ }).click()

  const alert = page.locator('.pr-refused')
  await expect(alert).toContainText('нельзя оплатить онлайн')
  await expect(alert.getByRole('link', { name: 'Написать менеджеру' })).toBeVisible()
  await expect(tile(page, '12 уроков')).toHaveCount(0)
  await expect(page.locator('.pr-line')).toHaveCount(0)
  expect(calls.orders).toBe(1)
  expect(calls.catalog).toBeGreaterThanOrEqual(2)
  await page.waitForTimeout(500)
  expect(popups).toEqual([])
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/refused-${info.project.name}.png`, fullPage: false })
})
