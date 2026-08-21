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
  // Модуль оборачивает состояние в sql.json() — porsager сериализует параметр
  // сам, и ::jsonb-каст ставится уже на готовое значение (см. комментарий в
  // src/lib/db/practice.js). Фейк про это не знал и падал с «sql.json is not a
  // function» на первом же upsert, до любой проверки merge-семантики.
  // Заворачиваем так же, как драйвер: помеченный объект, из которого тест
  // достаёт полезную нагрузку.
  fn.json = (value) => ({ __json: value })
  return fn
}

/** Что ушло в upsert: значение, завёрнутое в sql.json(). */
function mergedFrom(calls) {
  const wrapped = calls[1].find((v) => v && typeof v === 'object' && '__json' in v)
  return wrapped.__json
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
