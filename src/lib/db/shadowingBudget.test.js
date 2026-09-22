// Учёт оценок Shadowing: кредиты пишутся без потолка (лимит снят 22.09.2026),
// но пишутся — из них недельная сводка Roadmap считает минуты шэдоуинга.
// Базовая математика модуля (ключ суток, кредиты по длине wav) покрыта в
// tests/shadowing-budget.spec.js.

import { describe, it, expect } from 'vitest'
import { recordCredits } from './shadowingBudget.js'

// Фейковый sql-таг с семантикой upsert в памяти. Потолок (where в ветке on
// conflict) соблюдает, как настоящий Postgres, — если он в запросе появится.
function makeFakeSql(store = {}) {
  const tag = async (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').toLowerCase()
    if (q.includes('insert into shadowing_assess')) {
      const [profileId, day, credits] = vals
      const k = `${profileId}|${day}`
      const next = (store[k] ?? 0) + credits
      const ceiling = /do update .* where /.test(q) ? vals[vals.length - 1] : Infinity
      if (store[k] !== undefined && next > ceiling) return []
      store[k] = next
      return [{ used: next }]
    }
    return []
  }
  tag.store = store
  return tag
}

describe('recordCredits — учёт без потолка', () => {
  it('пишет кредиты и отдаёт новое used', async () => {
    const sql = makeFakeSql()
    expect(await recordCredits('user-1', '2026-09-22', 1, sql)).toBe(1)
    expect(await recordCredits('user-1', '2026-09-22', 2, sql)).toBe(3)
    expect(sql.store['user-1|2026-09-22']).toBe(3)
  })

  it('прежние 10 кредитов в сутки — не стена: запись идёт дальше', async () => {
    const sql = makeFakeSql({ 'user-1|2026-09-22': 10 })
    expect(await recordCredits('user-1', '2026-09-22', 1, sql)).toBe(11)
    // Запись «целиком» на 15 минут — 30 кредитов разом.
    expect(await recordCredits('user-1', '2026-09-22', 30, sql)).toBe(41)
  })

  it('сутки независимы', async () => {
    const sql = makeFakeSql({ 'user-1|2026-09-21': 7 })
    expect(await recordCredits('user-1', '2026-09-22', 1, sql)).toBe(1)
  })

  it('без БД (sql=null) — учёта нет, и это не ошибка', async () => {
    expect(await recordCredits('user-1', '2026-09-22', 1, null)).toBeNull()
  })
})
