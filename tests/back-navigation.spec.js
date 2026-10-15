import { test, expect } from '@playwright/test'

// «Назад» ведёт туда, откуда пришли (src/lib/navStack.js). Раньше каждый
// «назад» был захардкожен: «Аудирование» с «Главной» возвращало в Практику,
// раздел из «Посмотреть все» — на свёрнутую Практику другой вкладки, а у
// «Мира чисел» на экране было две кнопки «назад» в разные места.
//
// Тесты гостевые: «Главная», Практика и её разделы гостю открыты.

const tabOn = (page) => page.locator('.pk-skill[aria-selected="true"]')

test('раздел, открытый с «Главной», возвращает на «Главную» — и после F5', async ({ page }) => {
  await page.goto('/?screen=home')
  const tile = page.locator('.hm-prac__tile').nth(2)
  await expect(tile).toBeVisible({ timeout: 60_000 })
  await tile.click()
  await expect(page).toHaveURL(/screen=listening/)
  // Крестик полосы раздела подписан «Назад» по макету — проверяем, куда он ведёт.
  await expect(page.locator('.lt-back')).toBeVisible()

  // Путь живёт в sessionStorage вкладки: перезагрузка (и возврат с оплаты) его не теряет.
  await page.reload()
  await expect(page.locator('.lt-back')).toBeVisible({ timeout: 60_000 })
  await page.locator('.lt-back').click()
  await expect(page).toHaveURL(/screen=home/)
})

test('Практика после «назад» — та же вкладка и тот же раскрытый раздел', async ({ page }) => {
  await page.goto('/?screen=practice')
  const speaking = page.locator('.pk-skill', { hasText: 'Говорение' })
  await expect(speaking).toBeVisible({ timeout: 60_000 })
  await speaking.click()
  await page.getByRole('button', { name: 'Посмотреть все' }).first().click()
  await expect(page.getByRole('button', { name: 'Свернуть' }).first()).toBeVisible()

  await page.getByRole('button', { name: /Steve Jobs/ }).first().click()
  const back = page.locator('.sh-back')
  await expect(back).toContainText('В Практику', { timeout: 30_000 })
  await back.click()

  await expect(tabOn(page)).toContainText('Говорение')
  await expect(page.getByRole('button', { name: 'Свернуть' }).first()).toBeVisible()
})

test('вкладка, открытая целью перехода, не теряется на возврате', async ({ page }) => {
  // «Книги» с «Главной» открывают Практику на «Чтении». Раньше эта вкладка не
  // запоминалась, и раздел, открытый с неё, возвращал на «Аудирование».
  await page.goto('/?screen=home')
  const books = page.locator('.hm-prac__tile').first()
  await expect(books).toBeVisible({ timeout: 60_000 })
  await books.click()
  await expect(tabOn(page)).toContainText('Чтение', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Свернуть' }).first().click()
  await page.getByRole('button', { name: 'Перейти к чтению' }).click()
  await expect(page).toHaveURL(/screen=reading/)
  await page.locator('.rd-back').click()
  await expect(tabOn(page)).toContainText('Чтение')
})

test('«Мир чисел»: одна кнопка «назад», шагом — раунд → урок → карта → Практика', async ({ page }) => {
  await page.addInitScript(() => { window.__NUMBERS_FAST = true })
  await page.goto('/?screen=practice')
  const play = page.getByRole('button', { name: 'Играть', exact: true })
  await expect(play).toBeVisible({ timeout: 60_000 })
  await play.click()
  await expect(page.locator('.nmb-host .card')).toHaveCount(16, { timeout: 30_000 })

  const back = page.locator('.nmb-back')
  await expect(back).toContainText('В Практику')
  await page.locator('.nmb-host .card').first().click()
  // Своих кнопок «назад» у игры больше нет — только кнопка оболочки.
  await expect(page.locator('.nmb-host .ls-head h1')).toBeVisible()
  await expect(page.locator('.nmb-host #lsBack')).toHaveCount(0)
  await expect(back).toContainText('К карте мира')

  await page.locator('.nmb-host #goBtn').click()
  await expect(page.locator('.nmb-host #scene')).toBeVisible()
  await expect(page.locator('.nmb-host #gBack')).toHaveCount(0)
  await back.click()
  // Из раунда — в урок, откуда его запустили, а не сразу на карту.
  await expect(page.locator('.nmb-host .ls-head h1')).toBeVisible()
  await back.click()
  await expect(page.locator('.nmb-host .dash')).toBeVisible()
  await expect(back).toContainText('В Практику')
  await back.click()
  await expect(page).toHaveURL(/screen=practice/)
  await expect(tabOn(page)).toContainText('Аудирование')
})

test('ситуация, открытая с карточки, ведёт назад в Практику, а не в список уровня', async ({ page }) => {
  await page.goto('/?screen=practice')
  const speaking = page.locator('.pk-skill', { hasText: 'Говорение' })
  await expect(speaking).toBeVisible({ timeout: 60_000 })
  await speaking.click()
  await page.getByRole('button', { name: /Заказ кофе/ }).first().click()
  const back = page.locator('.sit-back')
  await expect(back).toContainText('В Практику', { timeout: 30_000 })
  await back.click()
  await expect(tabOn(page)).toContainText('Говорение')
})
