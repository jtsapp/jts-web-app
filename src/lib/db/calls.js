// История голосовых звонков: одна строка call_log на звонок — метаданные +
// полный текстовый транскрипт. Пишет агент в конце сессии
// (POST /api/profile/calls), читает клиент (GET) для экрана «Отчёт о разговоре»
// (плитки, разбор, новые слова) и «История разговоров» (список + транскрипт).
//
// Колонки recap/topics/wins/mistakes/new_words/focus заполняет суммаризатор
// (src/lib/callSummary/) уже после ответа агенту, в фоне.

import { getSql } from './sql.js'
import { appendFacts, appendTopics, ensureLearner } from './profile.js'

function trimText(s, max = 240) {
  if (typeof s !== 'string') return null
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return null
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

// transcript: [{role:'tutor'|'learner', text}] — чистим роли/текст и режем длину,
// чтобы одна аномальная сессия не залила базу гигантским jsonb.
function cleanTranscript(raw, capTurns = 500) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const turn of raw) {
    const role =
      turn?.role === 'tutor' ? 'tutor' : turn?.role === 'learner' ? 'learner' : null
    const text = trimText(turn?.text, 2000)
    if (role && text) out.push({ role, text })
    if (out.length >= capTurns) break
  }
  return out
}

function jsonArray(value) {
  return Array.isArray(value) ? value : []
}

/** @returns {Promise<string|null>} id вставленной строки — по нему работает суммаризатор. */
export async function insertCall(deviceId, call) {
  const sql = getSql()
  if (!sql) return null
  const transcript = cleanTranscript(call.transcript)
  // Пустой транскрипт не пишем — незачем плодить «пустые» звонки (сорванный
  // коннект, мгновенный выход).
  if (transcript.length === 0) return null
  await ensureLearner(deviceId)
  const durationSec = Number.isFinite(call.durationSec)
    ? Math.max(0, Math.trunc(call.durationSec))
    : null
  const status =
    call.status === 'passed' || call.status === 'failed' ? call.status : null
  const mode = ['free', 'scenario', 'placement', 'debate'].includes(call.mode)
    ? call.mode
    : 'free'
  // jsonb только через sql.json — иначе porsager положит jsonb-строку вместо
  // массива (см. profile.js upsertProfile).
  //
  // summary_status в этот INSERT НЕ входит намеренно: runMigrations глотает
  // ошибки, и если 0003 не доехала на инстанс, вставка упала бы с «column does
  // not exist» → 500 → потерян весь звонок вместе с транскриптом. Колонку пишет
  // только суммаризатор, у которого своя защита от отсутствующей колонки.
  const rows = await sql`
    insert into call_log
      (device_id, tutor, level, lang, duration_sec, mode, scenario_name, status, recap, transcript)
    values (
      ${deviceId},
      ${trimText(call.tutor, 40)},
      ${trimText(call.level, 8)},
      ${trimText(call.lang, 8)},
      ${durationSec},
      ${mode},
      ${trimText(call.scenarioName, 80)},
      ${status},
      ${trimText(call.recap, 240)},
      ${sql.json(transcript)}::jsonb
    )
    returning id
  `
  return rows.length > 0 ? String(rows[0].id) : null
}

// Последние звонки ученика. transcript отдаём инлайн (звонки короткие, лимит
// небольшой) — клиенту хватает одного запроса на список+детали. Экран отчёта
// зовёт то же самое с limit=1, пока ждёт, когда агент допишет свой звонок.
export async function listCalls(deviceId, limit = 50) {
  const sql = getSql()
  if (!sql) return []
  const rows = await sql`
    select id, tutor, duration_sec, mode, scenario_name, status, recap, topics,
           wins, mistakes, new_words, focus, summary_status, transcript, created_at
    from call_log
    where device_id = ${deviceId}
    order by created_at desc
    limit ${limit}
  `
  return rows.map((r) => ({
    id: String(r.id),
    tutor: r.tutor,
    durationSec: r.duration_sec,
    mode: r.mode,
    scenarioName: r.scenario_name,
    status: r.status,
    recap: r.recap,
    topics: jsonArray(r.topics),
    wins: jsonArray(r.wins),
    mistakes: jsonArray(r.mistakes),
    newWords: jsonArray(r.new_words),
    focus: r.focus,
    summaryStatus: r.summary_status ?? null,
    transcript: jsonArray(r.transcript),
    createdAt: r.created_at,
  }))
}

