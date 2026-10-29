import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Страница тьютора по макету 29.10.2026 (компьютер — «АВАТАР ТЬЮТОРА» →
// Section 1, телефон — «Mobile» → «AI-тьютор»): фиолетовая шапка с лицом и
// карточкой настроек разговора, под ней сетка ситуаций. Витрины эмоций на
// странице больше нет — в рамке сам персонаж.

test.beforeEach(async ({ page }) => {
  await loginAsStudent(page)
})

test.describe('страница тьютора — содержимое', () => {
  test('шапка, лицо, «Начать разговор» и сетка ситуаций', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')

    await expect(page.locator('.tp-hero h1')).toBeVisible()
    await expect(page.locator('.tp-hero__others')).toBeVisible()
    await expect(page.locator('.tp-hero__manage')).toBeVisible()
    await expect(page.locator('.t-dash__orb .tp-portrait')).toBeVisible()
    await expect(page.locator('.t-dash__talk')).toBeVisible()

    // Старой правой панели и «Советуем сегодня» нет — сцены в сетке.
    await expect(page.locator('.t-dash__panel')).toHaveCount(0)
    await expect(page.locator('.t-scenarios .t-scenario').first()).toBeAttached()
  })

  test('ситуация из карточки уходит в звонок', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-dashboard')
    // На телефоне ситуации — своя вкладка карточки.
    if ((viewport?.width ?? 0) <= 560) await page.locator('.tp-seg--tabs .tp-seg__opt', { hasText: 'Ситуации' }).click()
    const none = page.locator('.tp-chip', { hasText: 'Без ситуации' })
    await expect(none).toHaveAttribute('aria-pressed', 'true')
    const visa = page.locator('.tp-chip', { hasText: 'U.S. Visa Interview' })
    await visa.click()
    await expect(visa).toHaveAttribute('aria-pressed', 'true')
    await expect(none).toHaveAttribute('aria-pressed', 'false')
    await page.locator('.t-dash__talk').click()
    await expect(page).toHaveURL(/screen=tutor-voice-chat/)
  })

  test('«Другие тьюторы» открывает выбор с «Назад»', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    await page.locator('.tp-hero__others').click()
    await expect(page).toHaveURL(/screen=tutor-choose/)
    await expect(page.locator('.t-pick__start')).toBeVisible()
    await page.locator('.t-back:visible').first().click()
    await expect(page).toHaveURL(/screen=tutor-dashboard/)
  })
})

test.describe('страница тьютора — компьютер', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 560, 'только широкий вьюпорт')

  test('режим микрофона переключается до звонка и запоминается', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    const free = page.locator('.tp-seg--mode .tp-seg__opt', { hasText: 'Свободно' })
    await free.click()
    await expect(free).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.tp-composer__hint')).toHaveText('Вкл/выкл микрофона нажатием одной кнопки')
    expect(await page.evaluate(() => localStorage.getItem('jts:tutor:pushToTalk'))).toBe('0')
  })

  test('карточка настроек заходит на лицо и лежит поверх', async ({ page }) => {
    await page.goto('/?screen=tutor-dashboard')
    const frame = await page.locator('.tp-dash__frame').boundingBox()
    const card = await page.locator('.tp-composer').boundingBox()
    // gap −32 в кадре: верх карточки на 32 выше низа лица.
    expect(Math.round(frame.y + frame.height - card.y)).toBe(32)
  })
})

test.describe('страница тьютора — телефон', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 560, 'только узкий вьюпорт')

  test('вкладки карточки, без горизонтального скролла, сетка ниже', async ({ page, viewport }) => {
    await page.goto('/?screen=tutor-dashboard')
    await expect(page.locator('.tp-composer--tabs')).toBeVisible()
    await expect(page.locator('.tp-check', { hasText: 'Режим рация' })).toBeVisible()
    await page.locator('.tp-seg--tabs .tp-seg__opt', { hasText: 'Ситуации' }).click()
    await expect(page.locator('.tp-chip', { hasText: 'Без ситуации' })).toBeVisible()

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 1)

    const scenarios = page.locator('.t-scenarios')
    await scenarios.scrollIntoViewIfNeeded()
    await expect(scenarios).toBeInViewport()
  })
})
