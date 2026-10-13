// Минуты практики ученика за день — копией на JTS-бэкенд, в план по дням общего курса (спека
// docs/superpowers/specs/2026-10-13-ge-plan-days-design.md, секция 3).
//
// План живёт на бэкенде, а тьютор, воркбук, словарь, медиа и шэдоуинг — в базе веба. Поэтому после КАЖДОЙ записи минут
// сервер веба пересчитывает итог дня по пяти разделам и отправляет его целиком (не прибавку): повтор, ретрай или два
// события подряд ничего не портят, а пропущенная отправка догоняется следующей.
//
// Источники — те же таблицы, что у недельной сводки (ecosystem.js): voice_usage (и платные pool_seconds — практика
// есть практика, кто бы за неё ни платил), shadowing_assess (кредит × 30 с — оценка сверху, как в сводке),
// activity_time (воркбук, словарь, медиа). Только для вошедших (`user-<id>`): у анонима плана нет.
//
// Ключ — служебный (GE_ACTIVITY_KEY, по умолчанию IELTS_GRADER_KEY: он уже есть на обоих стендах). Без ключа ничего
// не шлём. Ошибка отправки не роняет основной запрос — её видно в логе, а итог дня приедет со следующей записью.

import { after } from 'next/server'
import { getSql } from './db/sql.js'
import { BACKEND_URL } from './auth-server.js'
import { SECONDS_PER_CREDIT } from './db/shadowingBudget.js'

export const GE_MODULES = ['ai_tutor', 'workbooks', 'shadowing', 'media_practice', 'vocabulary_sr']
export const PUSH_TIMEOUT_MS = 5000

// env с Windows может прийти с BOM — как у остальных ключей веба
export function geActivityKey(env = process.env) {
  return (env.GE_ACTIVITY_KEY || env.IELTS_GRADER_KEY || '').replace(/^﻿/, '').trim()
}

/** 'user-42' → 42; device-id анонима и мусор — null. */
export function backendUserId(profileId) {
  const m = /^user-(\d+)$/.exec(String(profileId || ''))
  return m ? Number(m[1]) : null
}

const toMinutes = (seconds) => Math.round(Math.max(0, Number(seconds) || 0) / 60)

/** Сырые цифры дня → минуты по разделам плана. Чистая — арифметика проверяется без базы. */
export function dayMinutes({ voiceSeconds = 0, shadowingCredits = 0, activitySeconds = {} } = {}) {
  return {
    ai_tutor: toMinutes(voiceSeconds),
    workbooks: toMinutes(activitySeconds.workbooks),
    shadowing: toMinutes((Number(shadowingCredits) || 0) * SECONDS_PER_CREDIT),
    media_practice: toMinutes(activitySeconds.media_practice),
    vocabulary_sr: toMinutes(activitySeconds.vocabulary_sr),
  }
}

/** Сырые цифры одного дня ('YYYY-MM-DD', UTC — как пишут сами таблицы). */
export async function loadDay(profileId, day, sql = getSql()) {
  const [voice, shadow, activity] = await Promise.all([
    sql`
      select coalesce(sum(seconds + coalesce(pool_seconds, 0)), 0)::int as seconds
      from voice_usage where device_id = ${profileId} and day = ${day}
    `,
    sql`
      select coalesce(sum(used), 0)::int as used
      from shadowing_assess where profile_id = ${profileId} and day_key = ${day}
    `,
    sql`
      select module, coalesce(sum(seconds), 0)::int as seconds
      from activity_time where profile_id = ${profileId} and day = ${day}
      group by module
    `,
  ])
  const activitySeconds = {}
  for (const row of activity) activitySeconds[row.module] = row.seconds
  return { voiceSeconds: voice[0]?.seconds ?? 0, shadowingCredits: shadow[0]?.used ?? 0, activitySeconds }
}

/**
 * Отправить итог дня на бэкенд. Никогда не бросает: возвращает { sent, reason? }.
 * @param {string} profileId  'user-<id>'
 * @param {string} day        'YYYY-MM-DD'
 */
export async function pushGeActivity(profileId, day, { sql = getSql(), fetchImpl = fetch, env = process.env, backendUrl, timeoutMs = PUSH_TIMEOUT_MS } = {}) {
  const userId = backendUserId(profileId)
  if (!userId) return { sent: false, reason: 'anonymous' }
  const key = geActivityKey(env)
  if (!key) return { sent: false, reason: 'no_key' }
  if (!sql || !/^\d{4}-\d{2}-\d{2}$/.test(String(day || ''))) return { sent: false, reason: 'no_data' }
  try {
    const minutes = dayMinutes(await loadDay(profileId, day, sql))
    const res = await fetchImpl(`${backendUrl ?? BACKEND_URL}/integrations/web/ge-activity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Ge-Activity-Key': key },
      body: JSON.stringify({ userId, day, minutes }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      console.warn('[ge-activity] backend answered', res.status)
      return { sent: false, reason: `http_${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    console.warn('[ge-activity] push failed', e?.message || e)
    return { sent: false, reason: e?.name === 'TimeoutError' ? 'timeout' : 'network' }
  }
}

/**
 * Отправить после ответа: в роуте — через after(), чтобы ученик не ждал бэкенд. Вне запроса (вызов из хелпера,
 * тест) after() бросает — тогда просто фоном. Аноним отсекается сразу, без лишней работы.
 */
export function queueGeActivity(profileId, day, deps) {
  if (!backendUserId(profileId)) return
  const run = () => pushGeActivity(profileId, day, deps).catch(() => {})
  try {
    after(run)
  } catch {
    void run()
  }
}
