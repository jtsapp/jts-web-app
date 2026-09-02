import { expect } from '@playwright/test'

// Проход по экранам урока в пошаговом плеере: тесту почти всегда нужно
// добраться до конкретного шага, а по дороге — отвечать ВЕРНО (наугад урок
// уходит в итоги, и до нужного экрана тест не доживает).
//
// Живёт отдельным файлом, потому что типов экранов у курса нового поколения
// полтора десятка, и три спеки уже разъезжались каждая со своей копией
// «прокликай до нужного»: добавили экран — одна спека молча вставала на
// таймауте вместо понятного падения.

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const exactly = (s) => new RegExp(`^\\s*${escapeRe(s)}\\s*$`)

/** Разблокирует «Проверить/Продолжить» на экране без известного ответа. */
export async function unlockStep(page) {
  if (!(await page.locator('.cp-cta[disabled]').count())) return
  const tries = ['.cp-pick', '.cp-check__row', '.cp-choice', '.cp-rows__opt', '.cp-chip', '.cp-match__item']
  for (const sel of tries) {
    const el = page.locator(sel).first()
    if (await el.count()) {
      await el.click({ timeout: 2000 }).catch(() => {})
      if (!(await page.locator('.cp-cta[disabled]').count())) return
    }
  }
  const input = page.locator('.cp-gap__in, .cp-write, .cp-group__in').first()
  if (await input.count()) await input.fill('test').catch(() => {})
}

/** Отвечает на экран верно и жмёт «Проверить». Неоценочные шаги пропускает. */
export async function answerStep(page, step) {
  switch (step.type) {
    case 'match':
      // Соединение: тап по пункту слева, затем по его варианту в банке.
      for (const [i, pair] of (step.pairs || []).entries()) {
        await page.locator('.cp-match__item').nth(i).click()
        await page.locator('.cp-match__bank .cp-chip', { hasText: exactly(pair.right) }).first().click()
      }
      break
    case 'group':
      for (const [i, item] of (step.items || []).entries()) {
        await page.locator('.cp-group__in').nth(i).fill(item.answers[0])
      }
      break
    case 'rows':
      for (const [i, item] of (step.items || []).entries()) {
        await page.locator('.cp-rows__row').nth(i).locator('.cp-rows__opt', { hasText: exactly(item.answer) }).first().click()
      }
      break
    case 'gap':
      await page.locator('.cp-gap__in').fill(String((step.answers || [''])[0]))
      break
    case 'order':
      // Слова собираются в порядке эталона: банк перемешан, ищем по тексту.
      for (const word of String(step.answer || '').split(/\s+/).filter(Boolean)) {
        await page.locator('.cp-order__bank .cp-chip:not([disabled])', { hasText: exactly(word) }).first().click()
      }
      break
    case 'mistake':
      await page.locator('.cp-mistake__tok').nth(step.bad).click()
      break
    case 'cols':
      for (const [i, item] of (step.items || []).entries()) {
        await page.locator('.cp-cols__bank .cp-chip', { hasText: exactly(item.text) }).first().click()
        await page.locator('.cp-cols__col').nth(item.col).click()
        if (i === (step.items || []).length - 1) break
      }
      break
    default:
      if (step.answer) {
        await page.locator('.cp-choice', { hasText: exactly(step.answer) }).first().click()
        break
      }
      // Экран без правильного ответа: кнопка внизу может ждать отметки.
      await unlockStep(page)
      return
  }
  await page.locator('.cp-cta:not([disabled])').click() // «Проверить»
  await expect(page.locator('.cp-fb.is-ok')).toBeVisible()
}

/** Прощёлкивает первые `count` экранов урока, отвечая верно. */
export async function playSteps(page, steps, count) {
  for (let i = 0; i < count; i++) {
    await answerStep(page, steps[i])
    await page.locator('.cp-cta:not([disabled])').click() // «Продолжить»
  }
}
