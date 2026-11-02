import { test, expect } from '@playwright/test'
import { gateReply } from './helpers/login.js'

// Демо кончилось — плашки зовут на пробный урок, а не к пакетам с ценами, но сами
// тарифы остаются доступны (решение 02.11.2026). Заявку подменяем: настоящая
// завела бы сделку в amoCRM.

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'USER', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.SHOT_DIR

async function signInDemo(page, { demoExpiresAt }) {
  const me = { userId: 7, name: 'Сакен', role: 'USER', languageLevel: 'A1', isDemoAccount: true, demoExpiresAt }
  const trial = { requested: false, requestedAt: null, teacherAssigned: false, managerAssigned: false }
  const posts = []
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt)
  await page.route(/justtostudy\.kz/, (route) => {
    const url = route.request().url()
    const gate = gateReply(url)
    if (gate) return route.fulfill(json(gate))
    if (url.includes('/mobile/trial-request')) {
      if (route.request().method() === 'POST') {
        posts.push(url)
        trial.requested = true
        trial.requestedAt = '2026-11-02T10:00:00'
      }
      return route.fulfill(json(trial))
    }
    if (url.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A1' }))
    if (url.includes('/user/me')) return route.fulfill(json(me))
    if (url.includes('/admin/lessons/occurrences') || url.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  return posts
}

test('после конца демо вместо тарифов — заявка на пробный урок', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне плашки «Главной» нет (src/mobile/home.css)')
  const posts = await signInDemo(page, { demoExpiresAt: '2026-10-01T10:00:00' })
  await page.goto('/?screen=home')

  const banner = page.locator('.dm-banner')
  await expect(banner).toContainText('запишитесь на бесплатный пробный урок')
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-${info.project.name}.png` })
  await banner.getByRole('button', { name: 'Записаться на пробный урок' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Пробный доступ закончился')
  await expect(page).not.toHaveURL(/screen=pricing/)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/offer-${info.project.name}.png` })

  await dialog.getByRole('button', { name: 'Записаться на пробный урок' }).click()
  await expect(dialog).toContainText('Заявка принята')
  expect(posts).toHaveLength(1)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/booked-${info.project.name}.png` })

  await dialog.getByRole('button', { name: 'Вернуться' }).click()
  await expect(dialog).toHaveCount(0)
  // «Главная» узнала о заявке: плашка больше не зовёт, карточка рядом — тоже.
  await expect(banner).toContainText('менеджер свяжется с вами')
  await expect(banner.getByRole('button')).toHaveCount(0)
  await expect(page.locator('.hm-trial')).toContainText('Заявка принята')
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-booked-${info.project.name}.png` })
})

test('плашка скидки после конца демо — без цен и не на тарифы', async ({ page }, info) => {
  const posts = await signInDemo(page, { demoExpiresAt: '2026-10-01T10:00:00' })
  // Сайдбара на телефоне нет: там та же плашка стоит на вкладке «Сервисы».
  await page.goto(info.project.name === 'mobile' ? '/?screen=services' : '/?screen=home')

  const offer = page.locator('.dm-offer:visible')
  await expect(offer).toContainText('Пробный урок — бесплатно')
  await expect(offer).not.toContainText('₸')
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/card-${info.project.name}.png` })
  await offer.getByRole('button').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Пробный доступ закончился')
  // Плашка внизу страницы: окно обязано лечь на экран, а не остаться у начала страницы.
  const box = await page.locator('.ds-over').boundingBox()
  const view = page.viewportSize()
  expect(box).toEqual({ x: 0, y: 0, width: view.width, height: view.height })
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/dialog-${info.project.name}.png` })
  await dialog.getByRole('button', { name: 'Записаться на пробный урок' }).click()
  await expect(dialog).toContainText('Заявка принята')
  expect(posts).toHaveLength(1)
})

test('после конца демо тарифы доступны: тихая ссылка в окне', async ({ page }, info) => {
  await signInDemo(page, { demoExpiresAt: '2026-10-01T10:00:00' })
  await page.goto(info.project.name === 'mobile' ? '/?screen=services' : '/?screen=home')

  await page.locator('.dm-offer:visible').getByRole('button').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Пробный доступ закончился')
  await dialog.getByRole('button', { name: 'Посмотреть тарифы' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.pr__title')).toBeVisible()
})

test('после конца демо тарифы открываются и по прямому адресу', async ({ page }) => {
  await signInDemo(page, { demoExpiresAt: '2026-10-01T10:00:00' })
  await page.goto('/?screen=pricing')
  await expect(page.locator('.pr__title')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('пока демо идёт, кнопка плашки ведёт на тарифы', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне плашки «Главной» нет (src/mobile/home.css)')
  await signInDemo(page, { demoExpiresAt: new Date(Date.now() + 5 * 3600_000).toISOString() })
  await page.goto('/?screen=home')

  await page.locator('.dm-banner').getByRole('button', { name: 'Открыть полный доступ' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/screen=pricing/)
})
