import { test, expect } from '@playwright/test'
import {
  SECONDS_PER_CREDIT,
  wavSeconds,
  creditsForSeconds,
  dayKey,
  nextDayResetAt,
  isoWeekKey,
  nextWeekResetAt,
} from '../src/lib/db/shadowingBudget.js'

// Лимита у оценок Shadowing нет (снят 22.09.2026); запись кредитов в учёт —
// recordCredits — проверяет юнит-тест рядом с кодом
// (src/lib/db/shadowingBudget.test.js). Здесь — чистая математика модуля.

test.describe('shadowingBudget — константы и стоимость', () => {
  test('30 с на кредит', () => {
    expect(SECONDS_PER_CREDIT).toBe(30)
  })

  test('wavSeconds по 16кГц mono 16-bit (data = байты − 44-байт заголовок)', () => {
    expect(wavSeconds(44)).toBe(0)
    expect(wavSeconds(0)).toBe(0) // не уходит в минус
    expect(wavSeconds(44 + 6 * 32000)).toBeCloseTo(6, 5)
    expect(wavSeconds(44 + 30 * 32000)).toBeCloseTo(30, 5)
  })

  test('creditsForSeconds: минимум 1, дальше ceil(сек/30)', () => {
    expect(creditsForSeconds(0)).toBe(1)
    expect(creditsForSeconds(-5)).toBe(1)
    expect(creditsForSeconds(NaN)).toBe(1)
    expect(creditsForSeconds(6)).toBe(1)
    expect(creditsForSeconds(30)).toBe(1)
    expect(creditsForSeconds(30.001)).toBe(2)
    expect(creditsForSeconds(31)).toBe(2)
    expect(creditsForSeconds(60)).toBe(2)
    expect(creditsForSeconds(90)).toBe(3)
    expect(creditsForSeconds(900)).toBe(30) // 15-мин «целиком»
  })
})

test.describe('shadowingBudget — сутки и сброс', () => {
  // Ключ суток — строка учёта Shadowing; ключ и полночь UTC — ещё и дневной
  // бюджет ситуаций (situationsBudget.js).
  test('dayKey: дата UTC, а не локальная', () => {
    expect(dayKey(new Date('2026-09-18T09:00:00Z'))).toBe('2026-09-18')
    // Вечер в Алматы (UTC+5) — это ещё те же сутки UTC, а не следующие.
    expect(dayKey(new Date('2026-09-18T20:00:00Z'))).toBe('2026-09-18')
    expect(dayKey(new Date('2026-09-18T23:59:59Z'))).toBe('2026-09-18')
    expect(dayKey(new Date('2026-09-19T00:00:00Z'))).toBe('2026-09-19')
  })

  test('nextDayResetAt: ближайшая полночь UTC, всегда в будущем', () => {
    const now = new Date('2026-09-18T09:00:00Z')
    const reset = new Date(nextDayResetAt(now))
    expect(reset.toISOString()).toBe('2026-09-19T00:00:00.000Z')
    expect(reset.getTime()).toBeGreaterThan(now.getTime())
    // Ровно полночь → СЛЕДУЮЩАЯ, а не «сегодня»: иначе сброс был бы в прошлом.
    expect(new Date(nextDayResetAt(new Date('2026-09-18T00:00:00Z'))).toISOString())
      .toBe('2026-09-19T00:00:00.000Z')
  })
})

// Недельные помощники Shadowing больше не нужны, но живут в этом же модуле:
// ими считает бюджет ПИСЬМА и недельная сводка Roadmap. Проверка остаётся.
test.describe('shadowingBudget — ISO-неделя и сброс (для письма и сводки)', () => {
  test('isoWeekKey: формат и граничные годы (ISO 8601)', () => {
    expect(isoWeekKey(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01') // чт → W01
    expect(isoWeekKey(new Date('2021-01-01T12:00:00Z'))).toBe('2020-W53') // пт → прошлый год
    expect(isoWeekKey(new Date('2023-01-01T12:00:00Z'))).toBe('2022-W52') // вс → прошлый год
    expect(isoWeekKey(new Date('2026-07-30T09:00:00Z'))).toMatch(/^\d{4}-W\d{2}$/)
  })

  test('nextWeekResetAt: ближайший понедельник 00:00 UTC, в будущем, в пределах 7 дней', () => {
    const now = new Date('2026-07-30T09:00:00Z')
    const reset = new Date(nextWeekResetAt(now))
    expect(reset.getUTCDay()).toBe(1) // понедельник
    expect(reset.getUTCHours()).toBe(0)
    expect(reset.getUTCMinutes()).toBe(0)
    expect(reset.getTime()).toBeGreaterThan(now.getTime())
    expect(reset.getTime() - now.getTime()).toBeLessThanOrEqual(7 * 86400000)
    // Ровно понедельник в начале дня → следующий понедельник (не «сегодня»)
    const mon = new Date('2026-08-03T00:00:00Z')
    expect(new Date(nextWeekResetAt(mon)).toISOString()).toBe('2026-08-10T00:00:00.000Z')
  })
})
