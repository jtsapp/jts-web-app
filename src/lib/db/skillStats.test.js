import { describe, it, expect } from 'vitest'
import { applySkillDeltas } from './skillStats.js'

// Фейковый sql: запоминает запросы, параметры и то, КАКИМ соединением запрос
// прошёл: `sql` — внешнее, `tx` — то, что sql.begin отдаёт внутрь транзакции.
// Раньше begin отдавал ту же функцию, и тест не отличал запись в транзакции от
// записи мимо неё. Точность SQL — на Postgres; здесь контракт: одна транзакция,
// навыки по одному, затем одна строка суток с суммой пачки — всё через tx.
function makeFakeSql() {
  const log = []
  const record = (via) => async (strings, ...vals) => {
    log.push({ via, q: strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase(), vals })
    return []
  }
  const sql = record('sql')
  sql.begin = async (fn) => {
    log.push({ via: 'sql', q: 'begin', vals: [] })
    return fn(record('tx'))
  }
  return { sql, log }
}

describe('applySkillDeltas', () => {
  it('в той же транзакции копит решённые задания за сутки', async () => {
    const { sql, log } = makeFakeSql()
    await applySkillDeltas('user-7', {
      grammar: { done: 3, firstTry: 2 },
      listening: { done: 2, firstTry: 2 },
    }, sql)

    expect(log[0]).toMatchObject({ via: 'sql', q: 'begin' })
    // Транзакция одна на всю пачку: вторая развела бы skill_stat и skill_day так
    // же, как запись мимо транзакции.
    expect(log.filter((e) => e.q === 'begin')).toHaveLength(1)
    const skillRows = log.filter((e) => e.q.startsWith('insert into skill_stat'))
    expect(skillRows).toHaveLength(2)
    const dayRows = log.filter((e) => e.q.startsWith('insert into skill_day'))
    expect(dayRows).toHaveLength(1)
    // Строка суток обязана лечь через соединение транзакции, а не через внешний
    // sql: иначе сбой между записями развёл бы skill_stat и skill_day.
    expect([...skillRows, ...dayRows].map((e) => e.via)).toEqual(['tx', 'tx', 'tx'])
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

  it('только отрицательные дельты: навык пишется, строки суток нет', async () => {
    const { sql, log } = makeFakeSql()
    await applySkillDeltas('user-7', { grammar: { done: -2, firstTry: 0 } }, sql)
    const skillRows = log.filter((e) => e.q.startsWith('insert into skill_stat'))
    expect(skillRows).toHaveLength(1)
    expect(skillRows[0].vals).toEqual(expect.arrayContaining(['user-7', 'grammar', -2, 0]))
    // Сумма суток по такой пачке 0/0: прибавлять нечего, и пустой upsert только
    // плодил бы строки без единого решённого задания.
    expect(log.filter((e) => e.q.startsWith('insert into skill_day'))).toHaveLength(0)
  })

  it('решено, но ни одного с первой попытки — сутки всё равно пишутся', async () => {
    const { sql, log } = makeFakeSql()
    await applySkillDeltas('user-7', { grammar: { done: 2, firstTry: 0 } }, sql)
    // Условие записи — «хоть что-то прибавилось», а не «обе суммы положительны»:
    // иначе день с одними ошибками выпал бы из календаря активности.
    const dayRows = log.filter((e) => e.q.startsWith('insert into skill_day'))
    expect(dayRows).toHaveLength(1)
    expect(dayRows[0].vals).toEqual(['user-7', 2, 0])
  })

  it('без БД — no-op', async () => {
    await expect(applySkillDeltas('user-7', { grammar: { done: 1, firstTry: 1 } }, null)).resolves.toBeUndefined()
  })
})
