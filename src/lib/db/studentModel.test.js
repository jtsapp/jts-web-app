// SQL-слой модели ученика: журнал ответов + шаг повторения у тем и слов одной транзакцией, чистка журнала старше 30
// дней, чтение карты тем и слов к повторению. Фейковый sql-таг повторяет Postgres ровно в той части, на которой держатся
// правила модуля.
import { describe, expect, it } from 'vitest'
import { loadDueWords, loadItems, loadRecentAnswers, loadWrongAnswers, recordAnswers } from './studentModel.js'

const DAY = 24 * 60 * 60 * 1000

function makeFakeSql({ failCleanup = false } = {}) {
  const db = { answers: [], items: new Map(), log: [] }
  let id = 1
  const run = (strings, vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase()
    db.log.push(q)
    const now = Date.now()
    if (q.startsWith('insert into study_answer')) {
      const [pid, source, item, level, ok, gap, title, example] = vals
      db.answers.push({ id: id++, profile_id: pid, source, item, level, ok, gap_ms: gap, title, example, at: new Date(now) })
      return []
    }
    if (q.startsWith('select item, kind, title, extra') && q.includes('item = any')) {
      const [pid, items] = vals
      return [...db.items.values()].filter((r) => r.profile_id === pid && items.includes(r.item))
    }
    if (q.startsWith('insert into study_item')) {
      const [pid, item, kind, title, extra, seen, correct, box, due, lapses, day, daySeen, dayWrong, first, last] = vals
      const prev = db.items.get(`${pid}|${item}`)
      db.items.set(`${pid}|${item}`, {
        profile_id: pid, item, kind, title, extra: extra ? JSON.parse(extra) : null, seen, correct, box, due_at: due, lapses, day,
        day_seen: daySeen, day_wrong: dayWrong, first_at: prev?.first_at || first, last_at: last,
      })
      return []
    }
    if (q.startsWith('delete from study_answer')) {
      if (failCleanup) throw new Error('boom')
      const [pid, days] = vals
      db.answers = db.answers.filter((a) => !(a.profile_id === pid && a.at.getTime() < now - days * DAY))
      return []
    }
    if (q.startsWith('select item, kind, title, extra') && q.includes("kind = 'word'")) {
      const [pid, limit] = vals
      return [...db.items.values()].filter((r) => r.profile_id === pid && r.kind === 'word' && r.due_at.getTime() <= now).sort((a, b) => a.due_at - b.due_at).slice(0, limit)
    }
    if (q.startsWith('select item, kind, title, extra')) {
      const [pid] = vals
      return [...db.items.values()].filter((r) => r.profile_id === pid)
    }
    if (q.startsWith('select source, item, title, example, at')) {
      const [pid] = vals
      return db.answers.filter((a) => a.profile_id === pid && !a.ok).sort((a, b) => b.at - a.at)
    }
    if (q.startsWith('select item, ok, gap_ms, title, at')) {
      const [pid] = vals
      return db.answers.filter((a) => a.profile_id === pid).sort((a, b) => b.at - a.at)
    }
    throw new Error('unexpected query: ' + q)
  }
  const tag = (strings, ...vals) => Promise.resolve().then(() => run(strings, vals))
  tag.begin = async (fn) => {
    const snapshot = { answers: [...db.answers], items: new Map(db.items) }
    const tx = (strings, ...vals) => Promise.resolve().then(() => run(strings, vals))
    tx.savepoint = async (f) => f(tx)
    try {
      return await fn(tx)
    } catch (e) {
      db.answers = snapshot.answers
      db.items = snapshot.items
      throw e
    }
  }
  return { sql: tag, db }
}

const ans = (over) => ({ source: 'ggame', item: 'ggame:L2-03', ok: true, level: null, title: 'Past Simple', example: null, gap: 4000, ...over })

