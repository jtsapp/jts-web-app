import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { nativeLessonSteps } from '../src/learning/nativeSteps.js'

// Соединение пар уровня A0.
//
// В источнике это одно упражнение: слева слова, справа переводы, занятый
// вариант уходит из банка. Экстрактор разворачивал его в отдельные choice — по
// одному на слово, и каждый нёс ВЕСЬ набор переводов: десять подряд вопросов
// «выбери 1 из 10» вместо соединения, и при трёх сердцах урок валился почти
// гарантированно. Тест держит собранный экран и его механику.
const LEVEL_FILE = path.join(process.cwd(), 'public/learning/a0.json')
// Узел тропы — урок курса целиком: стадии одного урока склеены в одну очередь
// экранов (см. nativeLessonSteps), поэтому и ожидаемые шаги считаем так же.
const LESSON_TITLE = 'Coffee — yes. Mondays — no.'

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const exactly = (s) => new RegExp(`^\\s*${escapeRe(s)}\\s*$`)

function vocabSteps() {
  const level = JSON.parse(fs.readFileSync(LEVEL_FILE, 'utf8'))
  return nativeLessonSteps(level, LESSON_TITLE)
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
  const vocab = page.locator('.kt-step:not([disabled])').first()
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
    } else if (await page.locator('.cp-cta[disabled]').count()) {
      // Разминка и чек-лист без правильного ответа, но кнопка ждёт отметки.
      await page.locator('.cp-pick, .cp-check__row').first().click()
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

    // Упражнение засчитывается ОДНИМ ответом, а не по паре за каждую строку:
    // плашка результата на экране одна.
    await expect(page.locator('.cp-fb.is-ok')).toBeVisible()
    await expect(page.locator('.cp-fb')).toHaveCount(1)
  })
})
