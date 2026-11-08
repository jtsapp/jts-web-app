// SQL-слой модели ученика Луны (миграция 0024; спека docs/superpowers/specs/2026-11-08-luna-student-model-methodology-design.md).
// profileId — `user-<id>` из resolveProfileId. Мягкая деградация, как у навыков: getSql() === null → чтение пустое,
// запись — no-op; таблиц ещё нет на инстансе (миграция не доехала) — чтение пустое, запись бросает в роут (500 в лог,
// ученик ничего не замечает: журнал ответов — не прогресс).

import { getSql } from './sql.js'
import { srStep } from '../studentModel/sr.js'
import { KIND_OF_SOURCE } from '../studentModel/contract.js'

export const KEEP_DAYS = 30
// Потолки чтения: профиль Луны собирается на каждые три минуты разговора, и тяжёлый ученик не должен его тормозить.
const ITEMS_CAP = 3000
const WRONGS_CAP = 300
const TIMES_CAP = 5000
const RECENT_CAP = 30

const ms = (v) => (v instanceof Date ? v.getTime() : v == null ? null : new Date(v).getTime())
const dayStr = (v) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))

function fromRow(r) {
  return {
    item: r.item,
    kind: r.kind,
    title: r.title ?? null,
    extra: r.extra ?? null,
    seen: Number(r.seen) || 0,
    correct: Number(r.correct) || 0,
    box: Number(r.box) || 0,
    dueAt: ms(r.due_at),
    lapses: Number(r.lapses) || 0,
    day: dayStr(r.day),
    daySeen: Number(r.day_seen) || 0,
    dayWrong: Number(r.day_wrong) || 0,
    firstAt: ms(r.first_at),
    lastAt: ms(r.last_at),
  }
}

/**
 * Пачка ответов: журнал + шаг интервального повторения у тем и слов, одной транзакцией (повтор пачки клиентом после
 * сбоя не задвоит половину). Ответы — уже очищенные (studentModel/contract.js, cleanAnswers).
 * @returns {Promise<{ saved: number, items: number }>}
 */
export async function recordAnswers(profileId, answers, { sql = getSql(), now = Date.now() } = {}) {
  if (!sql || !profileId || !answers?.length) return { saved: 0, items: 0 }
  const tracked = [...new Set(answers.filter((a) => KIND_OF_SOURCE[a.source]).map((a) => a.item))]
  await sql.begin(async (tx) => {
    for (const a of answers) {
      await tx`
        insert into study_answer (profile_id, source, item, level, ok, gap_ms, title, example)
        values (${profileId}, ${a.source}, ${a.item}, ${a.level}, ${a.ok}, ${a.gap}, ${a.title}, ${a.example})
      `
    }
    if (tracked.length) {
      // for update: два устройства одного ученика шлют пачки разом — шаг повторения не должен потеряться.
      const rows = await tx`
        select item, kind, title, extra, seen, correct, box, due_at, lapses, day, day_seen, day_wrong, first_at, last_at
        from study_item where profile_id = ${profileId} and item = any(${tracked}::text[])
        for update
      `
      const state = new Map(rows.map((r) => [r.item, fromRow(r)]))
      for (const a of answers) {
        const kind = KIND_OF_SOURCE[a.source]
        if (!kind) continue
        const prev = state.get(a.item) || null
        const next = srStep(prev, a.ok, now)
        state.set(a.item, { ...next, item: a.item, kind, title: a.title || prev?.title || null, extra: a.extra || prev?.extra || null })
      }
      for (const item of tracked) {
        const s = state.get(item)
        await tx`
          insert into study_item (profile_id, item, kind, title, extra, seen, correct, box, due_at, lapses, day, day_seen, day_wrong, first_at, last_at)
          values (${profileId}, ${item}, ${s.kind}, ${s.title}, ${s.extra ? JSON.stringify(s.extra) : null}::jsonb, ${s.seen}, ${s.correct},
                  ${s.box}, ${new Date(s.dueAt)}, ${s.lapses}, ${s.day}, ${s.daySeen}, ${s.dayWrong}, ${new Date(s.firstAt)}, ${new Date(s.lastAt)})
          on conflict (profile_id, item) do update set
            title = excluded.title, extra = excluded.extra, seen = excluded.seen, correct = excluded.correct, box = excluded.box,
            due_at = excluded.due_at, lapses = excluded.lapses, day = excluded.day, day_seen = excluded.day_seen,
            day_wrong = excluded.day_wrong, last_at = excluded.last_at
        `
      }
    }
    // Срок хранения журнала — в своей точке сохранения: сбой чистки не должен откатывать сами ответы.
    try {
      await tx.savepoint(async (sp) => {
        await sp`delete from study_answer where profile_id = ${profileId} and at < now() - make_interval(days => ${KEEP_DAYS})`
      })
    } catch (err) {
      console.error('[studentModel] cleanup failed', err?.message || err)
    }
  })
  return { saved: answers.length, items: tracked.length }
}

