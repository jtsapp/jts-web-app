// Демо-бюджет оценок Shadowing: у демо-аккаунта свой недельный потолок, и один
// и тот же выбор лимита обязан решать показ остатка, отсечку слишком дорогой
// записи и само списание. Базовая математика модуля (ISO-неделя, кредиты по
// длине wav) покрыта в tests/shadowing-budget.spec.js — здесь только то, что
// зависит от демо-статуса.

import { describe, it, expect } from 'vitest'
import {
  WEEKLY_LIMIT,
  DEMO_WEEKLY_LIMIT,
  weeklyLimitFor,
  budgetPayload,
  exceedsWeeklyBudget,
  creditsForSeconds,
  getUsed,
  consume,
  refund,
} from './shadowingBudget.js'

// Фейковый sql-таг: та же семантика, что в tests/shadowing-budget.spec.js —
// атомарный consume в памяти, включая то, что путь INSERT лимит не смотрит.
function makeFakeSql(store = {}) {
  const key = (p, w) => `${p}|${w}`
  const tag = async (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').toLowerCase()
    if (q.includes('insert into shadowing_assess')) {
      const [profileId, weekKey, credits] = vals
      const limit = vals[vals.length - 1]
      const k = key(profileId, weekKey)
      if (store[k] === undefined) {
        store[k] = credits // контракт: слишком дорогую запись отсекает вызывающий
        return [{ used: store[k] }]
      }
      if (store[k] + credits <= limit) {
        store[k] += credits
        return [{ used: store[k] }]
      }
      return []
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

describe('выбор лимита по демо-статусу', () => {
  it('10 кредитов в неделю обычному, 3 демо', () => {
    expect(WEEKLY_LIMIT).toBe(10)
    expect(DEMO_WEEKLY_LIMIT).toBe(3)
    expect(weeklyLimitFor(false)).toBe(10)
    expect(weeklyLimitFor(true)).toBe(3)
  })

  it('отсутствие флага — обычный потолок (аноним демо-аккаунтом не бывает)', () => {
    expect(weeklyLimitFor(undefined)).toBe(10)
  })
})

describe('клиенту отдаётся ВЫБРАННЫЙ лимит', () => {
  it('демо видит свою тройку и остаток по ней', () => {
    expect(budgetPayload(1, true)).toMatchObject({ limit: 3, used: 1, remaining: 2 })
  })

  it('обычный аккаунт видит десятку', () => {
    expect(budgetPayload(1, false)).toMatchObject({ limit: 10, used: 1, remaining: 9 })
  })

  it('остаток не уходит в минус', () => {
    expect(budgetPayload(5, true).remaining).toBe(0)
  })

  it('без метрирования (used == null) — null, а не нули', () => {
    expect(budgetPayload(null, true)).toBeNull()
  })
})

describe('exceedsWeeklyBudget — страховка INSERT-пути', () => {
  it('демо: запись дороже трёх кредитов не начинаем', () => {
    // Путь INSERT в consume() лимит не проверяет, поэтому первая же запись
    // недели на 2 минуты (4 кредита) иначе списалась бы поверх потолка.
    expect(exceedsWeeklyBudget(4, true)).toBe(true)
    expect(exceedsWeeklyBudget(creditsForSeconds(120), true)).toBe(true)
    expect(exceedsWeeklyBudget(3, true)).toBe(false)
    expect(exceedsWeeklyBudget(creditsForSeconds(90), true)).toBe(false)
  })

  it('обычному аккаунту те же 4 кредита проходят, 11 — нет', () => {
    expect(exceedsWeeklyBudget(4, false)).toBe(false)
    expect(exceedsWeeklyBudget(11, false)).toBe(true)
  })
})

describe('списание отсекает по тому же лимиту', () => {
  it('демо: три оценки проходят, четвёртая — отказ', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 3; i++) expect(await consume('user-1', '2026-W35', 1, true, sql)).toBe(i)
    expect(await consume('user-1', '2026-W35', 1, true, sql)).toBeNull()
    expect(await getUsed('user-1', '2026-W35', sql)).toBe(3) // не выросло
    // Показанный остаток совпадает с тем, по чему отсекли.
    expect(budgetPayload(await getUsed('user-1', '2026-W35', sql), true)).toMatchObject({
      limit: 3,
      remaining: 0,
    })
  })

  it('многокредитная запись «целиком» не пробивает демо-потолок', async () => {
    const sql = makeFakeSql()
    expect(await consume('user-2', '2026-W35', 2, true, sql)).toBe(2)
    expect(await consume('user-2', '2026-W35', 2, true, sql)).toBeNull() // 2+2=4 > 3
    expect(await consume('user-2', '2026-W35', 1, true, sql)).toBe(3) // ровно до потолка можно
  })

  it('обычному аккаунту те же три оценки лимит не закрывают', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 10; i++) expect(await consume('user-3', '2026-W35', 1, false, sql)).toBe(i)
    expect(await consume('user-3', '2026-W35', 1, false, sql)).toBeNull() // 11-я
  })

  it('рефанд освобождает кредит и на демо-потолке', async () => {
    const sql = makeFakeSql()
    await consume('user-4', '2026-W35', 3, true, sql)
    expect(await consume('user-4', '2026-W35', 1, true, sql)).toBeNull()
    await refund('user-4', '2026-W35', 1, sql)
    expect(await consume('user-4', '2026-W35', 1, true, sql)).toBe(3)
  })

  it('без БД (sql=null) — метрирования нет, а не отказ', async () => {
    expect(await consume('user-1', '2026-W35', 1, true, null)).toBeNull()
    expect(await getUsed('user-1', '2026-W35', null)).toBe(0)
  })
})
