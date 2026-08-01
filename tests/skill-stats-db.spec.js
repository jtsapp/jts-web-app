import { test, expect } from '@playwright/test'
import { loadSkillStats, applySkillDeltas } from '../src/lib/db/skillStats.js'

// Фейковый tagged-template `sql`: вызывается как sql`...${v}...`.
// Для SELECT возвращает заранее заданные строки; для остального — [] и лог вызова.
function fakeSql(selectRows = []) {
  const calls = []
  const fn = (strings, ...values) => {
    const text = strings.join('?')
    calls.push({ text, values })
    if (/select/i.test(text)) return Promise.resolve(selectRows)
    return Promise.resolve([])
  }
  fn.calls = calls
  // applySkillDeltas оборачивает батч в sql.begin(cb) — прогоняем cb с тем же fn,
  // чтобы вложенные upsert'ы попадали в тот же лог вызовов.
  fn.begin = (cb) => cb(fn)
  return fn
}

test.describe('db/skillStats', () => {
  test('loadSkillStats — пустая БД отдаёт нули по всем навыкам', async () => {
    const stats = await loadSkillStats('user-1', fakeSql([]))
    expect(stats.grammar).toEqual({ done: 0, firstTry: 0 })
    expect(stats.speaking).toEqual({ done: 0, firstTry: 0 })
    expect(Object.keys(stats).length).toBe(6)
  })

  test('loadSkillStats — строки БД маппятся в {done,firstTry}', async () => {
    const rows = [{ skill: 'grammar', tasks_done: 10, first_try_correct: 7 }]
    const stats = await loadSkillStats('user-1', fakeSql(rows))
    expect(stats.grammar).toEqual({ done: 10, firstTry: 7 })
    expect(stats.vocab).toEqual({ done: 0, firstTry: 0 })
  })

  test('loadSkillStats — sql=null (БД не поднята) → нули без запроса', async () => {
    const stats = await loadSkillStats('user-1', null)
    expect(stats.reading).toEqual({ done: 0, firstTry: 0 })
  })

  test('applySkillDeltas — по одному upsert-инкременту на навык', async () => {
    const sql = fakeSql([])
    await applySkillDeltas('user-1', { grammar: { done: 3, firstTry: 2 }, vocab: { done: 1, firstTry: 1 } }, sql)
    const upserts = sql.calls.filter((c) => /insert into skill_stat/i.test(c.text))
    expect(upserts.length).toBe(2)
    expect(upserts[0].values).toContain('user-1')
  })

  test('applySkillDeltas — sql=null → no-op без ошибок', async () => {
    await applySkillDeltas('user-1', { grammar: { done: 1, firstTry: 1 } }, null)
  })
})
