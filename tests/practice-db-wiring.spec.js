import { test, expect } from '@playwright/test'
import { savePracticeState } from '../src/lib/db/practice.js'

// Проверяем обвязку read-merge-write через инъектируемый фейковый sql (без Neon):
// SELECT возвращает существующее состояние, второй вызов (upsert) должен нести
// результат mergeModuleState — union для done-модулей, replace для vocab.
function fakeSql(selectRows) {
  const calls = []
  const fn = (_strings, ...values) => {
    calls.push(values)
    // первый вызов — SELECT (вернуть существующее), последующие — upsert (пусто)
    return Promise.resolve(calls.length === 1 ? selectRows : [])
  }
  fn.calls = calls
  return fn
}

// Достаём jsonb-строку, переданную в upsert (JSON.stringify(merged)).
function mergedFrom(calls) {
  const upsertValues = calls[1]
  const jsonStr = upsertValues.find((v) => typeof v === 'string' && v.includes('"'))
  return JSON.parse(jsonStr)
}

test.describe('savePracticeState — обвязка read-merge-write', () => {
  test('grammar: union с существующим done', async () => {
    const sql = fakeSql([{ state: { done: ['a1:1'] } }])
    await savePracticeState('user-1', 'grammar', { done: ['a1:2', 'a1:1'] }, sql)
    expect(sql.calls.length).toBe(2)
    expect(mergedFrom(sql.calls)).toEqual({ done: ['a1:1', 'a1:2'] })
  })

  test('vocab: replace всего блоба', async () => {
    const sql = fakeSql([{ state: { level: 'A1' } }])
    await savePracticeState('user-1', 'vocab', { level: 'B1', srs: {} }, sql)
    expect(mergedFrom(sql.calls)).toEqual({ level: 'B1', srs: {} })
  })
})
