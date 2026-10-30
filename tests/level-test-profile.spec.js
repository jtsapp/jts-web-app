import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { mockGates } from './helpers/login.js'

// Тест на уровень из профиля и после входа.
//
// С 14.10.2026 тест — v16 методиста (спека placement-v16-first-login): после входа его нет, он ждёт в закрытом
// роадмапе «Главной», поэтому присланная ссылка открывается сразу. Из профиля тест открывается тем же экраном. Где
// уровень в аккаунте уже есть, тест его НЕ меняет (решение владельца 30.09 — уровень открывает контент, а у оплативших
// его ставит тариф).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const TOKEN = (() => {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role: 'STUDENT', userId: 901, exp: Math.floor(Date.now() / 1000) + 3600 })}.s`
})()

// Номер обязателен: без него вход (и восстановленная сессия) уводит ученика на шаг «Укажите номер» (07.10.2026).
const УЧЕНИК = { id: 901, name: 'Ученик', role: 'STUDENT', phone: '77001234567' }

/**
 * Заглушки бэкенда. Сначала — общая для всех чужих хостов (иначе экраны ходили
 * бы в живой dev-server с поддельным токеном), потом частные: Playwright
 * проверяет обработчики в обратном порядке регистрации.
 * level = null — уровня в аккаунте нет (бэкенд отвечает 404).
 */
async function бэкенд(page, { level }) {
  await page.route((url) => url.hostname !== 'localhost', (r) => r.fulfill(json({})))
  // Поверх общей заглушки: на пустой ответ замки 29.10 («Документы платформы», разделы тарифа) встают поверх экрана.
  await mockGates(page)
  await page.route('**/api/profile?**', (r) => r.fulfill(json({ configured: true, profile: null })))
  await page.route('**/api/profile/merge', (r) => r.fulfill(json({ ok: true })))
  await page.route('**/user/me', (r) => r.fulfill(json({ ...УЧЕНИК, languageLevel: level })))
  await page.route('**/user/language-level', (r) =>
    r.request().method() === 'GET'
      ? r.fulfill(level ? json(level) : json({ message: 'not found' }, 404))
      : r.fulfill(json({ ok: true })))
}

/** Уже вошедший ученик: токен в localStorage, сессия восстанавливается. */
async function вошедший(page, { level }) {
  await бэкенд(page, { level })
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), TOKEN)
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { ...УЧЕНИК, languageLevel: level } })))
}

/** Гость, которого вход по паролю пускает под учеником. */
async function гостьСВходом(page, { level }) {
  await бэкенд(page, { level })
  await page.addInitScript(() => localStorage.removeItem('jts_access_token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({})))
  await page.route('**/auth/login**', (r) => r.fulfill(json({
    accessToken: TOKEN, refreshToken: 'r', userId: 901, name: 'Ученик', role: 'STUDENT', phone: УЧЕНИК.phone,
  })))
}

async function войти(page) {
  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.locator('#rg-login-id').fill('student@example.com')
  await page.locator('#rg-login-pass').fill('secret')
  await page.locator('.rg-btn').first().click()
}

// На телефоне профиль — экраны дизайна приложения (ProfilePhone): строка теста в карточке уровня (.pfm-level).
const строкаТеста = (page) => page.locator('.pf-row, .pfm-level .pfm-row', { hasText: 'Тест на уровень' })
// Где видно «Не пройден»: на компьютере — в самой строке, на телефоне — в шапке карточки уровня над ней.
const статусТеста = (page) => page.locator('.pf-row, .pfm-level__head', { hasText: /Тест на уровень|Уровень английского/ })

const ENVELOPE = JSON.parse(fs.readFileSync(path.resolve('src/placement/__fixtures__/envelope-b1.json'), 'utf8'))

/** Итог теста v16 тем же крючком, которым его отдаёт сам тест («продолжить» на экране итога). */
async function итогТеста(page) {
  const f = await (await page.locator('.pl-page__frame').elementHandle()).contentFrame()
  await f.waitForFunction(() => typeof window.JTSPlacementConfig?.openLearning === 'function', null, { timeout: 30_000 })
  return f.evaluate((env) => window.JTSPlacementConfig.openLearning(env, {}), ENVELOPE)
}

test('без уровня после входа по ссылке — ссылка открывается сразу, тест ждёт на «Главной»', async ({ page }) => {
  await гостьСВходом(page, { level: null })

  // Гость открыл присланную ссылку, а войти пошёл с главной.
  await page.goto('/?screen=homework')
  await expect(page).toHaveURL(/screen=homework/)
  await войти(page)

  // С 14.10.2026 теста при входе нет: он ждёт в закрытом роадмапе «Главной».
  await expect(page).toHaveURL(/screen=homework/, { timeout: 20_000 })
  await expect(page.locator('.pl-page')).toHaveCount(0)
})

test('профиль без уровня: «Не пройден», тест открывается, «назад» — обратно в профиль', async ({ page }) => {
  await вошедший(page, { level: null })

  await page.goto('/?screen=profile')
  await expect(статусТеста(page)).toContainText('Не пройден', { timeout: 20_000 })
  // Чип с CEFR рядом с рангом показывал бы стартовое «A1» и спорил со строкой.
  await expect(page.locator('.pf-rank__cefr, .pfm-level__chip')).toHaveCount(0)

  await строкаТеста(page).click()
  await expect(page.locator('.pl-page__frame')).toBeVisible()
  await page.locator('.pl-page__back').click()
  await expect(page).toHaveURL(/screen=profile/)
})

test('пересдача из профиля: итог сохранён, уровень в аккаунте не тронут', async ({ page }) => {
  const запросы = { putLevel: 0, attempts: 0 }
  await вошедший(page, { level: 'B1' })
  // Регистрируем после вошедший(): частный обработчик должен стоять выше.
  await page.route('**/user/language-level', (r) => {
    if (r.request().method() !== 'GET') запросы.putLevel++
    return r.request().method() === 'GET' ? r.fulfill(json('B1')) : r.fulfill(json({ ok: true }))
  })
  await page.route('**/api/placement/attempts', (r) => {
    if (r.request().method() === 'POST') запросы.attempts++
    return r.fulfill(json({ configured: true, saved: true, envelope: null }))
  })

  await page.goto('/?screen=profile')
  await expect(строкаТеста(page)).toContainText('B1', { timeout: 20_000 })
  await строкаТеста(page).click()
  expect(await итогТеста(page)).toMatchObject({ persisted: true })

  // Уровень в аккаунте ставит тариф — тест его не меняет (решение 30.09, подтверждено 14.10).
  await expect(page).toHaveURL(/screen=profile/)
  expect(запросы.attempts).toBeGreaterThan(0)
  expect(запросы.putLevel).toBe(0)
  await expect(строкаТеста(page)).toContainText('B1')
})
