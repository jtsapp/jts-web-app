import { describe, it, expect } from 'vitest'
import { applySkillDeltas } from './skillStats.js'

// Фейковый sql: запоминает запросы и параметры. Точность SQL — на Postgres;
// здесь контракт: одна транзакция, навыки по одному, затем одна строка суток с
// суммой пачки.
function makeFakeSql() {
  const log = []
  const tag = async (strings, ...vals) => {
    log.push({ q: strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase(), vals })
    return []
  }
  tag.begin = async (fn) => {
    log.push({ q: 'begin', vals: [] })
    return fn(tag)
  }
  return { sql: tag, log }
}

describe('applySkillDeltas', () => {
  it('в той же транзакции копит решённые задания за сутки', async () => {
    const { sql, log } = makeFakeSql()
    await applySkillDeltas('user-7', {
      grammar: { done: 3, firstTry: 2 },
      listening: { done: 2, firstTry: 2 },
    }, sql)

    expect(log[0].q).toBe('begin')
    const skillRows = log.filter((e) => e.q.startsWith('insert into skill_stat'))
    expect(skillRows).toHaveLength(2)
    const dayRows = log.filter((e) => e.q.startsWith('insert into skill_day'))
    expect(dayRows).toHaveLength(1)
    // Сутки ставит сервер БД, а не клиент: в параметрах даты нет.
    expect(dayRows[0].q).toContain("(now() at time zone 'utc')::date")
    expect(dayRows[0].vals).toEqual(['user-7', 5, 4])
    expect(dayRows[0].q).toContain('on conflict (profile_id, day) do update')
  })

  it('пустая пачка ничего не пишет', async () => {
    const { sql, log } = makeFakeSql()
    await applySkillDeltas('user-7', { grammar: { done: 0, firstTry: 0 }, nope: { done: 5 } }, sql)
    expect(log).toEqual([])
  })

  it('отрицательные дельты не уменьшают сутки', async () => {
    const { sql, log } = makeFakeSql()
    await applySkillDeltas('user-7', { grammar: { done: -2, firstTry: 0 }, reading: { done: 1, firstTry: 1 } }, sql)
    const dayRows = log.filter((e) => e.q.startsWith('insert into skill_day'))
    expect(dayRows[0].vals).toEqual(['user-7', 1, 1])
  })

  it('без БД — no-op', async () => {
    await expect(applySkillDeltas('user-7', { grammar: { done: 1, firstTry: 1 } }, null)).resolves.toBeUndefined()
  })
})
