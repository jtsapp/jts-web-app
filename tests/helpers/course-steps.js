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

/**
 * Кладёт выбранную карточку в колонку. Целимся в заголовок колонки, а не в её
 * центр: по центру уже лежат разложенные карточки, а тап по такой карточке
 * возвращает её в банк — проход зацикливался на первом же экране с колонками.
 */
async function dropIntoColumn(page, col) {
  const column = page.locator('.cp-cols__col').nth(col)
  const head = column.locator('h4')
  await ((await head.count()) ? head : column).click({ position: { x: 8, y: 8 } })
}

/**
 * Разблокирует «Проверить/Продолжить» на экране без известного ответа.
 * Верность тут не важна — важно, что экран проходим.
 */
export async function unlockStep(page) {
  if (!(await page.locator('.cp-cta[disabled]').count())) return
  // Соединение и колонки требуют разложить ВСЁ: одного клика не хватит.
  const items = page.locator('.cp-match__item')
  for (let i = 0, n = await items.count(); i < n; i++) {
    await items.nth(i).click()
    const free = page.locator('.cp-match__bank .cp-chip:not([disabled])').first()
    if (await free.count()) await free.click()
  }
  for (let guard = 0; guard < 30 && (await page.locator('.cp-cols__bank .cp-chip').count()); guard++) {
    await page.locator('.cp-cols__bank .cp-chip').first().click()
    await dropIntoColumn(page, 0)
  }
  // Порядок слов ждёт, пока в строку уйдут ВСЕ слова банка.
  for (let guard = 0; guard < 30 && (await page.locator('.cp-order__bank .cp-chip:not([disabled])').count()); guard++) {
    await page.locator('.cp-order__bank .cp-chip:not([disabled])').first().click()
  }
  // Список утверждений ждёт ответа в КАЖДОЙ строке, а не одного на экран.
  const rows = page.locator('.cp-rows__row')
  for (let i = 0, n = await rows.count(); i < n; i++) {
    await rows.nth(i).locator('.cp-rows__opt').first().click()
  }
  // Несколько пропусков одним экраном — заполняем все поля.
  const fields = page.locator('.cp-group__in')
  for (let i = 0, n = await fields.count(); i < n; i++) await fields.nth(i).fill('test')
  if (!(await page.locator('.cp-cta[disabled]').count())) return

  const tries = ['.cp-pick', '.cp-check__row', '.cp-choice', '.cp-mistake__tok', '.cp-chip']
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
      for (const item of step.items || []) {
        await page.locator('.cp-cols__bank .cp-chip', { hasText: exactly(item.text) }).first().click()
        await dropIntoColumn(page, item.col)
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
