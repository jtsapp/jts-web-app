// SQL-слой журнала ответов Луны и их оценки (миграция 0023, ТЗ v2.0 8.5; спека
// docs/superpowers/specs/2026-11-08-luna-answer-rating-design.md). Форма записи и вычистка ПД — в
// lib/assistant/ratingShape.js, сюда приходит уже чистое.
//
// Мягкая деградация как во всех db-модулях: без DATABASE_URL — false и пусто; таблицы нет (миграция не доехала) —
// тоже false: журнал не важнее ответа.

import { getSql } from './sql.js'

/** Оценённый или с комментарием — 30 дней, как заметки Луны (assistant_note). */
export const RATED_TTL_DAYS = 30
/** Просто ответ — 14 дней: разбор раз в неделю плюс неделя запаса. */
export const LOG_TTL_DAYS = 14
// Удаление старого — не на каждую запись: на ответ их до трёх, а delete по таблице — лишняя работа базе.
const PRUNE_EVERY_MS = 10 * 60 * 1000
export const REVIEW_MAX_ROWS = 20000

let lastPrune = 0
/** Для тестов: следующая запись снова удалит старое. */
export function resetPruneClock() {
  lastPrune = 0
}

async function prune(sql, now) {
  if (now - lastPrune < PRUNE_EVERY_MS) return
  lastPrune = now
  await sql`
    delete from assistant_rating
    where created_at < now() - make_interval(days => ${RATED_TTL_DAYS})
       or (created_at < now() - make_interval(days => ${LOG_TTL_DAYS}) and rating is null and comment is null)
  `.catch(() => {})
}

/**
 * Записывает ответ (новой строкой или поверх своего прежнего состояния). Строку другого ученика с тем же id не
 * трогает, старое состояние (меньший seq, запрос пришёл позже) новое не переписывает.
 * @param {string} profileId `user-<id>`
 * @param {object} e запись parseRatingRequest после scrubPersonal, с mode / opening / event / persona
 * @returns {Promise<boolean>} легло ли
 */
export async function saveAnswerRating(profileId, e, sql = getSql(), now = Date.now()) {
  if (!sql || !profileId || !e?.id) return false
  try {
    await prune(sql, now)
    const at = new Date(now)
    const ratedAt = e.rating != null || e.comment ? at : null
    const clickedAt = e.clicked ? at : null
    const reasons = e.reasons?.length ? e.reasons.join(',') : null
    const actions = e.actions?.length ? e.actions.join('\n') : null
    const rows = await sql`
      insert into assistant_rating (
        id, profile_id, chat_id, turn, seq, screen, lang, persona, channel, mode, opening, event, offtopic, model,
        question, answer, first_ms, sound_ms, actions, clicked, clicked_at, rating, reasons, comment, rated_at,
        created_at, updated_at
      ) values (
        ${e.id}, ${profileId}, ${e.chat}, ${e.turn}, ${e.seq}, ${e.screen}, ${e.lang}, ${e.persona}, ${e.channel},
        ${e.mode}, ${e.opening}, ${e.event}, ${e.offtopic}, ${e.model}, ${e.question}, ${e.answer}, ${e.firstMs},
        ${e.soundMs}, ${actions}, ${e.clicked}, ${clickedAt}, ${e.rating}, ${reasons}, ${e.comment || null}, ${ratedAt},
        ${at}, ${at}
      )
      on conflict (id) do update set
        seq = excluded.seq,
        screen = excluded.screen,
        model = coalesce(excluded.model, assistant_rating.model),
        answer = excluded.answer,
        first_ms = coalesce(excluded.first_ms, assistant_rating.first_ms),
        sound_ms = coalesce(excluded.sound_ms, assistant_rating.sound_ms),
        actions = excluded.actions,
        clicked = coalesce(excluded.clicked, assistant_rating.clicked),
        clicked_at = case
          when excluded.clicked is not null and excluded.clicked is distinct from assistant_rating.clicked then excluded.clicked_at
          else assistant_rating.clicked_at end,
        rating = coalesce(excluded.rating, assistant_rating.rating),
        reasons = case when excluded.rating is null then assistant_rating.reasons else excluded.reasons end,
        comment = case when excluded.rating is null then assistant_rating.comment else excluded.comment end,
        rated_at = case
          when excluded.rating is not null and (excluded.rating is distinct from assistant_rating.rating
            or excluded.reasons is distinct from assistant_rating.reasons
            or excluded.comment is distinct from assistant_rating.comment) then excluded.rated_at
          else assistant_rating.rated_at end,
        updated_at = excluded.updated_at
      where assistant_rating.profile_id = excluded.profile_id and assistant_rating.seq < excluded.seq
      returning id
    `
    return rows.length > 0
  } catch (err) {
    console.warn('[assistant-rating] not saved:', err?.message || err)
    return false
  }
}

/**
 * Строки за период для разбора (служебный GET): по разговору и номеру ответа. profile_id наружу не идёт — роут
 * подменяет его псевдонимом (pseudonym).
 * @param {{ from: Date, to: Date, limit?: number, pseudonym?: (profileId: string) => string }} args
 */
export async function loadRatingsForReview({ from, to, limit = REVIEW_MAX_ROWS, pseudonym = () => '' }, sql = getSql()) {
  if (!sql) return []
  const rows = await sql`
    select id, profile_id, chat_id, turn, screen, lang, persona, channel, mode, opening, event, offtopic, model,
      question, answer, first_ms, sound_ms, actions, clicked, rating, reasons, comment, created_at
    from assistant_rating
    where created_at >= ${from} and created_at < ${to}
    order by chat_id, turn, created_at
    limit ${Math.min(limit, REVIEW_MAX_ROWS)}
  `.catch(() => [])
  return rows.map((r) => ({
    id: r.id,
    student: pseudonym(r.profile_id),
    chat: r.chat_id,
    turn: r.turn,
    screen: r.screen,
    lang: r.lang,
    persona: r.persona,
    channel: r.channel,
    mode: r.mode,
    opening: Boolean(r.opening),
    event: r.event,
    offtopic: Boolean(r.offtopic),
    model: r.model,
    question: r.question,
    answer: r.answer,
    firstMs: r.first_ms,
    soundMs: r.sound_ms,
    actions: r.actions ? String(r.actions).split('\n') : [],
    clicked: r.clicked,
    rating: r.rating == null ? null : Number(r.rating),
    reasons: r.reasons ? String(r.reasons).split(',') : [],
    comment: r.comment || '',
    createdAt: new Date(r.created_at).toISOString(),
  }))
}
