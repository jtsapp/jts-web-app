// Заметки Луны-трекера: запись, «тот же совет за сутки — та же строка», 30 дней,
// отметка выполнения и ошибки из звонков тьютора.
//
// Фейковый sql-таг повторяет семантику Postgres ровно в той части, на которой
// держатся правила модуля; время — настоящее (now() базы = Date.now() теста).

import { describe, it, expect } from 'vitest'
import {
  NOTE_MAX_CHARS,
  NOTE_TTL_DAYS,
  loadAdviceNotes,
  loadTutorMistakes,
  markAdviceDone,
  saveAdviceNote,
} from './assistantTracker.js'

const DAY = 24 * 60 * 60 * 1000

function makeFakeSql({ notes = [], mistakes = [], due = [], parked = [], resolved = [], fail = false } = {}) {
  let nextId = notes.length + 1
  const tag = (strings, ...vals) => {
    const q = strings.join(' ').replace(/\s+/g, ' ').trim().toLowerCase()
    const run = async () => {
      if (fail) throw new Error('relation "assistant_note" does not exist')
      const now = Date.now()
      if (q.startsWith('delete from assistant_note')) {
        const [days] = vals
        for (let i = notes.length - 1; i >= 0; i -= 1) if (now - notes[i].created_at > days * DAY) notes.splice(i, 1)
        return []
      }
      if (q.startsWith('update assistant_note set advice')) {
        const [text, profileId, target, hours] = vals
        const same = notes
          .filter((n) => n.profile_id === profileId && n.target === target && !n.done_at && now - n.created_at < hours * 3600000)
          .sort((a, b) => b.created_at - a.created_at)[0]
        if (!same) return []
        same.advice = text
        return [{ id: same.id }]
      }
      if (q.startsWith('insert into assistant_note')) {
        const [profileId, target, advice] = vals
        notes.push({ id: nextId++, profile_id: profileId, target, advice, created_at: now, done_at: null })
        return []
      }
      if (q.startsWith('update assistant_note set done_at')) {
        const [doneAt, id] = vals
        const n = notes.find((x) => String(x.id) === String(id) && !x.done_at)
        if (n) n.done_at = Date.parse(doneAt)
        return []
      }
      if (q.startsWith('select id, target, advice')) {
        const [profileId, days, limit] = vals
        return notes
          .filter((n) => n.profile_id === profileId && now - n.created_at < days * DAY)
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, limit)
      }
      if (q.startsWith('select mistake from mistake_log')) return mistakes.map((mistake) => ({ mistake }))
      if (q.includes('due_at <= now()')) return due.map((item) => ({ item }))
      if (q.includes('due_at > now()')) return parked.map((item) => ({ item }))
      if (q.startsWith('select resolved from resolved_log')) return resolved.map((r) => ({ resolved: r }))
      throw new Error(`unexpected query: ${q}`)
    }
    // Как у postgres.js: запрос — промис, у которого есть .catch.
    return run()
  }
  return { sql: tag, notes }
}

