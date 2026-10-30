import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// «Словарь» на телефоне по макету приложения (src/mobile/vocab.css): то, чего у компьютера нет, — список наборов
// IELTS по «>» полки, окно «Вы уверены, что хотите выйти?» у крестика практики и плашка вердикта с верным ответом.
// Только проект mobile: на компьютере этой разметки нет вовсе.

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const LESSON = {
  no: 1,
  title: 'Coffee — yes',
  cards: [
    { id: 'c_like', en: 'like', ru: 'нравится', kk: 'ұнайды', example: 'I ___ coffee.' },
    { id: 'c_tea', en: 'tea', ru: 'чай', kk: 'шай', example: 'She drinks green ___.' },
    { id: 'c_day', en: 'day', ru: 'день', kk: 'күн', example: 'Have a nice ___.' },
    { id: 'c_cat', en: 'cat', ru: 'кошка', kk: 'мысық', example: 'The ___ is black.' },
  ],
}
const INDEX = { levels: [{ id: 'A0', name: 'Beginner', cards: 4 }], fields: [], fieldCats: ['all'] }
const SETS = [
  { id: 'VOC-1', title: 'Environment', category: 'environment', topic: { ru: 'Окружающая среда', kk: 'Қоршаған орта' }, questionCount: 40 },
  { id: 'AWL-1', title: 'AWL · Sublist 1', category: 'awl', topic: { ru: 'AWL · Академическая лексика', kk: 'AWL' }, questionCount: 60 },
]

async function boot(page) {
  await loginAsStudent(page, { level: 'B1' })
  // Синтез и Soniox тестам не нужны: тишина вместо звука.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, getVoices: () => [], speak() {} } })
  })
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' }))
  await page.route('**/api/practice/entitlement**', (r) => r.fulfill(json({ allowed: true, limit: null })))
  await page.route('**/mobile/vocab-catalog', (r) => r.fulfill(json(INDEX)))
  await page.route('**/mobile/vocab-catalog/scopes/*', (r) => r.fulfill(json({ units: [{ no: 1, title: 'You and me', lessons: [1] }], lessons: { 1: LESSON } })))
  await page.route('**/mobile/lesson-vocab/saved', (r) => r.fulfill(json({ words: [] })))
  await page.route('**/mobile/ielts/plan/me', (r) => r.fulfill(json({ ieltsAccount: true, onboarded: true, access: true })))
  await page.route('**/mobile/ielts/tests?skill=vocab', (r) => r.fulfill(json(SETS)))
  await page.route('**/mobile/vocab-progress?**', (r) => r.fulfill(json({ 'ielts-VOC-1': { seen: 10, learned: 12, due: 0 } })))
}

async function startChoicePractice(page) {
  await page.goto('/?screen=vocab')
  await page.locator('.vp-lvl-card[data-lv="A0"]').click()
  await page.locator('.vp-lesson').first().click()
  await page.locator('.vp-sticky-cta .vp-btn').click()
  // только «Выбор ответа», без «сначала посмотреть перевод»
  await page.locator('.vp-setup__chip', { hasText: 'Сопоставить' }).click()
  await page.locator('.vp-setup__chip', { hasText: 'Написание' }).click()
  await page.locator('.vp-setup__check input').uncheck()
  await page.locator('.vp-intro .vp-btn').click()
  await expect(page.locator('.vp-opts')).toBeVisible()
}

test.describe('Словарь на телефоне', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'разметка только телефона')
    await boot(page)
  })

  test('«>» полки IELTS открывает список наборов с вкладкой AWL', async ({ page }) => {
    await page.goto('/?screen=vocab')
    await expect(page.locator('.vp-mbar__title')).toHaveText('Словарь')
    // отдельной полки AWL на главной телефона нет — AWL второй вкладкой списка
    await expect(page.locator('#vsec-ielts-awl')).toHaveCount(0)
    await page.locator('#vsec-ielts .vp-sec-arrow').click()
    await expect(page.locator('.vp-irow')).toHaveCount(1)
    await expect(page.locator('.vp-irow b')).toHaveText('Environment')
    await page.getByRole('tab', { name: /Academic Word List · 1/ }).click()
    await expect(page.locator('.vp-irow b')).toHaveText('Sublist 1')
    await page.locator('.vp-mbar__back').click()
    await expect(page.locator('#vsec-ielts')).toBeVisible()
  })

  test('крестик практики спрашивает, выходить ли', async ({ page }) => {
    await startChoicePractice(page)
    await expect(page.locator('.mtab')).toBeHidden()
    await page.locator('.vp-runbar__x').click()
    const sheet = page.getByRole('dialog', { name: 'Вы уверены, что хотите выйти?' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Продолжить практику' }).click()
    await expect(sheet).toHaveCount(0)
    await expect(page.locator('.vp-opts')).toBeVisible()
    await page.locator('.vp-runbar__x').click()
    await page.getByRole('button', { name: 'Выйти в словарь' }).click()
    await expect(page.locator('.vp-pcard').first()).toBeVisible()
  })

  test('неверный ответ: панель красная и называет верный перевод', async ({ page }) => {
    await startChoicePractice(page)
    const word = (await page.locator('.vp-wordbox .w').innerText()).trim()
    const right = LESSON.cards.find((c) => c.en === word).ru
    await page.locator('.vp-opt', { hasNotText: right }).first().click()
    await expect(page.locator('.vp-foot')).toHaveClass(/is-no/)
    await expect(page.locator('.vp-verdict__ans')).toHaveText(`${word} — ${right}`)
    // верный вариант после ошибки не подсвечен (кадр «Выбор · неверно»)
    await expect(page.locator('.vp-opt.ok')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })
})
