import { test, expect } from '@playwright/test'

// Регрессия разгейта TUTOR_ONLY_SECTIONS: на проде (TUTOR_ONLY=true) помимо
// тьютора открыты Практика и Словарь — они видны в сайдбаре и открываются
// кликом, включая внутренний экран «Аудирование» (баннер в Практике).
// Скрытые разделы (Обучение, Уроки, IELTS) в сайдбаре отсутствуют.
// Бэкенд замокан: интересует только видимость пунктов и маршрутизация.

async function loginToTutorZone(page) {
  const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/auth/otp/request', (r) => r.fulfill(json({ ok: true })))
  await page.route('**/auth/otp/verify', (r) => r.fulfill(json({ accessToken: 'e2e-token', name: 'Тест' })))
  await page.route('**/user/language-level', (r) => r.fulfill(json({ languageLevel: 'B1' })))
  await page.route('**/api/profile/merge', (r) => r.fulfill(json({ ok: true })))
  await page.route('**/api/profile?**', (r) => r.fulfill(json({ configured: true, profile: null })))
  // Данные разделов: пустые списки — хватает, чтобы экраны отрисовали каркас.
  await page.route('**/mobile/balance/info', (r) => r.fulfill(json({ coins: 0, streak: 0 })))
  await page.route('**/mobile/media-clips', (r) => r.fulfill(json([])))
  await page.route('**/mobile/situativki**', (r) => r.fulfill(json([])))
  await page.route('**/mobile/audio-lessons', (r) => r.fulfill(json([])))
  await page.route('**/mobile/saved-words', (r) => r.fulfill(json([])))

  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.locator('.phone-field input').fill('7771234567')
  await page.locator('.form-primary').click()
  const boxes = page.locator('.otp-box')
  await expect(boxes.first()).toBeVisible()
  await boxes.first().click()
  await page.keyboard.type('1234')
  await page.locator('.form-primary').click()
  await expect(page.locator('.t-welcome__title')).toBeVisible({ timeout: 10_000 })
}

// На мобилке сайдбар — drawer за гамбургером; на десктопе — статичная колонка.
async function openSidebar(page) {
  const burger = page.locator('.mtop__menu')
  if (await burger.isVisible()) await burger.click()
}

test('сайдбар: только Практика, Тьютор и Словарь', async ({ page }) => {
  await loginToTutorZone(page)
  await openSidebar(page)

  const items = page.locator('.sb__nav .sb__item')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toHaveText('Практика')
  await expect(items.nth(1)).toHaveText('Тьютор')
  await expect(items.nth(2)).toHaveText('Словарь')
})

test('Практика открывается из сайдбара, баннер ведёт в Аудирование', async ({ page }) => {
  await loginToTutorZone(page)
  await openSidebar(page)

  await page.locator('.sb__nav .sb__item', { hasText: 'Практика' }).click()
  // Хаб практики: секции на месте, включая новый баннер «Аудирование».
  await expect(page.locator('.pp-listen')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('#sec-Сказки')).toBeVisible()

  // Баннер уводит на внутренний экран тренажёра (case 'listening' в App.jsx).
  await page.locator('.pp-listen__cta').click()
  await expect(page.locator('.lt-intro')).toBeVisible({ timeout: 10_000 })
})

test('Словарь открывается из сайдбара', async ({ page }) => {
  await loginToTutorZone(page)
  await openSidebar(page)

  await page.locator('.sb__nav .sb__item', { hasText: 'Словарь' }).click()
  await expect(page.locator('.vc')).toBeVisible({ timeout: 10_000 })
})