describe('заметки Луны', () => {
  it('совет ложится строкой: раздел, текст одной строкой, обрезка', async () => {
    const { sql, notes } = makeFakeSql()
    expect(await saveAdviceNote('user-1', { target: 'homework', advice: 'С домашки\n и стоит   начать.' }, sql)).toBe(true)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ profile_id: 'user-1', target: 'homework', advice: 'С домашки и стоит начать.' })
    await saveAdviceNote('user-1', { target: 'vocab', advice: 'я'.repeat(500) }, sql)
    expect(notes[1].advice).toHaveLength(NOTE_MAX_CHARS)
  })

  it('тот же раздел за сутки, пока не выполнено, — та же строка с новым текстом', async () => {
    const { sql, notes } = makeFakeSql()
    await saveAdviceNote('user-1', { target: 'homework', advice: 'Первый раз.' }, sql)
    await saveAdviceNote('user-1', { target: 'homework', advice: 'Второй раз.' }, sql)
    expect(notes).toHaveLength(1)
    expect(notes[0].advice).toBe('Второй раз.')
    // Другой ученик и другой раздел — отдельные строки.
    await saveAdviceNote('user-2', { target: 'homework', advice: 'Чужой.' }, sql)
    await saveAdviceNote('user-1', { target: 'vocab', advice: 'Словарь.' }, sql)
    expect(notes).toHaveLength(3)
  })

  it('выполненный или вчерашний совет — уже новая строка', async () => {
    const { sql, notes } = makeFakeSql({
      notes: [
        { id: 1, profile_id: 'user-1', target: 'homework', advice: 'выполнен', created_at: Date.now() - 3600000, done_at: Date.now() },
        { id: 2, profile_id: 'user-1', target: 'vocab', advice: 'позавчера', created_at: Date.now() - 2 * DAY, done_at: null },
      ],
    })
    await saveAdviceNote('user-1', { target: 'homework', advice: 'Снова домашка.' }, sql)
    await saveAdviceNote('user-1', { target: 'vocab', advice: 'Снова словарь.' }, sql)
    expect(notes.map((n) => n.advice)).toEqual(['выполнен', 'позавчера', 'Снова домашка.', 'Снова словарь.'])
  })

  it(`хранится ${NOTE_TTL_DAYS} дней: старое удаляет следующая запись`, async () => {
    const { sql, notes } = makeFakeSql({
      notes: [{ id: 1, profile_id: 'user-9', target: 'vocab', advice: 'старое', created_at: Date.now() - (NOTE_TTL_DAYS + 1) * DAY, done_at: null }],
    })
    await saveAdviceNote('user-1', { target: 'homework', advice: 'Новое.' }, sql)
    expect(notes.map((n) => n.advice)).toEqual(['Новое.'])
  })

  it('пустое и без базы — не пишется; таблицы нет — false, а не исключение', async () => {
    const { sql, notes } = makeFakeSql()
    expect(await saveAdviceNote('user-1', { target: 'homework', advice: '  ' }, sql)).toBe(false)
    expect(await saveAdviceNote('user-1', { target: '', advice: 'x' }, sql)).toBe(false)
    expect(await saveAdviceNote('user-1', { target: 'homework', advice: 'x' }, null)).toBe(false)
    expect(notes).toHaveLength(0)
    expect(await saveAdviceNote('user-1', { target: 'homework', advice: 'x' }, makeFakeSql({ fail: true }).sql)).toBe(false)
    expect(await loadAdviceNotes('user-1', makeFakeSql({ fail: true }).sql)).toEqual([])
  })

  it('чтение — свежие сверху, в ISO; отметка выполнения — один раз, первой датой', async () => {
    const { sql } = makeFakeSql({
      notes: [
        { id: 1, profile_id: 'user-1', target: 'homework', advice: 'раньше', created_at: Date.now() - 2 * DAY, done_at: null },
        { id: 2, profile_id: 'user-1', target: 'vocab', advice: 'позже', created_at: Date.now() - DAY, done_at: null },
      ],
    })
    const list = await loadAdviceNotes('user-1', sql)
    expect(list.map((n) => n.advice)).toEqual(['позже', 'раньше'])
    expect(list[0]).toMatchObject({ id: '2', target: 'vocab', doneAt: null })
    expect(list[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    await markAdviceDone([{ id: '1', doneAt: '2026-10-14T10:00:00.000Z' }], sql)
    await markAdviceDone([{ id: '1', doneAt: '2026-10-15T10:00:00.000Z' }], sql)
    const after = await loadAdviceNotes('user-1', sql)
    expect(after.find((n) => n.id === '1').doneAt).toBe('2026-10-14T10:00:00.000Z')
  })
})

describe('ошибки из звонков тьютора', () => {
  it('сначала ждущие повторения, потом свежие; пройденные и отложенные — нет', async () => {
    const { sql } = makeFakeSql({
      mistakes: ['he go to school', 'I am agree', 'she don\'t like', 'paused one'],
      due: ['he go to school'],
      parked: ['paused one'],
      resolved: ['I am agree'],
    })
    expect(await loadTutorMistakes('user-1', sql)).toEqual(['he go to school', 'she don\'t like'])
  })
})
