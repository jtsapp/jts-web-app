// SQL-слой журнала оценок Луны: upsert по id своего ученика, старое состояние не переписывает новое, удаление
// старого — не чаще раза в 10 минут. Фейковый sql-таг повторяет семантику Postgres ровно в той части, на которой
// держатся правила модуля (как в assistantFacts.test.js).
import { describe, it, expect, beforeEach } from 'vitest'
import { LOG_TTL_DAYS, RATED_TTL_DAYS, loadRatingsForReview, resetPruneClock, saveAnswerRating } from './assistantRatings.js'

const DAY = 24 * 60 * 60 * 1000
const COLS = ['id', 'profile_id', 'chat_id', 'turn', 'seq', 'screen', 'lang', 'persona', 'channel', 'mode', 'opening', 'event', 'offtopic', 'model', 'question', 'answer', 'first_ms', 'sound_ms', 'actions', 'clicked', 'clicked_at', 'rating', 'reasons', 'comment', 'rated_at', 'created_at', 'updated_at']

function makeFakeSql({ rows = [], fail = false } = {}) {
  const log = []
  const tag = (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').trim().toLowerCase()
    log.push(q)
    return (async () => {
      if (fail) throw new Error('relation "assistant_rating" does not exist')
      if (q.startsWith('delete from assistant_rating')) {
        const [rated, logged] = vals
        const now = Date.now()
        for (let i = rows.length - 1; i >= 0; i--) {
          const age = now - rows[i].created_at.getTime()
          if (age > rated * DAY || (age > logged * DAY && rows[i].rating == null && rows[i].comment == null)) rows.splice(i, 1)
        }
        return []
      }
      if (q.startsWith('insert into assistant_rating')) {
        const x = Object.fromEntries(COLS.map((c, i) => [c, vals[i]]))
        const old = rows.find((r) => r.id === x.id)
        if (!old) {
          rows.push(x)
          return [{ id: x.id }]
        }
        if (old.profile_id !== x.profile_id || old.seq >= x.seq) return []
        const changed = x.rating != null && (x.rating !== old.rating || x.reasons !== old.reasons || x.comment !== old.comment)
        Object.assign(old, {
          seq: x.seq,
          screen: x.screen,
          model: x.model ?? old.model,
          answer: x.answer,
          first_ms: x.first_ms ?? old.first_ms,
          sound_ms: x.sound_ms ?? old.sound_ms,
          actions: x.actions,
          clicked_at: x.clicked != null && x.clicked !== old.clicked ? x.clicked_at : old.clicked_at,
          clicked: x.clicked ?? old.clicked,
          rating: x.rating ?? old.rating,
          reasons: x.rating == null ? old.reasons : x.reasons,
          comment: x.rating == null ? old.comment : x.comment,
          rated_at: changed ? x.rated_at : old.rated_at,
          updated_at: x.updated_at,
        })
        return [{ id: x.id }]
      }
      if (q.startsWith('select id, profile_id, chat_id')) {
        const [from, to, limit] = vals
        return rows
          .filter((r) => r.created_at >= from && r.created_at < to)
          .sort((a, b) => a.chat_id.localeCompare(b.chat_id) || a.turn - b.turn)
          .slice(0, limit)
      }
      throw new Error('unexpected query: ' + q)
    })()
  }
  tag.rows = rows
  tag.log = log
  return tag
}

const entry = (over = {}) => ({
  id: 'r0123456789abc', chat: 'c0123456789abc', turn: 1, seq: 1, screen: 'home', lang: 'ru', persona: 'luna', channel: 'text',
  mode: 'site', opening: false, event: null, offtopic: false, model: 'claude-haiku-5-5', question: 'Где домашка?',
  answer: 'В «Уроках».', firstMs: 800, soundMs: null, actions: ['open:lessons'], clicked: null, rating: null, reasons: [], comment: '',
  ...over,
})

beforeEach(() => resetPruneClock())

