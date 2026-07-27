import { test, expect } from '@playwright/test'

// Синхронизация языка тьютор-раздела с остальным приложением: язык хранит
// общий I18nProvider (ключ 'lang', казахский — 'kk'), LanguageProvider тьютора
// делегирует ему с маппингом kk↔kz, старый ключ 'jts.lang' мигрирует один раз.
// См. docs/superpowers/specs/2026-07-27-tutor-i18n-sync-design.md.

const seed = (page, store) =>
  page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v)
  }, store)

const readStore = (page) =>
  page.evaluate(() => ({
    lang: localStorage.getItem('lang'),
    legacy: localStorage.getItem('jts.lang'),
  }))

test.describe('Тьютор — единый язык приложения', () => {
  test('общий lang=kk переключает тьютор-экраны на казахский', async ({ page }) => {
    await seed(page, { lang: 'kk' })
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.t-welcome__title')).toContainText('қош келдің')
  })

  test('выбор «Қазақша» в тьютор-онбординге переключает всё приложение', async ({ page }) => {
    await page.goto('/?screen=tutor-lang')
    await expect(page.locator('.t-lang__title')).toBeVisible()
    await page.locator('.t-lang__option', { hasText: 'Қазақша' }).click()
    // Следующий экран онбординга уже на казахском…
    await expect(page.locator('.t-choose__title')).toHaveText('Енді өзіңе тьютор таңдау керек')
    // …язык сохранён в общий ключ ISO-кодом…
    expect((await readStore(page)).lang).toBe('kk')
    // …и раздел вне тьютора тоже на казахском.
    await page.goto('/?screen=practice')
    await expect(page.locator('.pp__title')).toHaveText('Тәжірибе')
  })

  test('миграция: старый jts.lang=kz переносится в общий lang=kk', async ({ page }) => {
    await seed(page, { 'jts.lang': 'kz' })
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.t-welcome__title')).toContainText('қош келдің')
    const store = await readStore(page)
    expect(store.lang).toBe('kk')
    expect(store.legacy).toBeNull()
  })

  test('приоритет: явный общий lang важнее старого jts.lang', async ({ page }) => {
    await seed(page, { lang: 'en', 'jts.lang': 'kz' })
    await page.goto('/?screen=tutor-welcome')
    await expect(page.locator('.t-welcome__title')).toContainText('Welcome to learning')
    const store = await readStore(page)
    expect(store.lang).toBe('en')
    expect(store.legacy).toBeNull()
  })
})
