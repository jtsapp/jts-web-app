import { test, expect } from '@playwright/test'

// Тест на определение уровня — нативный экран приложения (PlacementTestPage)
// поверх перенесённого движка школы. Совпадение расчётов с бандлом проверяет
// placementParity.test.js; здесь — что экран собирается из данных банка и
// доводит студента от выбора варианта до заданий.

const open = async (page) => {
  await page.goto('/?screen=test')
  await expect(page.locator('.plc-card')).toBeVisible({ timeout: 20000 })
}

test.describe('placement — экран теста', () => {
  test('банк доезжает вместе с озвучкой и клипами', async ({ page }) => {
    const status = async (url) => (await page.request.get(url)).status()

    expect(await status('/practice/placement/bank.json')).toBe(200)
    expect(await status('/practice/placement/jts-bank/soundcheck.mp3')).toBe(200)
    expect(await status('/practice/placement/jts-bank/a0/w01.mp3')).toBe(200)
    expect(await status('/practice/placement/jts-bank/clips/clip1.mp4')).toBe(200)

    const bank = await (await page.request.get('/practice/placement/bank.json')).json()
    expect(bank.bank.items.length).toBeGreaterThan(160)
    expect(Object.keys(bank.vocab).length).toBeGreaterThan(50)
  })

  test('выбор варианта, самооценка и первый раздел', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await open(page)

    await expect(page.locator('.plc-h1')).toHaveText('Выберите вариант теста')
    await expect(page.locator('.plc-opt')).toHaveCount(2)
    await page.locator('.plc-opt').first().click()

    // Самооценка задаёт стартовую θ — пять ступеней, как в бандле.
    await expect(page.locator('.plc-h1')).toHaveText('Оцените свой английский')
    await expect(page.locator('.plc-opt')).toHaveCount(5)
    await page.locator('.plc-opt').nth(2).click()

    // Перед разделом — экран с объяснением, а не сразу задание.
    await expect(page.locator('.plc-h1')).toHaveText('Разминка')
    await expect(page.locator('.plc-card')).toContainText('Шесть быстрых вопросов')
    await page.locator('.plc-primary').click()

    await expect(page.locator('.plc-stem')).toBeVisible()
    await expect(page.locator('.plc-opt')).toHaveCount(4)
    await expect(page.locator('.plc-count')).toHaveText('1 / 6')
    expect(errors).toEqual([])
  })

  // «Далее» под запретом, пока ответа нет: пустой ответ уходит в движок как
  // неверный и портит оценку — пусть студент отвечает осознанно.
  test('без ответа дальше не пускает, с ответом — пускает', async ({ page }) => {
    await open(page)
    await page.locator('.plc-opt').first().click()
    await page.locator('.plc-opt').nth(2).click()
    await page.locator('.plc-primary').click()

    await expect(page.locator('.plc-primary')).toBeDisabled()
    await page.locator('.plc-opt').first().click()
    await expect(page.locator('.plc-primary')).toBeEnabled()

    await page.locator('.plc-primary').click()
    await expect(page.locator('.plc-count')).toHaveText('2 / 6')
    // Назад — ответы раздела можно менять до его завершения.
    await page.locator('.plc-ghost').click()
    await expect(page.locator('.plc-count')).toHaveText('1 / 6')
    await expect(page.locator('.plc-opt.on')).toHaveCount(1)
  })

  test('раздел завершается и ведёт к следующему', async ({ page }) => {
    await open(page)
    await page.locator('.plc-opt').first().click()
    await page.locator('.plc-opt').nth(2).click()
    await page.locator('.plc-primary').click()

    for (let i = 0; i < 6; i++) {
      await page.locator('.plc-opt').first().click()
      await page.locator('.plc-primary').click()
      await page.waitForTimeout(150)
    }
    await expect(page.locator('.plc-h1')).toHaveText('Различение слов')
    await expect(page.locator('.plc-card')).toContainText('2 / 7')
  })
})
