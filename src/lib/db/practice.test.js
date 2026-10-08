import { describe, it, expect } from 'vitest'
import { savePracticeState } from './practice.js'

// Фейковый sql: запоминает запросы и держит одну строку practice_state. Точность
// самого SQL — на Postgres; здесь контракт: транзакция, замок первым, слияние
// вместо замены, итог наружу.
function makeFakeSql(row) {
  const log = []
  const tag = async (strings, ...vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase()
    log.push(q)
    if (q.startsWith('select pg_advisory_xact_lock')) return []
    if (q.startsWith('select state from practice_state')) return row.state ? [{ state: row.state }] : []
    if (q.startsWith('insert into practice_state')) {
      row.state = vals[2].__json
      return []
    }
    throw new Error('unexpected query: ' + q)
  }
  tag.json = (v) => ({ __json: v })
  tag.begin = async (fn) => {
    log.push('begin')
    return fn(tag)
  }
  return { sql: tag, log }
}

describe('savePracticeState', () => {
  it('reading: сливает «лучший результат» и возвращает итог', async () => {
    const row = { state: { texts: { t1: { ex: { 0: { score: 5, total: 5 } }, done: false } } } }
    const { sql, log } = makeFakeSql(row)
    const merged = await savePracticeState(
      'user-1',
      'reading',
      { texts: { t1: { ex: { 0: { score: 1, total: 5 }, 1: { score: 6, total: 6 } } } } },
      sql,
    )
    expect(merged).toEqual({ texts: { t1: { ex: { 0: { score: 5, total: 5 }, 1: { score: 6, total: 6 } }, done: false } } })
    expect(row.state).toEqual(merged)
    // Замок до чтения: иначе параллельный POST прочитает то же состояние и
    // затрёт слитое.
    expect(log[0]).toBe('begin')
    expect(log[1]).toMatch(/^select pg_advisory_xact_lock/)
  })

  it('done-модули по-прежнему объединяются', async () => {
    const row = { state: { done: ['a1'] } }
    const { sql } = makeFakeSql(row)
    expect(await savePracticeState('user-1', 'grammar', { done: ['a2'] }, sql)).toEqual({ done: ['a1', 'a2'] })
  })

  it('без БД — no-op', async () => {
    expect(await savePracticeState('user-1', 'reading', { texts: {} }, null)).toBeUndefined()
  })
})
