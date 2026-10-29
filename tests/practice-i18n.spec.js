import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Локализация Практики: тексты страницы берутся из словаря i18n.jsx (ru/en/kk),
// а фильтр секций работает на стабильных ключах — смена языка не ломает логику.

// Гостю кабинет с 23.10.2026 не рисуется (лендинг «Войти»), поэтому экраны открываем учеником.
const openPractice = async (page, lang) => {
  await loginAsStudent(page)
  if (lang) await page.addInitScript((l) => localStorage.setItem('lang', l), lang)
  await page.goto('/?screen=practice')
  // Ждём саму страницу, а не заголовок: на мобильном вьюпорте .pk-head__title
  // спрятан (заголовок раздела там в шапке оболочки), но текст в DOM остаётся —
  // toHaveText ниже работает на обоих проектах.
  await expect(page.locator('.pk')).toBeVisible({ timeout: 15000 })
}

const skill = (page, name) => page.locator('.pk-skill', { hasText: name })

test.describe('Практика — локализация', () => {
  // С редизайна 29.10.2026 баннеров с кнопкой нет: тренажёр — карточка-кнопка с названием и одной фразой,
  // поэтому язык проверяем по названиям карточек и вкладок.
  test('казахский: заголовок, навыки и карточки на казахском', async ({ page }) => {
    await openPractice(page, 'kk')
    await expect(page.locator('.pk-head__title')).toHaveText('Тәжірибе')
    for (const name of ['Тыңдалым', 'Оқылым', 'Жазылым', 'Айтылым', 'Грамматика']) {
      await expect(skill(page, name)).toBeVisible()
    }
    // Пятая вкладка подписана темами, а не «N тренажёров».
    await expect(skill(page, 'Грамматика').locator('.pk-skill__count')).toHaveText('125 тақырып және ойындар')
    await expect(page.locator('#sec-listenchoose .pk-card__title')).toHaveText('Егжей-тегжейін есті — өз суретіңді тап')
    await expect(page.locator('#sec-tales .pk-card__title')).toHaveText('Ертегілер')
    await skill(page, 'Жазылым').click()
    await expect(page.locator('#sec-writing .pk-card__title')).toContainText('Ағылшынша жазуды')
  })

  test('английский: те же места на английском', async ({ page }) => {
    await openPractice(page, 'en')
    await expect(page.locator('.pk-head__title')).toHaveText('Practice')
    await expect(skill(page, 'Listening')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#sec-tales .pk-card__title')).toHaveText('Fairy tales')
    await skill(page, 'Writing').click()
    await expect(page.locator('#sec-writing .pk-card__title')).toContainText('write in English')
  })

  test('русский по умолчанию: тексты не изменились', async ({ page }) => {
    await openPractice(page)
    await expect(page.locator('.pk-head__title')).toHaveText('Практика')
    await expect(page.locator('#sec-listenchoose .pk-card__title')).toHaveText('Услышь детали — найди свою картинку')
    await skill(page, 'Письмо').click()
    await expect(page.locator('#sec-writing .pk-card__title')).toContainText('Учись писать по-английски')
  })

  test('аудирование: интро и шапка тренажёра на казахском', async ({ page }) => {
    await loginAsStudent(page)
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
    await expect(page.locator('#sec-listenchoose')).toHaveCount(0)
    // Карточка-каталог «Кітаптар» разворачивает список книжек — остальные карточки уходят…
    await page.locator('#sec-books').click()
    await expect(page.locator('#sec-tales')).toHaveCount(0)
    // …а «Жию» в шапке списка возвращает обзор навыка.
    const collapse = page.locator('section#sec-books .pk-all')
    await expect(collapse).toContainText('Жию')
    await collapse.click()
    await expect(page.locator('#sec-tales')).toBeVisible()
  })
})