/** Данные одного звонка для (пере)суммаризации. */
export async function loadCallForSummary(callId) {
  const sql = getSql()
  if (!sql) return null
  const rows = await sql`
    select id, device_id, level, lang, mode, transcript
    from call_log
    where id = ${callId}
  `
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: String(r.id),
    deviceId: r.device_id,
    level: r.level,
    lang: r.lang,
    mode: r.mode,
    transcript: jsonArray(r.transcript),
  }
}

// Статусы пишет только суммаризатор. Ошибку глотаем: если 0003 не доехала,
// звонок всё равно должен остаться целым — потеряем максимум наблюдаемость.
export async function markSummaryStatus(callId, status) {
  const sql = getSql()
  if (!sql) return
  try {
    await sql`update call_log set summary_status = ${status} where id = ${callId}`
  } catch (err) {
    console.error('[calls] summary_status write failed', err?.message || err)
  }
}

/**
 * Запись выжимки: факты, темы и сама строка звонка — в одной транзакции.
 * Иначе возможен разрыв «факты уже в долгой памяти, а строка в pending», от
 * «не отработало» неотличимый, и повторный прогон допишет near-дубликаты.
 */
export async function saveCallSummary(callId, summary, options = {}) {
  const sql = getSql()
  if (!sql) return false
  await sql.begin(async (tx) => {
    // Владельца перечитываем ВНУТРИ транзакции, а не берём из вызывающего.
    // Пока крутится фоновая выжимка, аноним может залогиниться:
    // mergeDeviceIntoAccount перекинет call_log и fact_log на user-<id> и удалит
    // анонимную строку learner (merge.js, FK on delete cascade). Записав по
    // исходному deviceId, мы бы через ensureLearner воскресили мёртвую корзину,
    // факты легли бы в неё, а повторный мерж не прошёл бы уже никогда —
    // isAccountEmpty вернул бы false.
    const rows = await tx`select device_id from call_log where id = ${callId}`
    if (rows.length === 0) return
    const ownerId = rows[0].device_id

    if (options.withFacts && summary.facts.length > 0)
      await appendFacts(ownerId, summary.facts, tx)
    if (summary.topics.length > 0) await appendTopics(ownerId, summary.topics, tx)

    // where id = $callId и ТОЛЬКО id: добавить `and device_id = …` нельзя —
    // после мержа условие не совпадёт, апдейт тихо тронет 0 строк, и звонок
    // навсегда зависнет в pending.
    await tx`
      update call_log set
        recap = ${summary.recap},
        topics = ${tx.json(summary.topics)}::jsonb,
        wins = ${tx.json(summary.wins)}::jsonb,
        mistakes = ${tx.json(summary.mistakes)}::jsonb,
        new_words = ${tx.json(summary.newWords)}::jsonb,
        focus = ${summary.focus},
        summary_status = 'done'
      where id = ${callId}
    `
  })
  return true
}

/**
 * Один звонок, у которого выжимка не доехала. Мы на своём хостинге, и фоновую
 * работу убивает только рестарт контейнера или OOM — это единственная защита от
 * потери выжимки, планировщика в деплое нет.
 *
 * 15 минут — чтобы не хватать звонок, который прямо сейчас обрабатывается на
 * другом инстансе. 7 дней — чтобы дозапись не поползла по звонкам, записанным
 * до этой фичи (у них тоже summary_status is null).
 */
export async function findStaleSummaryCallId() {
  const sql = getSql()
  if (!sql) return null
  try {
    const rows = await sql`
      select id from call_log
      where (summary_status is null or summary_status = 'pending')
        and created_at < now() - interval '15 minutes'
        and created_at > now() - interval '7 days'
      order by created_at asc
      limit 1
    `
    return rows.length > 0 ? String(rows[0].id) : null
  } catch {
    // Колонки ещё нет (миграция не доехала) — подбирать нечего.
    return null
  }
}
