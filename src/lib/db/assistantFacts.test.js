// SQL-слой памяти Луны: запись с продлением, потолок, чтение живых, удаление только своего.
// Фейковый sql-таг повторяет семантику Postgres ровно в той части, на которой держатся правила модуля.
import { describe, it, expect } from 'vitest'
import { FACTS_CAP } from '../assistant/facts.js'
import { deleteFact, loadFacts, saveFacts } from './assistantFacts.js'

const DAY = 24 * 60 * 60 * 1000

function makeFakeSql({ rows = [], fail = false } = {}) {
  let nextId = rows.length + 1
  let tick = 0
  const tag = (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').trim().toLowerCase()
    const run = async () => {
      if (fail) throw new Error('relation "assistant_fact" does not exist')
      const now = Date.now()
      if (q.startsWith('delete from assistant_fact where expires_at < now()')) {
        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].expires_at < now) rows.splice(i, 1)
        return []
      }
      if (q.startsWith('select id, fact from assistant_fact')) {
        const [pid] = vals
        return rows.filter((r) => r.profile_id === pid).sort((a, b) => b.created_at - a.created_at)
      }
      if (q.startsWith('update assistant_fact set fact')) {
        const [fact, days, id] = vals
        const r = rows.find((x) => x.id === id)
        r.fact = fact
        r.expires_at = now + days * DAY
        return []
      }
      if (q.startsWith('insert into assistant_fact')) {
        const [pid, fact, days] = vals
        rows.push({ id: nextId++, profile_id: pid, fact, created_at: now + tick++, expires_at: now + days * DAY })
        return []
      }
      if (q.startsWith('delete from assistant_fact where profile_id')) {
        const [pid, pid2, cap] = vals
        const keep = new Set(rows.filter((r) => r.profile_id === pid2).sort((a, b) => b.created_at - a.created_at).slice(0, cap).map((r) => r.id))
        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].profile_id === pid && !keep.has(rows[i].id)) rows.splice(i, 1)
        return []
      }
      if (q.startsWith('select id, fact, created_at, expires_at')) {
        const [pid, cap] = vals
        return rows
          .filter((r) => r.profile_id === pid && r.expires_at > now)
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, cap)
      }
      if (q.startsWith('delete from assistant_fact where id')) {
        const [id, pid] = vals
        const i = rows.findIndex((r) => r.id === id && r.profile_id === pid)
        if (i < 0) return []
        rows.splice(i, 1)
        return [{ id }]
      }
      throw new Error('unexpected query: ' + q)
    }
    return run()
  }
  tag.rows = rows
  return tag
}

describe('assistantFacts', () => {
  it('пишет годное, чувствительное отсекает; тот же факт — продление, а не дубль', async () => {
    const sql = makeFakeSql()
    expect(await saveFacts('user-7', ['боится говорения', 'зарплата 300 тысяч'], sql)).toBe(1)
    expect(await saveFacts('user-7', ['Боится говорения.'], sql)).toBe(1)
    expect(sql.rows).toHaveLength(1)
    expect(sql.rows[0].fact).toBe('Боится говорения')
  })

  it(`не больше ${FACTS_CAP} на ученика — старые уходят; чужие не трогаются`, async () => {
    const sql = makeFakeSql({ rows: [{ id: 999, profile_id: 'user-8', fact: 'чужой', created_at: 0, expires_at: Date.now() + DAY }] })
    for (let i = 0; i < FACTS_CAP + 3; i++) await saveFacts('user-7', [`факт номер ${'а'.repeat(i + 1)}`], sql)
    const mine = await loadFacts('user-7', sql)
    expect(mine).toHaveLength(FACTS_CAP)
    expect(mine.at(-1).fact).toBe(`факт номер ${'а'.repeat(4)}`)
    expect(sql.rows.some((r) => r.profile_id === 'user-8')).toBe(true)
  })

  it('просроченное не читается и удаляется следующей записью', async () => {
    const sql = makeFakeSql({ rows: [{ id: 1, profile_id: 'user-7', fact: 'старое', created_at: 0, expires_at: Date.now() - 1 }] })
    expect(await loadFacts('user-7', sql)).toEqual([])
    await saveFacts('user-7', ['учится по вечерам'], sql)
    expect(sql.rows.map((r) => r.fact)).toEqual(['учится по вечерам'])
  })

  it('удаляет только своё', async () => {
    const sql = makeFakeSql({ rows: [{ id: 1, profile_id: 'user-8', fact: 'чужой', created_at: 0, expires_at: Date.now() + DAY }] })
    expect(await deleteFact('user-7', '1', sql)).toBe(false)
    expect(await deleteFact('user-8', '1', sql)).toBe(true)
    expect(await deleteFact('user-8', 'abc', sql)).toBe(false)
  })

  it('без базы или без таблицы — тихо пусто', async () => {
    expect(await saveFacts('user-7', ['учится по вечерам'], null)).toBe(0)
    expect(await loadFacts('user-7', null)).toEqual([])
    const broken = makeFakeSql({ fail: true })
    expect(await saveFacts('user-7', ['учится по вечерам'], broken)).toBe(0)
    expect(await loadFacts('user-7', broken)).toEqual([])
    expect(await deleteFact('user-7', '1', broken)).toBe(false)
  })
})
