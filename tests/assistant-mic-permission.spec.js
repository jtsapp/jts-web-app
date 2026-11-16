import { test, expect } from '@playwright/test'
import { mockGates } from './helpers/login.js'

// Просьба Луны о микрофоне (задача 202, 16.11.2026, владелец: «сделать запрос как на Speaking Buddy»). Разрешение
// браузера подменено (navigator.permissions.query): у headless-Chrome своего окна разрешения нет, а с флагом
// fake-ui он отвечает «разрешено» сам. Запись при «разрешено» — настоящая, с фальшивого микрофона Chrome.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] },
})

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function setup(page, { permission = 'prompt', lang = 'ru' } = {}) {
  await page.addInitScript(
    ({ permission, lang }) => {
      localStorage.setItem('jts_access_token', 'test-token')
      localStorage.setItem('lang', lang)
      window.__micPerm = permission
      const status = { get state() { return window.__micPerm }, addEventListener() {}, removeEventListener() {} }
      const query = navigator.permissions.query.bind(navigator.permissions)
      navigator.permissions.query = (d) => (d?.name === 'microphone' ? Promise.resolve(status) : query(d))
      const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      window.__gum = 0
      navigator.mediaDevices.getUserMedia = (c) => {
        window.__gum += 1
        if (window.__micPerm === 'denied') return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
        return gum(c)
      }
    },
    { permission, lang },
  )
  // «Документы платформы» и разделы тарифа встают поверх кабинета (helpers/login.js) — здесь они приняты.
  await mockGates(page)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  // Первая реплика при открытии окна — свой тест (assistant-opening.spec.js); здесь окно открывается пустым.
  await page.route('**/api/assistant/chat', (r) => r.fulfill(json({ error: 'model_failed' }, 502)).catch(() => {}))
}

async function openWindow(page, { lang = 'ru' } = {}) {
  await page.goto('/?screen=home')
  await page.getByRole('button', { name: lang === 'kk' ? 'Көмекші' : 'Помощник' }).click()
  await expect(page.getByRole('dialog', { name: lang === 'kk' ? 'Айзере' : 'Луна' })).toBeVisible()
}

// Плашка поверх всего: в центре её кнопки — сама кнопка, а не окно Луны или шапка экрана.
async function onTop(page, locator) {
  const box = await locator.boundingBox()
  const vp = page.viewportSize()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width)
  expect(box.y).toBeGreaterThanOrEqual(0)
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.t-micperm') != null, {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  })
  expect(hit).toBe(true)
}

test('браузер ещё не спрашивал — плашка как у Speaking Buddy, «Разрешить» начинает вопрос', async ({ page }) => {
  await setup(page)
  await openWindow(page)
  await page.getByRole('button', { name: 'Спросить голосом' }).click()
  const plate = page.locator('.t-micperm')
  await expect(plate).toBeVisible()
  await expect(plate).toHaveAttribute('data-mic-perm', 'ask')
  await expect(plate).toContainText('Чтобы спросить голосом, разреши микрофон в браузере')
  await expect(plate.locator('.t-micperm__chip--arrow')).toBeVisible()
  // Микрофон ещё не тронут: сначала объяснение.
  expect(await page.evaluate(() => window.__gum)).toBe(0)
  const allow = page.getByRole('button', { name: 'Разрешить, когда я на сайте' })
  await onTop(page, allow)
  await allow.click()
  await expect(plate).toHaveCount(0)
  await expect(page.locator('.asst__listening')).toContainText('Слушаю')
})

test('разрешение уже есть — вопрос голосом сразу, без плашки', async ({ page }) => {
  await setup(page, { permission: 'granted' })
  await openWindow(page)
  await page.getByRole('button', { name: 'Спросить голосом' }).click()
  await expect(page.locator('.asst__listening')).toContainText('Слушаю')
  await expect(page.locator('.t-micperm')).toHaveCount(0)
})

test('браузер запретил — плашка объясняет, где снять запрет; «Не сейчас» её закрывает', async ({ page }) => {
  await setup(page, { permission: 'denied' })
  await openWindow(page)
  await page.getByRole('button', { name: 'Спросить голосом' }).click()
  const plate = page.locator('.t-micperm')
  await expect(plate).toHaveAttribute('data-mic-perm', 'blocked')
  await expect(plate).toContainText('Микрофон заблокирован в браузере')
  await expect(plate.locator('.asst__perm-steps li').first()).toContainText('слева от адреса')
  await expect(plate.locator('.asst__perm-steps li').last()).toContainText('Попробовать снова')
  await onTop(page, page.getByRole('button', { name: 'Попробовать снова' }))

  // Запрет не снят — попытка честно упирается в него же, плашка остаётся.
  await page.getByRole('button', { name: 'Попробовать снова' }).click()
  await expect(plate).toHaveAttribute('data-mic-perm', 'blocked')
  expect(await page.evaluate(() => window.__gum)).toBe(1)

  // Ученик снял запрет — следующая попытка пишет вопрос.
  await page.evaluate(() => (window.__micPerm = 'granted'))
  await page.getByRole('button', { name: 'Попробовать снова' }).click()
  await expect(page.locator('.asst__listening')).toContainText('Слушаю')
  await expect(plate).toHaveCount(0)
})

test('«Не сейчас» закрывает плашку, а строки «нет доступа» внизу окна нет', async ({ page }) => {
  await setup(page, { permission: 'denied' })
  await openWindow(page)
  await page.getByRole('button', { name: 'Спросить голосом' }).click()
  await page.getByRole('button', { name: 'Не сейчас' }).click()
  await expect(page.locator('.t-micperm')).toHaveCount(0)
  await expect(page.locator('.asst__err')).toHaveCount(0)
})

test('казахский интерфейс — просит Айзере, по-казахски', async ({ page }) => {
  await setup(page, { lang: 'kk' })
  await openWindow(page, { lang: 'kk' })
  await page.getByRole('button', { name: 'Дауыспен сұрау' }).click()
  const plate = page.locator('.t-micperm')
  await expect(plate).toContainText('Айзере тек сұрағыңды естиді')
  await onTop(page, page.getByRole('button', { name: 'Сайтта болғанда рұқсат ету' }))
})
