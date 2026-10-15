// SQL-слой Луны-трекера: её заметки о советах (миграция 0018) и то, что ей нужно
// знать о ходе учёбы сверх карточки ученика (lib/db/studentActivity.js):
// звонки Speaking Buddy после совета и ошибки из этих звонков. Правила —
// что считать выполненным, как это показать модели — в lib/assistant/tracker.js.
//
// profileId — `user-<id>`: тем же ключом пишут тьютор (voice_session.device_id,
// mistake_log.device_id — токен-роут кладёт туда profileId залогиненного) и
// сайт (practice_state, skill_day).
//
// Мягкая деградация как во всех db-модулях: без DATABASE_URL — пусто и no-op;
// таблицы нет (миграция не доехала) — тоже пусто, а не ошибка: трекер не
// важнее ответа. Запросы — по одному, а не Promise.all: пул соединений общий с
// голосом и практикой учеников (см. studentActivity.js).

import { getSql } from './sql.js'
import { splitReviewLists } from './reviewMatch.js'

/** Сколько дней живёт заметка (решение владельца 15.10.2026). */
export const NOTE_TTL_DAYS = 30
export const NOTE_MAX_CHARS = 240
// Тот же раздел ещё раз в пределах суток, пока не выполнено, — тот же совет, а
// не новый: открыл окно на трёх экранах — три одинаковые строки «иди в домашку»
// захламили бы список и выглядели бы как три невыполненных совета.
const SAME_ADVICE_HOURS = 24
const NOTES_LIMIT = 20
const MISTAKES_CAP = 5

/**
 * Записывает совет Луны. true — легло (новой строкой или поверх вчерашнего
 * такого же), false — некуда или не вышло.
 */
export async function saveAdviceNote(profileId, { target, advice } = {}, sql = getSql()) {
  const text = String(advice ?? '').replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX_CHARS)
  if (!sql || !profileId || !target || !text) return false
  try {
    await sql`delete from assistant_note where created_at < now() - make_interval(days => ${NOTE_TTL_DAYS})`
    const same = await sql`
      update assistant_note set advice = ${text}
      where id = (
        select id from assistant_note
        where profile_id = ${profileId} and target = ${target} and done_at is null
          and created_at > now() - make_interval(hours => ${SAME_ADVICE_HOURS})
        order by created_at desc
        limit 1
      )
      returning id
    `
    if (same.length) return true
    await sql`insert into assistant_note (profile_id, target, advice) values (${profileId}, ${target}, ${text})`
    return true
  } catch (err) {
    console.warn('[assistant-tracker] note not saved:', err?.message || err)
    return false
  }
}

/** Заметки за 30 дней, свежие сверху: { id, target, advice, createdAt, doneAt }. */
export async function loadAdviceNotes(profileId, sql = getSql()) {
  if (!sql || !profileId) return []
  const rows = await sql`
    select id, target, advice, created_at, done_at from assistant_note
    where profile_id = ${profileId} and created_at > now() - make_interval(days => ${NOTE_TTL_DAYS})
    order by created_at desc
    limit ${NOTES_LIMIT}
  `.catch(() => [])
  return rows.map((r) => ({
    id: String(r.id),
    target: r.target,
    advice: r.advice,
    createdAt: new Date(r.created_at).toISOString(),
    doneAt: r.done_at ? new Date(r.done_at).toISOString() : null,
  }))
}

/**
 * Отмечает выполненные советы. Только там, где отметки ещё нет: однажды
 * выполненный совет не «разыполняется», а первая дата не переписывается.
 */
export async function markAdviceDone(updates, sql = getSql()) {
  if (!sql) return
  for (const u of updates || []) {
    if (!u?.id || !u.doneAt) continue
    await sql`update assistant_note set done_at = ${u.doneAt} where id = ${u.id} and done_at is null`.catch(() => {})
  }
}

/** Моменты, когда к ученику подключался тьютор (armed_at), начиная с since. */
export async function loadTutorSessionsSince(profileId, since, sql = getSql()) {
  if (!sql || !profileId || !since) return []
  const rows = await sql`
    select armed_at from voice_session
    where device_id = ${profileId} and armed_at is not null and armed_at > ${since}
    order by armed_at
    limit 100
  `.catch(() => [])
  return rows.map((r) => new Date(r.armed_at).toISOString())
}

/**
 * Ошибки из разговоров с тьютором, которые ещё не пройдены: те, что ждут
 * повторения, и свежие. Тем же splitReviewLists, что собирает их тьютору
 * (profile.js), — Луна и тьютор не должны расходиться в том, что «пройдено».
 * Сами звонки (call_log) не читаем — только записанные тьютором ошибки.
 */
export async function loadTutorMistakes(profileId, sql = getSql()) {
  if (!sql || !profileId) return []
  const mistakes = await sql`
    select mistake from mistake_log where device_id = ${profileId} order by created_at desc limit 30
  `.catch(() => [])
  const due = await sql`
    select item from review_item
    where device_id = ${profileId} and kind = 'mistake' and due_at <= now()
    order by due_at asc
    limit 6
  `.catch(() => [])
  // Отложенные повторения (SR уже показывал и увёл на паузу): тьютор их сейчас
  // не спрашивает — и Луна не должна тащить их в совет (то же условие, что в profile.js).
  const parked = await sql`
    select item from review_item
    where device_id = ${profileId} and kind = 'mistake' and due_at > now() and (box > 0 or serves > 0)
    limit 300
  `.catch(() => [])
  const resolved = await sql`
    select resolved from resolved_log where device_id = ${profileId} order by created_at desc limit 50
  `.catch(() => [])
  const lists = splitReviewLists({
    mistakes: mistakes.map((r) => r.mistake),
    due: due.map((r) => r.item),
    parked: parked.map((r) => r.item),
    resolved: resolved.map((r) => r.resolved),
  })
  // Сначала — те, что тьютор уже ждёт на повторение, потом свежие; без повторов.
  return [...new Set([...lists.dueReviews, ...lists.mistakes])].slice(0, MISTAKES_CAP)
}
