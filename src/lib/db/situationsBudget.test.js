// Дневной лимит разборов «Ситуаций»: потолки, атомарное списание и возврат.
//
// Фейковый sql-таг повторяет семантику Postgres ровно в той части, на которой
// держится лимит: insert…on conflict инкрементирует и ОТКАЗЫВАЕТ (пустой
// результат), когда следующий разбор перевалил бы за потолок аккаунта.

import { describe, it, expect } from 'vitest'
import {
  DAILY_LIMIT,
  DEMO_DAILY_LIMIT,
  budgetPayload,
  consume,
  dailyLimitFor,
  dayKey,
  getUsed,
  refund,
} from './situationsBudget.js'

function makeFakeSql(store = {}) {
  const key = (p, d) => `${p}|${d}`
  const tag = async (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').toLowerCase()
    if (q.includes('insert into situations_assess')) {
      const [profileId, day] = vals
      const limit = vals[vals.length - 1]
      const k = key(profileId, day)
      if (store[k] === undefined) {
        store[k] = 1
        return [{ used: store[k] }]
      }
      if (store[k] + 1 <= limit) {
        store[k] += 1
        return [{ used: store[k] }]
      }
      return []
    }
    if (q.includes('update situations_assess')) {
      const [profileId, day] = vals
      const k = key(profileId, day)
      if (store[k] !== undefined) store[k] = Math.max(0, store[k] - 1)
      return []
    }
    if (q.includes('select used from situations_assess')) {
      const [profileId, day] = vals
      const used = store[key(profileId, day)]
      return used === undefined ? [] : [{ used }]
    }
    throw new Error('неожиданный запрос: ' + q)
  }
  tag.store = store
  return tag
}

describe('потолки', () => {
  it('демо-аккаунту меньше, чем обычному', () => {
    expect(dailyLimitFor(false)).toBe(DAILY_LIMIT)
    expect(dailyLimitFor(true)).toBe(DEMO_DAILY_LIMIT)
    expect(DEMO_DAILY_LIMIT).toBeLessThan(DAILY_LIMIT)
  })

  it('budgetPayload показывает потолок ЭТОГО аккаунта', () => {
    // «Осталось 0 из 20» на демо-аккаунте с потолком 5 — заявка в поддержку.
    expect(budgetPayload(2, true)).toMatchObject({ limit: DEMO_DAILY_LIMIT, used: 2, remaining: 3 })
    expect(budgetPayload(2, false)).toMatchObject({ limit: DAILY_LIMIT, used: 2 })
  })

  it('остаток не уходит в минус', () => {
    expect(budgetPayload(99, true).remaining).toBe(0)
  })

  it('без метрирования бюджета нет вовсе', () => {
    expect(budgetPayload(null, false)).toBeNull()
  })
})

describe('ключ суток', () => {
  it('дата в UTC', () => {
    expect(dayKey(new Date('2026-09-20T23:30:00Z'))).toBe('2026-09-20')
    // Полночь в Алматы (UTC+5) — ещё вчерашние сутки по ключу, и это намеренно:
    // иначе лимит сбрасывался бы у разных студентов в разное время.
    expect(dayKey(new Date('2026-09-20T19:30:00Z'))).toBe('2026-09-20')
  })
})

describe('списание', () => {
  it('считает по одному разбору и упирается в потолок', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= DEMO_DAILY_LIMIT; i++) {
      expect(await consume('user-1', '2026-09-20', true, sql)).toBe(i)
    }
    // Потолок демо выбран — следующий разбор отказывает.
    expect(await consume('user-1', '2026-09-20', true, sql)).toBeNull()
  })

  it('обычный аккаунт с тем же расходом ещё не упёрся', async () => {
    const sql = makeFakeSql()
    for (let i = 0; i < DEMO_DAILY_LIMIT; i++) await consume('user-1', '2026-09-20', false, sql)
    expect(await consume('user-1', '2026-09-20', false, sql)).toBe(DEMO_DAILY_LIMIT + 1)
  })

  it('разные сутки считаются отдельно', async () => {
    const sql = makeFakeSql()
    await consume('user-1', '2026-09-20', true, sql)
    expect(await consume('user-1', '2026-09-21', true, sql)).toBe(1)
  })

  it('возврат не уводит счётчик ниже нуля', async () => {
    const sql = makeFakeSql()
    await consume('user-1', '2026-09-20', false, sql)
    await refund('user-1', '2026-09-20', sql)
    await refund('user-1', '2026-09-20', sql)
    expect(await getUsed('user-1', '2026-09-20', sql)).toBe(0)
  })

  it('без БД метрирования нет, но и отказа нет', async () => {
    // getSql() === null в dev/preview: раздел обязан работать, просто без лимита.
    expect(await consume('user-1', '2026-09-20', false, null)).toBeNull()
    expect(await getUsed('user-1', '2026-09-20', null)).toBe(0)
    await expect(refund('user-1', '2026-09-20', null)).resolves.toBeUndefined()
  })

  it('пустая строка за сутки читается как ноль', async () => {
    const sql = makeFakeSql()
    expect(await getUsed('user-нет', '2026-09-20', sql)).toBe(0)
  })
})
