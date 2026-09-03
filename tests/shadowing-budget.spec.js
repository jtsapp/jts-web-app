import { test, expect } from '@playwright/test'
import {
  WEEKLY_LIMIT,
  SECONDS_PER_CREDIT,
  wavSeconds,
  creditsForSeconds,
  isoWeekKey,
  nextWeekResetAt,
  getUsed,
  consume,
  refund,
} from '../src/lib/db/shadowingBudget.js'

// Фейковый sql-таг: повторяет семантику атомарного consume/refund/getUsed
// в памяти, чтобы проверить JS-контракт обёрток (что возвращается, что пишется)
// без живой БД. Точность самого SQL-атомика — на Postgres.
function makeFakeSql(store = {}) {
  const key = (p, w) => `${p}|${w}`
  const tag = async (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').toLowerCase()
    if (q.includes('insert into shadowing_assess')) {
      const [profileId, weekKey, credits] = vals
      const limit = vals[vals.length - 1]
      const k = key(profileId, weekKey)
      if (store[k] === undefined) {
        // путь INSERT не проверяет лимит (контракт: вызывающий сам отсекает credits>limit)
        store[k] = credits
        return [{ used: store[k] }]
      }
      if (store[k] + credits <= limit) {
        store[k] += credits
        return [{ used: store[k] }]
      }
      return [] // WHERE false → 0 строк → отказ
    }
    if (q.includes('update shadowing_assess')) {
      const [credits, profileId, weekKey] = vals
      const k = key(profileId, weekKey)
      if (store[k] !== undefined) store[k] = Math.max(0, store[k] - credits)
      return []
    }
    if (q.includes('select used from shadowing_assess')) {
      const [profileId, weekKey] = vals
      const k = key(profileId, weekKey)
      return store[k] === undefined ? [] : [{ used: store[k] }]
    }
    return []
  }
  tag.store = store
  return tag
}

test.describe('shadowingBudget — константы и стоимость', () => {
  test('лимит 10 кредитов, 30 с на кредит', () => {
    expect(WEEKLY_LIMIT).toBe(10)
    expect(SECONDS_PER_CREDIT).toBe(30)
  })

  // Демо-потолок и его влияние на consume/budgetPayload — в юнит-тесте рядом с
  // кодом (src/lib/db/shadowingBudget.test.js); здесь только базовый контракт.

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

test.describe('shadowingBudget — ISO-неделя и сброс', () => {
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

test.describe('shadowingBudget — consume/refund/getUsed', () => {
  test('без БД (sql=null): consume→null, getUsed→0, refund→no-op', async () => {
    expect(await consume('user-1', '2026-W31', 1, false, null)).toBeNull()
    expect(await getUsed('user-1', '2026-W31', null)).toBe(0)
    await refund('user-1', '2026-W31', 1, null) // не бросает
  })

  test('списывает по кредиту и отдаёт новое used', async () => {
    const sql = makeFakeSql()
    expect(await consume('user-1', '2026-W31', 1, false, sql)).toBe(1)
    expect(await consume('user-1', '2026-W31', 1, false, sql)).toBe(2)
    expect(await getUsed('user-1', '2026-W31', sql)).toBe(2)
  })

  test('доводит до лимита и отклоняет сверх него', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 10; i++) expect(await consume('u', '2026-W31', 1, false, sql)).toBe(i)
    expect(await consume('u', '2026-W31', 1, false, sql)).toBeNull() // 11-я — отказ
    expect(await getUsed('u', '2026-W31', sql)).toBe(10) // не выросло
  })

  test('многокредитная оценка (целиком) не пробивает лимит', async () => {
    const sql = makeFakeSql()
    expect(await consume('u', '2026-W31', 9, false, sql)).toBe(9)
    expect(await consume('u', '2026-W31', 2, false, sql)).toBeNull() // 9+2=11 > 10 → отказ
    expect(await getUsed('u', '2026-W31', sql)).toBe(9)
    expect(await consume('u', '2026-W31', 1, false, sql)).toBe(10) // ровно до лимита можно
  })

  test('refund возвращает кредиты, не ниже нуля; недели независимы', async () => {
    const sql = makeFakeSql()
    await consume('u', '2026-W31', 3, false, sql)
    await refund('u', '2026-W31', 2, sql)
    expect(await getUsed('u', '2026-W31', sql)).toBe(1)
    await refund('u', '2026-W31', 5, sql) // не уходит в минус
    expect(await getUsed('u', '2026-W31', sql)).toBe(0)
    // другая неделя — свой счётчик
    expect(await getUsed('u', '2026-W32', sql)).toBe(0)
  })
})
