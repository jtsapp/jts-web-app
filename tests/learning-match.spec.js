import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { tasksToSteps } from '../src/learning/nativeSteps.js'

// Соединение пар уровня A0.
//
// В источнике это одно упражнение: слева слова, справа переводы, занятый
// вариант уходит из банка. Экстрактор разворачивал его в отдельные choice — по
// одному на слово, и каждый нёс ВЕСЬ набор переводов: десять подряд вопросов
// «выбери 1 из 10» вместо соединения, и при трёх сердцах урок валился почти
// гарантированно. Тест держит собранный экран и его механику.
const LEVEL_FILE = path.join(process.cwd(), 'public/learning/a0.json')
const VOCAB_NODE = 'L01-2'

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const exactly = (s) => new RegExp(`^\\s*${escapeRe(s)}\\s*$`)

function vocabSteps() {
  const level = JSON.parse(fs.readFileSync(LEVEL_FILE, 'utf8'))
  return tasksToSteps(level.lessons[VOCAB_NODE])
}

async function openVocab(page) {
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { userId: 1, name: 'Test', phone: '77010001122', role: 'USER', languageLevel: 'A1' } }) }),
  )
  await page.route('**/mobile/lesson-modules', (r) => r.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
  await page.goto('/?screen=kingdom&unlock=1')
  await page.locator('.lp-node', { hasText: 'Уровень A0' }).first().click()
  const vocab = page.locator('.kt-step:not([disabled])').nth(1)
  await expect(vocab).toBeVisible({ timeout: 15000 })
  await vocab.click()
  await expect(page.locator('.cp-step')).toBeVisible({ timeout: 15000 })
}

/** Прощёлкивает экраны до соединения, отвечая верно (наугад урок не доживает). */
async function reachMatch(page, steps) {
  const at = steps.findIndex((s) => s.type === 'match')
  expect(at, 'в узле словаря A0 нет собранного соединения').toBeGreaterThan(-1)
  for (let i = 0; i < at; i++) {
    if (steps[i].answer) {
      await page.locator('.cp-choice', { hasText: exactly(steps[i].answer) }).first().click()
      await page.locator('.cp-cta:not([disabled])').click()
    }
    await page.locator('.cp-cta:not([disabled])').click()
  }
  return steps[at]
}

test.describe('A0: соединение пар', () => {
  test('пары на одном экране, занятый вариант уходит из банка', async ({ page }) => {
    test.setTimeout(120000)
    const steps = vocabSteps()
    await openVocab(page)
    const step = await reachMatch(page, steps)

    // Все пары — на одном экране, а не по вопросу на каждую.
    await expect(page.locator('.cp-match__item')).toHaveCount(step.pairs.length)
    await expect(page.locator('.cp-match__bank .cp-chip')).toHaveCount(step.options.length)

    // Пока не соединены все пары, проверять нечего.
    await expect(page.locator('.cp-cta')).toBeDisabled()

    // Соединяем первую пару: тап по пункту, затем по варианту.
    const first = step.pairs[0]
    await page.locator('.cp-match__item').first().click()
    const chip = page.locator('.cp-match__bank .cp-chip', { hasText: exactly(first.right) }).first()
    await chip.click()
    // Занятый вариант больше не выбрать — в соединении он одноразовый.
    await expect(chip).toBeDisabled()
    await expect(page.locator('.cp-match__item').first()).toContainText(first.right)

    // Повторный тап по соединённому пункту разрывает пару: ошибку можно
    // исправить, не теряя сердце.
    await page.locator('.cp-match__item').first().click()
    await expect(chip).toBeEnabled()
  })

  test('верно соединённые пары засчитываются одним ответом', async ({ page }) => {
    test.setTimeout(120000)
    const steps = vocabSteps()
    await openVocab(page)
    const step = await reachMatch(page, steps)

    for (const [i, pair] of step.pairs.entries()) {
      await page.locator('.cp-match__item').nth(i).click()
      await page.locator('.cp-match__bank .cp-chip', { hasText: exactly(pair.right) }).first().click()
    }
    await page.locator('.cp-cta:not([disabled])').click()

    await expect(page.locator('.cp-fb.is-ok')).toBeVisible()
    // Сердце за упражнение снимается один раз, а не за каждую пару.
    await expect(page.locator('.cp-hud__hearts b')).toHaveText('3')
  })
})
