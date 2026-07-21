// История голосовых звонков: одна строка call_log на звонок — метаданные +
// полный текстовый транскрипт. Пишет агент в конце сессии
// (POST /api/profile/calls), читает клиент (GET) для экрана «История
// разговоров» (список + транскрипт по тапу).

import { getSql } from './sql.js'
import { ensureLearner } from './profile.js'

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

export async function insertCall(deviceId, call) {
  const sql = getSql()
  if (!sql) return
  const transcript = cleanTranscript(call.transcript)
  // Пустой транскрипт не пишем — незачем плодить «пустые» звонки (сорванный
  // коннект, мгновенный выход).
  if (transcript.length === 0) return
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
  await sql`
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
  `
}

// Последние звонки ученика для экрана истории. transcript отдаём инлайн (звонки
// короткие, лимит небольшой) — клиенту хватает одного запроса на список+детали.
export async function listCalls(deviceId, limit = 50) {
  const sql = getSql()
  if (!sql) return []
  const rows = await sql`
    select id, tutor, duration_sec, mode, scenario_name, status, recap, transcript, created_at
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
    transcript: Array.isArray(r.transcript) ? r.transcript : [],
    createdAt: r.created_at,
  }))
}
