import { test, expect } from '@playwright/test'

// Локализация Практики: тексты страницы берутся из словаря i18n.jsx (ru/en/kk),
// а фильтр секций работает на стабильных ключах — смена языка не ломает логику.

const openPractice = async (page, lang) => {
  if (lang) await page.addInitScript((l) => localStorage.setItem('lang', l), lang)
  await page.goto('/?screen=practice')
  // Ждём саму страницу, а не заголовок: на мобильном вьюпорте .pk-head__title
  // спрятан (заголовок раздела там в шапке оболочки), но текст в DOM остаётся —
  // toHaveText ниже работает на обоих проектах.
  await expect(page.locator('.pk')).toBeVisible({ timeout: 15000 })
}

const skill = (page, name) => page.locator('.pk-skill', { hasText: name })

test.describe('Практика — локализация', () => {
  test('казахский: заголовок, навыки и баннеры на казахском', async ({ page }) => {
    await openPractice(page, 'kk')
    await expect(page.locator('.pk-head__title')).toHaveText('Тәжірибе')
    for (const name of ['Тыңдалым', 'Оқылым', 'Жазылым', 'Айтылым']) {
      await expect(skill(page, name)).toBeVisible()
    }
    await expect(page.locator('#sec-listening .pk-banner__cta')).toHaveText('Жаттығуға өту')
    await expect(page.locator('#sec-tales .pk-all')).toContainText('Барлығын көру')
    await skill(page, 'Жазылым').click()
    const writing = page.locator('#sec-writing')
    await expect(writing.locator('.pk-banner__title')).toContainText('Ағылшынша жазуды')
    await expect(writing.locator('.pk-banner__cta')).toHaveText('Жазуға кірісу')
  })

  test('английский: те же места на английском', async ({ page }) => {
    await openPractice(page, 'en')
    await expect(page.locator('.pk-head__title')).toHaveText('Practice')
    await expect(skill(page, 'Listening')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#sec-tales .pk-all')).toContainText('See all')
    await skill(page, 'Writing').click()
    await expect(page.locator('#sec-writing .pk-banner__title')).toContainText('Write in English')
  })

  test('русский по умолчанию: тексты не изменились', async ({ page }) => {
    await openPractice(page)
    await expect(page.locator('.pk-head__title')).toHaveText('Практика')
    await expect(page.locator('#sec-listening .pk-banner__cta')).toHaveText('Перейти к тренировке')
    await skill(page, 'Письмо').click()
    const writing = page.locator('#sec-writing')
    await expect(writing.locator('.pk-banner__title')).toContainText('Учись писать по-английски')
    await expect(writing.locator('.pk-banner__cta')).toHaveText('Перейти к тренировке')
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

  test('вкладки на стабильных ключах: работают на любом языке', async ({ page }) => {
    await openPractice(page, 'kk')
    // «Оқылым» (Чтение) — книжки на экране, аудирования нет.
    await skill(page, 'Оқылым').click()
    await expect(page.locator('#sec-books')).toBeVisible()
    await expect(page.locator('#sec-listening')).toHaveCount(0)
    // «Барлығын көру» разворачивает книжки — остальные секции уходят…
    await page.locator('#sec-books .pk-all').click()
    await expect(page.locator('#sec-tales')).toHaveCount(0)
    // …а та же кнопка («Жию») возвращает обзор навыка.
    await expect(page.locator('#sec-books .pk-all')).toContainText('Жию')
    await page.locator('#sec-books .pk-all').click()
    await expect(page.locator('#sec-tales')).toBeVisible()
  })
})
