import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Раздел меню «Игры» (задача 226 доски, файл методиста practice-categories.md от 18.11.2026): игры вынесены из
// «Практики» в свой пункт меню сразу после неё, в Практике остались пять вкладок по навыкам.

test.beforeEach(async ({ page }) => {
  await loginAsStudent(page)
})

test('в Практике пять вкладок по навыкам и ни одной игры', async ({ page }) => {
  await page.goto('/?screen=practice')
  const tabs = page.locator('.pk-skill .pk-skill__title')
  await expect(tabs).toHaveText(['Аудирование', 'Говорение', 'Чтение', 'Письмо', 'Грамматика'], { timeout: 60_000 })
  for (const key of ['listening', 'speaking', 'reading', 'writing', 'grammar']) {
    await page.locator(`.pk-skill--${key}`).click()
    for (const id of ['listening', 'words', 'numbers', 'wordhunt', 'arcade-speak', 'arcade-runner']) {
      await expect(page.locator(`#sec-${id}`), `${key}: ${id}`).toHaveCount(0)
    }
  }
  // «Письмо» — по файлу: письмо по шагам, воркбуки, Just to Listen и Cartoon World.
  await page.locator('.pk-skill--writing').click()
  await expect(page.locator('.pk-card')).toHaveCount(4)
})

test('«Игры»: шесть карточек с подписью «что тренирует», игра открывается, «назад» — в «Игры»', async ({ page }) => {
  await page.goto('/?screen=games')
  const cards = page.locator('.pk-games .pk-card')
  await expect(cards).toHaveCount(6, { timeout: 60_000 })
  await expect(cards.locator('.pk-card__title')).toHaveText([
    'Тренируй Listening в мини-игре',
    'Слушай слово и находи его на картинке',
    'Мир чисел Декстера',
    'Speak or Die',
    'Word Hunt',
    'Word Rush',
  ])
  await expect(page.locator('#sec-arcade-speak .pk-card__tag')).toHaveText(['Говорение'])
  await expect(page.locator('#sec-arcade-runner .pk-card__tag')).toHaveText(['Слова', 'Реакция'])
  // Уровней у игр нет.
  await expect(page.locator('.pk-levels')).toHaveCount(0)

  await page.locator('#sec-words').click()
  await expect(page).toHaveURL(/screen=words/)
  const back = page.locator('.wd-back')
  await expect(back).toContainText('К играм', { timeout: 30_000 })
  // На экране игры горит пункт «Игры», а не «Практика».
  if ((page.viewportSize()?.width ?? 0) > 560) await expect(page.locator('.sb__nav [data-nav="games"]')).toHaveClass(/sb__item--active/)
  await back.click()
  await expect(page.locator('.pk-games')).toBeVisible({ timeout: 30_000 })
})

test('пункт «Игры» стоит сразу после «Практики» и горит, когда открыт', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) <= 560, 'на телефоне сайдбара нет — пункт в «Сервисах»')
  await page.goto('/?screen=practice')
  const items = page.locator('.sb__nav [data-nav]')
  await expect(items.first()).toBeVisible({ timeout: 60_000 })
  const keys = await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-nav')))
  expect(keys.indexOf('games')).toBe(keys.indexOf('practice') + 1)

  await page.locator('.sb__nav [data-nav="games"]').click()
  await expect(page).toHaveURL(/screen=games/)
  await expect(page.locator('.sb__nav [data-nav="games"]')).toHaveClass(/sb__item--active/)
  await expect(page.locator('.sb__nav [data-nav="practice"]')).not.toHaveClass(/sb__item--active/)
})

test('на телефоне «Игры» — плитка «Сервисов»', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) > 560, 'только телефон')
  await page.goto('/?screen=services')
  const tile = page.locator('.svc-tile--games')
  await expect(tile).toBeVisible({ timeout: 60_000 })
  await tile.click()
  await expect(page.locator('.pk-games .pk-card')).toHaveCount(6, { timeout: 30_000 })
})
