import { test, expect } from '@playwright/test'

// Присланная ссылка переживает вход.
//
// `?screen=…` открывается и гостю, поэтому пришедший по ссылке сразу видит
// раздел. Но стоило пойти логиниться — и намерение пропадало: адрес чистит
// эффект синхронизации (экраны входа в `?screen=` не пишутся), а после входа
// экран назначает homeScreenFor. Человек, открывший присланную
// ссылку на свою домашку, оказывался на «Главной» и искал задание руками.
//
// Проверяем по адресной строке: приложение само пишет туда текущий экран
// (PERSISTABLE_SCREENS в App.jsx), так что адрес — прямое свидетельство того,
// где человек оказался.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const TOKEN = (() => {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role: 'STUDENT', userId: 900, exp: Math.floor(Date.now() / 1000) + 3600 })}.s`
})()

const УЧЕНИК = { id: 900, name: 'Ученик', role: 'STUDENT', languageLevel: 'B1' }

/** Гость: токена нет, восстанавливать нечего; вход по паролю отвечает успехом. */
async function гостьСВходом(page) {
  await page.addInitScript(() => localStorage.removeItem('jts_access_token'))
  // Восстановление сессии не должно найти пользователя — иначе это уже не гость.
  await page.route('**/api/auth/me', (r) => r.fulfill(json({})))
  await page.route('**/api/profile?**', (r) => r.fulfill(json({ configured: true, profile: null })))
  await page.route('**/api/profile/merge', (r) => r.fulfill(json({ ok: true })))
  await page.route('**/user/me', (r) => r.fulfill(json(УЧЕНИК)))
  await page.route('**/user/language-level', (r) => r.fulfill(json('B1')))
  await page.route('**/auth/login', (r) => r.fulfill(json({
    accessToken: TOKEN, refreshToken: 'r', userId: 900, name: 'Ученик', role: 'STUDENT',
  })))
}

/**
 * Вход по паролю — те же селекторы, что в tests/trial-booth.spec.js.
 *
 * Сначала уходим на корень: кнопки входа на самом разделе нет. Гость видит там
 * подсказку «нужно войти» (homework.needAuth) и идёт на главную страницу сам —
 * это и есть настоящий путь, на котором намерение терялось. Ссылка при этом
 * уже запомнена: её положили в момент применения диплинка.
 */
async function войти(page) {
  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.getByPlaceholder('Телефон или почта').fill('student@example.com')
  await page.getByPlaceholder('Пароль').fill('secret')
  await page.locator('.form-primary').click()
}

test('пришедший по ссылке после входа попадает туда, куда шёл', async ({ page }) => {
  await гостьСВходом(page)

  // Домашняя работа — ровно та ссылка, которую шлёт уведомление
  // (lib/studentDeepLink.js), и ровно тот экран, который без входа бесполезен.
  await page.goto('/?screen=homework')
  // Гостю экран открывается сразу — это и было всегда, — но работать с ним
  // нечем: он показывает подсказку «нужно войти».
  await expect(page).toHaveURL(/screen=homework/)

  await войти(page)

  // Возврат на присланный экран, а не на домашний экран роли.
  await expect(page).toHaveURL(/screen=homework/, { timeout: 15_000 })
  await expect(page).not.toHaveURL(/screen=home(?:&|$)/)
})

test('без ссылки вход по-прежнему ведёт на домашний экран роли', async ({ page }) => {
  await гостьСВходом(page)

  await войти(page)

  // Правка не должна менять обычный вход: ученику — «Главная».
  await expect(page).toHaveURL(/screen=home(?:&|$)/, { timeout: 15_000 })
})

test('намерение съедается: второй вход в той же вкладке уже не уводит по старой ссылке', async ({ page }) => {
  await гостьСВходом(page)

  await page.goto('/?screen=homework')
  await войти(page)
  await expect(page).toHaveURL(/screen=homework/, { timeout: 15_000 })

  // Выход и повторный вход — уже про другое. sessionStorage НЕ трогаем: в том и
  // проверка, что намерение съедено первым же входом. Не съедай мы его, человек
  // возвращался бы на чужой текст при каждом входе в этой вкладке — в том числе
  // под другим аккаунтом.
  await page.evaluate(() => localStorage.removeItem('jts_access_token'))
  await войти(page)

  await expect(page).toHaveURL(/screen=home(?:&|$)/, { timeout: 15_000 })
})