describe('saveAnswerRating', () => {
  it('без базы и без id — false, не бросает', async () => {
    expect(await saveAnswerRating('user-1', entry(), null)).toBe(false)
    expect(await saveAnswerRating('user-1', { ...entry(), id: '' }, makeFakeSql())).toBe(false)
    expect(await saveAnswerRating('user-1', entry(), makeFakeSql({ fail: true }))).toBe(false)
  })

  it('пишет строку, затем дописывает оценку и нажатие в неё же', async () => {
    const sql = makeFakeSql()
    expect(await saveAnswerRating('user-1', entry(), sql)).toBe(true)
    const row = sql.rows[0]
    expect(row).toMatchObject({ profile_id: 'user-1', chat_id: 'c0123456789abc', actions: 'open:lessons', rating: null, reasons: null, comment: null, rated_at: null })
    await saveAnswerRating('user-1', entry({ seq: 2, soundMs: 1500, clicked: 'open:lessons' }), sql)
    expect(row).toMatchObject({ sound_ms: 1500, clicked: 'open:lessons', rating: null })
    expect(row.clicked_at).toBeInstanceOf(Date)
    await saveAnswerRating('user-1', entry({ seq: 3, clicked: 'open:lessons', rating: -1, reasons: ['wrong', 'lang'], comment: 'не то' }), sql)
    expect(row).toMatchObject({ rating: -1, reasons: 'wrong,lang', comment: 'не то' })
    expect(row.rated_at).toBeInstanceOf(Date)
    // 👎 → 👍: причины уходят вместе с оценкой.
    await saveAnswerRating('user-1', entry({ seq: 4, clicked: 'open:lessons', rating: 1 }), sql)
    expect(row).toMatchObject({ rating: 1, reasons: null, comment: null })
    expect(sql.rows).toHaveLength(1)
  })

  it('запоздавший запрос со старым seq новое не переписывает', async () => {
    const sql = makeFakeSql()
    await saveAnswerRating('user-1', entry({ seq: 2, rating: 1 }), sql)
    expect(await saveAnswerRating('user-1', entry({ seq: 1 }), sql)).toBe(false)
    expect(sql.rows[0].rating).toBe(1)
  })

  it('чужую строку с тем же id не трогает', async () => {
    const sql = makeFakeSql()
    await saveAnswerRating('user-1', entry(), sql)
    expect(await saveAnswerRating('user-2', entry({ seq: 5, rating: -1, answer: 'подмена' }), sql)).toBe(false)
    expect(sql.rows[0]).toMatchObject({ profile_id: 'user-1', answer: 'В «Уроках».', rating: null })
  })

  it('старое удаляет: просто ответ — через 14 дней, оценённый — через 30; не чаще раза в 10 минут', async () => {
    const now = Date.now()
    const old = (days, rating = null) => ({ id: `r-old-${days}-${rating}`, created_at: new Date(now - days * DAY), rating, comment: null })
    const sql = makeFakeSql({ rows: [old(LOG_TTL_DAYS + 1), old(LOG_TTL_DAYS + 1, 1), old(RATED_TTL_DAYS + 1, 1), old(3)] })
    await saveAnswerRating('user-1', entry(), sql, now)
    expect(sql.rows.map((r) => r.id).sort()).toEqual(['r-old-15-1', 'r-old-3-null', 'r0123456789abc'].sort())
    await saveAnswerRating('user-1', entry({ id: 'r-second-answer', seq: 1 }), sql, now + 60_000)
    expect(sql.log.filter((q) => q.startsWith('delete')).length).toBe(1)
    await saveAnswerRating('user-1', entry({ id: 'r-third-answer', seq: 1 }), sql, now + 11 * 60_000)
    expect(sql.log.filter((q) => q.startsWith('delete')).length).toBe(2)
  })
})

describe('loadRatingsForReview', () => {
  it('без profile_id наружу — псевдоним; поля — в camelCase', async () => {
    const sql = makeFakeSql()
    await saveAnswerRating('user-1', entry({ rating: -1, reasons: ['unclear'], comment: 'сложно' }), sql)
    const rows = await loadRatingsForReview({ from: new Date(Date.now() - DAY), to: new Date(Date.now() + DAY), pseudonym: (p) => `p:${p.length}` }, sql)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ student: 'p:6', chat: 'c0123456789abc', rating: -1, reasons: ['unclear'], comment: 'сложно', actions: ['open:lessons'], firstMs: 800 })
    expect(rows[0]).not.toHaveProperty('profile_id')
    expect(await loadRatingsForReview({ from: new Date(), to: new Date() }, null)).toEqual([])
  })
})
