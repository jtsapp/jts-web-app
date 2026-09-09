import { test, expect } from '@playwright/test'

// Локализация Практики: тексты страницы берутся из словаря i18n.jsx (ru/en/kk),
// а фильтр секций работает на стабильных ключах — смена языка не ломает логику.

const openPractice = async (page, lang) => {
  if (lang) await page.addInitScript((l) => localStorage.setItem('lang', l), lang)
  await page.goto('/?screen=practice')
  // Ждём саму страницу, а не заголовок: на мобильном вьюпорте .pp__title
  // спрятан макетом «Адаптивка» (display:none), но текст в DOM остаётся —
  // toHaveText ниже работает на обоих проектах.
  await expect(page.locator('.pp')).toBeVisible({ timeout: 15000 })
}

test.describe('Практика — локализация', () => {
  test('казахский: заголовок, чипы, баннер и словарь на казахском', async ({ page }) => {
    await openPractice(page, 'kk')
    await expect(page.locator('.pp__title')).toHaveText('Тәжірибе')
    await expect(page.locator('.pp-chip').first()).toHaveText('Барлығы')
    for (const chip of ['Грамматика', 'Жағдаяттар', 'Ертегілер', 'Мемдер мен рилстер', 'Кітаптар', 'Жазылым']) {
      await expect(page.locator('.pp-chip', { hasText: chip })).toBeVisible()
    }
    const banner = page.locator('#sec-listening')
    await expect(banner.locator('h2')).toHaveText('Тыңдалым')
    await expect(banner.locator('.pp-listen__cta')).toHaveText('Жаттығуға өту')
    await expect(banner.locator('.pp-all')).toContainText('Барлығын көру')
    const writing = page.locator('#sec-writing')
    await expect(writing.locator('h2')).toHaveText('Жазылым')
    await expect(writing.locator('.pp-listen__title')).toContainText('Ағылшынша жазуды')
    await expect(writing.locator('.pp-listen__cta')).toHaveText('Жазуға кірісу')
    await expect(page.locator('.pp-voc__title')).toHaveText('Сөздік')
    await expect(page.locator('.pp-voc__count')).toContainText('Сақталған')
  })

  test('английский: те же места на английском', async ({ page }) => {
    await openPractice(page, 'en')
    await expect(page.locator('.pp__title')).toHaveText('Practice')
    await expect(page.locator('.pp-chip').first()).toHaveText('All')
    const banner = page.locator('#sec-listening')
    await expect(banner.locator('h2')).toHaveText('Listening')
    await expect(banner.locator('.pp-all')).toContainText('See all')
    await expect(page.locator('.pp-voc__title')).toHaveText('Vocabulary')
    await expect(page.locator('.pp-chip', { hasText: 'Writing' })).toBeVisible()
    const writing = page.locator('#sec-writing')
    await expect(writing.locator('h2')).toHaveText('Writing')
    await expect(writing.locator('.pp-listen__title')).toContainText('Write in English')
  })

  test('русский по умолчанию: тексты не изменились', async ({ page }) => {
    await openPractice(page)
    await expect(page.locator('.pp__title')).toHaveText('Практика')
    await expect(page.locator('#sec-listening .pp-listen__cta')).toHaveText('Перейти к тренировке')
    await expect(page.locator('.pp-voc__title')).toHaveText('Словарь')
    await expect(page.locator('.pp-chip', { hasText: 'Письмо' })).toBeVisible()
    const writing = page.locator('#sec-writing')
    await expect(writing.locator('h2')).toHaveText('Письмо')
    await expect(writing.locator('.pp-listen__title')).toContainText('Учись писать по-английски')
    await expect(writing.locator('.pp-listen__cta')).toHaveText('Перейти к тренировке')
  })

  test('аудирование: интро и шапка тренажёра на казахском', async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem('lang', l), 'kk')
    await page.goto('/?screen=listening')
    await expect(page.locator('.lt-crumb b')).toHaveText('Тыңдалым')
    await expect(page.locator('.lt-crumb span')).toHaveText('Тәжірибе')
    await expect(page.locator('.lt-back')).toContainText('Артқа')
    await expect(page.locator('.lt-intro__title')).toHaveText('Listening жаттығуы')
    await expect(page.locator('.lt-primary')).toHaveText('Жаттығуды бастау')
    await expect(page.locator('.lt-intro__level')).toContainText('деңгейі')
  })

  test('фильтр на стабильных ключах: чипы работают на любом языке', async ({ page }) => {
    await openPractice(page, 'kk')
    // «Кітаптар» (Книжки) — остаётся только секция книг.
    await page.locator('.pp-chip', { hasText: 'Кітаптар' }).click()
    await expect(page.locator('#sec-books')).toBeVisible()
    await expect(page.locator('#sec-tales')).toHaveCount(0)
    await expect(page.locator('#sec-listening')).toHaveCount(0)
    // «Барлығы» (Все) — секции возвращаются.
    await page.locator('.pp-chip', { hasText: 'Барлығы' }).click()
    await expect(page.locator('#sec-tales')).toBeVisible()
    await expect(page.locator('#sec-listening')).toBeVisible()
  })
})
