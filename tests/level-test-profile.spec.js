import { test, expect } from '@playwright/test'
import { routeFakeBank } from './helpers/placement-bank.js'

// Тест на уровень: после входа и из профиля.
//
// Жалоба (30.09.2026): «у некоторых после регистрации теста не было». Одна из
// причин — присланная ссылка перебивала тест: пришедший по ней после входа
// попадал сразу в раздел, а пройти тест потом было неоткуда, кроме карточки на
// «Главной». Теперь тест идёт первым (ссылка не теряется — «Пройду позже» ведёт
// туда), и он же живёт в профиле. Там, где уровень в аккаунте уже есть, это
// пересдача: результат показываем, уровень НЕ меняем (решение владельца —
// уровень открывает контент, а у оплативших его ставит тариф).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const TOKEN = (() => {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64({ alg: 'HS256' })}.${b64({ role: 'STUDENT', userId: 901, exp: Math.floor(Date.now() / 1000) + 3600 })}.s`
})()

const УЧЕНИК = { id: 901, name: 'Ученик', role: 'STUDENT' }

/**
 * Заглушки бэкенда. Сначала — общая для всех чужих хостов (иначе экраны ходили
 * бы в живой dev-server с поддельным токеном), потом частные: Playwright
 * проверяет обработчики в обратном порядке регистрации.
 * level = null — уровня в аккаунте нет (бэкенд отвечает 404).
 */
async function бэкенд(page, { level }) {
  await page.route((url) => url.hostname !== 'localhost', (r) => r.fulfill(json({})))
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
  await page.route('**/auth/login', (r) => r.fulfill(json({
    accessToken: TOKEN, refreshToken: 'r', userId: 901, name: 'Ученик', role: 'STUDENT',
  })))
}

async function войти(page) {
  await page.goto('/')
  await page.locator('.btn--secondary').click()
  await page.getByPlaceholder('Телефон или почта').fill('student@example.com')
  await page.getByPlaceholder('Пароль').fill('secret')
  await page.locator('.form-primary').click()
}

const строкаТеста = (page) => page.locator('.pf-row', { hasText: 'Тест на уровень' })

// Интро Декстера печатает реплики по очереди (~4 с), кнопки — после них.
const ИНТРО = 15_000

/**
 * Самый короткий путь до результата — провал разминки и моста (A0).
 * Ждём смены экрана после каждого «Далее»: последний ответ разминки уходит на
 * проверку сервером, и слепой цикл успевал щёлкнуть «Начать» уже в мосту.
 */
async function доРезультатаA0(page) {
  await page.locator('.plc-opt').first().click() // экспресс
  await page.locator('.plc-opt').nth(2).click() // самооценка
  await page.locator('.plc-primary').click() // старт разминки

  const мост = page.locator('.plc-h1', { hasText: 'Стартовый блок' })
  const номер = async () => (await page.locator('.plc-count').allTextContents())[0] ?? null
  for (let i = 0; i < 10 && !(await мост.count()); i++) {
    const был = await номер()
    await page.locator('.plc-opt', { hasText: 'WRONG-1' }).click()
    await page.locator('.plc-primary:not([disabled])').click()
    await expect(async () => {
      expect((await мост.count()) > 0 || (await номер()) !== был).toBe(true)
    }).toPass()
  }
  await expect(мост).toBeVisible()
  await page.locator('.plc-primary').click()

  for (let i = 1; i <= 2; i++) {
    await expect(page.locator('.plc-count')).toHaveText(`${i} / 2`)
    await page.locator('.plc-input').fill('zz')
    await page.locator('.plc-primary:not([disabled])').click()
  }
  await expect(page.locator('.plc-level')).toHaveText('A0')
}

test('без уровня после входа по ссылке — сначала тест, «позже» ведёт по ссылке', async ({ page }) => {
  await гостьСВходом(page, { level: null })

  // Гость открыл присланную ссылку, а войти пошёл с главной.
  await page.goto('/?screen=homework')
  await expect(page).toHaveURL(/screen=homework/)
  await войти(page)

  // Раньше здесь сразу открывалась домашка, и теста человек не видел вовсе.
  await expect(page.getByText('Начать тестирование сейчас')).toBeVisible({ timeout: ИНТРО })
  await page.getByText('Пройду позже').click()
  await expect(page).toHaveURL(/screen=homework/)
})

test('профиль без уровня: «Не пройден», тест ставит уровень, «позже» — обратно в профиль', async ({ page }) => {
  await вошедший(page, { level: null })

  await page.goto('/?screen=profile')
  await expect(строкаТеста(page)).toContainText('Не пройден', { timeout: 20_000 })
  // Чип с CEFR рядом с рангом показывал бы стартовое «A1» и спорил со строкой.
  await expect(page.locator('.pf-rank__cefr')).toHaveCount(0)

  await строкаТеста(page).click()
  await expect(page.getByText('Начать тестирование сейчас')).toBeVisible({ timeout: ИНТРО })
  await page.getByText('Пройду позже').click()
  await expect(page).toHaveURL(/screen=profile/)
})

test.describe('пересдача из профиля', () => {
  const запросы = { putLevel: 0, complete: 0, session: [] }

  test.beforeEach(async ({ page }) => {
    Object.assign(запросы, { putLevel: 0, complete: 0, session: [] })
    await вошедший(page, { level: 'B1' })
    await routeFakeBank(page)
    // Регистрируем после вошедший(): частный обработчик должен стоять выше.
    await page.route('**/user/language-level', (r) => {
      if (r.request().method() !== 'GET') запросы.putLevel++
      return r.request().method() === 'GET' ? r.fulfill(json('B1')) : r.fulfill(json({ ok: true }))
    })
    await page.route('**/api/placement/complete', (r) => { запросы.complete++; return r.fulfill(json({ ok: true })) })
    await page.route('**/api/placement/session', (r) => {
      if (r.request().method() === 'POST') запросы.session.push(r.request().postDataJSON())
      return r.fulfill(json({ configured: false, token: null }))
    })
  })

  test('результат показан, уровень в аккаунте не тронут', async ({ page }) => {
    await page.goto('/?screen=profile')
    await expect(строкаТеста(page)).toContainText('B1', { timeout: 20_000 })
    await строкаТеста(page).click()

    // Предупреждаем ДО теста, а не только на результате.
    await expect(page.locator('.plc-h1')).toHaveText('Выберите вариант теста')
    await expect(page.locator('.plc-card')).toContainText('уровень в аккаунте (B1) не изменится')

    await доРезультатаA0(page)
    await expect(page.locator('.plc-card')).toContainText('в аккаунте остаётся B1')
    // «Начнём с A1» — обещание про профиль, а в профиль ничего не уезжает.
    await expect(page.locator('.plc-card')).not.toContainText('Начнём с A1')

    expect(запросы.session.at(-1)).toMatchObject({ retake: true })
    expect(запросы.putLevel).toBe(0)
    expect(запросы.complete).toBe(0)

    await page.getByText('Вернуться в профиль').click()
    await expect(page).toHaveURL(/screen=profile/)
    await expect(строкаТеста(page)).toContainText('B1')
  })

  test('пересдачу можно бросить стрелкой «назад»', async ({ page }) => {
    await page.goto('/?screen=profile')
    await строкаТеста(page).click({ timeout: 20_000 })
    await expect(page.locator('.plc-h1')).toHaveText('Выберите вариант теста')

    await page.locator('.back-btn').click()
    await expect(page).toHaveURL(/screen=profile/)
    expect(запросы.putLevel).toBe(0)
  })
})