describe('recordAnswers', () => {
  it('пишет журнал и шаг повторения; урок — только журнал', async () => {
    const { sql, db } = makeFakeSql()
    const now = Date.parse('2026-11-08T10:00:00Z')
    const res = await recordAnswers('user-7', [
      ans({ ok: false, example: 'Yesterday I ___ (go). → went' }),
      ans({}),
      { source: 'vocab', item: 'word:decide', ok: true, level: null, title: 'decide', example: null, gap: null, extra: { ru: 'решать' } },
      { source: 'lesson', item: 'lesson:b1:5', ok: false, level: 'B1', title: 'B1 · Why we spend', example: 'x → y', gap: 3000 },
    ], { sql, now })
    expect(res).toEqual({ saved: 4, items: 2 })
    expect(db.answers).toHaveLength(4)
    const topic = db.items.get('user-7|ggame:L2-03')
    expect(topic).toMatchObject({ kind: 'grammar', seen: 2, correct: 1, box: 0, day_wrong: 1 })
    expect(topic.due_at.getTime()).toBe(now + DAY)
    expect(db.items.get('user-7|word:decide')).toMatchObject({ kind: 'word', title: 'decide', extra: { ru: 'решать' } })
    expect(db.items.has('user-7|lesson:b1:5')).toBe(false)
  })

  it('повторение по сроку поднимает коробку; перевод слова не теряется, если в новой пачке его нет', async () => {
    const { sql, db } = makeFakeSql()
    const t0 = Date.parse('2026-11-08T10:00:00Z')
    await recordAnswers('user-7', [{ source: 'vocab', item: 'word:decide', ok: true, title: 'decide', extra: { ru: 'решать' }, gap: null, level: null, example: null }], { sql, now: t0 })
    await recordAnswers('user-7', [{ source: 'vocab', item: 'word:decide', ok: true, title: 'decide', extra: null, gap: null, level: null, example: null }], { sql, now: t0 + DAY + 1000 })
    const row = db.items.get('user-7|word:decide')
    expect(row.box).toBe(1)
    expect(row.extra).toEqual({ ru: 'решать' })
  })

  it('сбой чистки журнала не откатывает ответы', async () => {
    const { sql, db } = makeFakeSql({ failCleanup: true })
    await recordAnswers('user-7', [ans({})], { sql, now: Date.now() })
    expect(db.answers).toHaveLength(1)
  })

  it('без базы — no-op', async () => {
    expect(await recordAnswers('user-7', [ans({})], { sql: null })).toEqual({ saved: 0, items: 0 })
  })
})

describe('чтение', () => {
  it('карта тем, слова к повторению, ошибки и последние ответы', async () => {
    const { sql } = makeFakeSql()
    const now = Date.now()
    await recordAnswers('user-7', [ans({ ok: false, example: 'q → a' }), { source: 'vocab', item: 'word:decide', ok: true, title: 'decide', extra: { ru: 'решать' }, gap: null, level: null, example: null }], { sql, now: now - 2 * DAY })
    const items = await loadItems('user-7', sql)
    expect(items.map((i) => i.item).sort()).toEqual(['ggame:L2-03', 'word:decide'])
    const due = await loadDueWords('user-7', { sql })
    expect(due.map((d) => d.title)).toEqual(['decide'])
    const wrongs = await loadWrongAnswers('user-7', sql)
    expect(wrongs).toEqual([expect.objectContaining({ source: 'ggame', item: 'ggame:L2-03', example: 'q → a' })])
    const recent = await loadRecentAnswers('user-7', { sql })
    expect(recent[0]).toMatchObject({ item: expect.any(String), ok: expect.any(Boolean) })
  })

  it('таблицы нет — пусто, а не ошибка', async () => {
    const broken = Object.assign(() => Promise.reject(new Error('relation "study_item" does not exist')), {})
    expect(await loadItems('user-7', broken)).toEqual([])
    expect(await loadDueWords('user-7', { sql: broken })).toEqual([])
    expect(await loadRecentAnswers('user-7', { sql: broken })).toEqual([])
  })
})