/** Все темы и слова ученика (карта тем). Таблицы нет — пусто. */
export async function loadItems(profileId, sql = getSql()) {
  if (!sql || !profileId) return []
  try {
    const rows = await sql`
      select item, kind, title, extra, seen, correct, box, due_at, lapses, day, day_seen, day_wrong, first_at, last_at
      from study_item where profile_id = ${profileId}
      order by last_at desc
      limit ${ITEMS_CAP}
    `
    return rows.map(fromRow)
  } catch (err) {
    console.error('[studentModel] items read failed', err?.message || err)
    return []
  }
}

/** Слова, которые пора повторить (блок «Словаря»), — самые просроченные первыми. */
export async function loadDueWords(profileId, { sql = getSql(), limit = 20 } = {}) {
  if (!sql || !profileId) return []
  try {
    const rows = await sql`
      select item, kind, title, extra, seen, correct, box, due_at, lapses, day, day_seen, day_wrong, first_at, last_at
      from study_item where profile_id = ${profileId} and kind = 'word' and due_at <= now()
      order by due_at asc
      limit ${limit}
    `
    return rows.map(fromRow)
  } catch (err) {
    console.error('[studentModel] due words read failed', err?.message || err)
    return []
  }
}

/** Ошибки заданий за срок журнала — для журнала ошибок. */
export async function loadWrongAnswers(profileId, sql = getSql()) {
  if (!sql || !profileId) return []
  try {
    const rows = await sql`
      select source, item, title, example, at from study_answer
      where profile_id = ${profileId} and not ok and at >= now() - make_interval(days => ${KEEP_DAYS})
      order by at desc
      limit ${WRONGS_CAP}
    `
    return rows.map((r) => ({ source: r.source, item: r.item, title: r.title ?? null, example: r.example ?? null, at: ms(r.at) }))
  } catch (err) {
    console.error('[studentModel] wrong answers read failed', err?.message || err)
    return []
  }
}

/** Время ответов за срок журнала — для поведения. */
export async function loadAnswerTimes(profileId, sql = getSql()) {
  if (!sql || !profileId) return []
  try {
    const rows = await sql`
      select at from study_answer
      where profile_id = ${profileId} and at >= now() - make_interval(days => ${KEEP_DAYS})
      order by at desc
      limit ${TIMES_CAP}
    `
    return rows.map((r) => ms(r.at))
  } catch (err) {
    console.error('[studentModel] answer times read failed', err?.message || err)
    return []
  }
}

/** Ответы последних минут — для темпа (pace.js). */
export async function loadRecentAnswers(profileId, { sql = getSql(), minutes = 90 } = {}) {
  if (!sql || !profileId) return []
  try {
    const rows = await sql`
      select item, ok, gap_ms, title, at from study_answer
      where profile_id = ${profileId} and at >= now() - make_interval(mins => ${minutes})
      order by at desc
      limit ${RECENT_CAP}
    `
    return rows.map((r) => ({ item: r.item, ok: Boolean(r.ok), gapMs: r.gap_ms == null ? null : Number(r.gap_ms), title: r.title ?? null, at: ms(r.at) }))
  } catch (err) {
    console.error('[studentModel] recent answers read failed', err?.message || err)
    return []
  }
}
