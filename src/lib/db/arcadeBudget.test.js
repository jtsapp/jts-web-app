// Дневной лимит ИИ-разборов «Аркады»: потолки, атомарное списание и
// возврат. Фейковый sql-таг повторяет семантику Postgres ровно там, где держится
// лимит (тот же приём, что situationsBudget.test.js).

import { describe, expect, it } from 'vitest'
import { budgetPayload, consume, dailyLimitFor, getUsed, refund } from './arcadeBudget.js'

function makeFakeSql(store = {}) {
  const key = (p, d) => `${p}|${d}`
  return async (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').toLowerCase()
    if (q.includes('insert into arcade_review')) {
      const [profileId, day] = vals
      const capped = q.includes('where arcade_review.used + 1 <=')
      const limit = capped ? vals[vals.length - 1] : Infinity
      const k = key(profileId, day)
      if (store[k] === undefined) {
        store[k] = 1
        return [{ used: 1 }]
      }
      if (store[k] + 1 <= limit) return [{ used: ++store[k] }]
      return []
    }
    if (q.includes('update arcade_review')) {
      const k = key(vals[0], vals[1])
      if (store[k] !== undefined) store[k] = Math.max(0, store[k] - 1)
      return []
    }
    if (q.includes('select used from arcade_review')) {
      const used = store[key(vals[0], vals[1])]
      return used === undefined ? [] : [{ used }]
    }
    throw new Error('неожиданный запрос: ' + q)
  }
}

describe('потолки', () => {
  it('20 в сутки и демо 5, как в «Ситуациях»', () => {
    expect(dailyLimitFor(false)).toBe(20)
    expect(dailyLimitFor(true)).toBe(5)
  })

  it('остаток для клиента', () => {
    expect(budgetPayload(7, false)).toMatchObject({ limit: 20, used: 7, remaining: 13 })
    expect(budgetPayload(9, true)).toMatchObject({ limit: 5, used: 9, remaining: 0 })
    expect(budgetPayload(null, false)).toBeNull()
  })
})

describe('списание', () => {
  it('упирается в потолок аккаунта, возврат отдаёт попытку', async () => {
    const sql = makeFakeSql()
    for (let i = 1; i <= 5; i++) expect(await consume('user-1', 'd', true, sql)).toBe(i)
    expect(await consume('user-1', 'd', true, sql)).toBeNull()
    await refund('user-1', 'd', sql)
    expect(await getUsed('user-1', 'd', sql)).toBe(4)
    expect(await consume('user-1', 'd', true, sql)).toBe(5)
  })

  it('без БД метрирования нет', async () => {
    expect(await consume('user-1', 'd', false, null)).toBeNull()
    expect(await getUsed('user-1', 'd', null)).toBe(0)
  })
})
