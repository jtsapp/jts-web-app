// Звонок Луне-помощнику: токен LiveKit-комнаты, куда заходит общий голосовой
// агент в режиме `assistant` (agent/assistant_call.py).
//
// Отдельно от /api/livekit/token намеренно: у тьютора там память ученика,
// повторение ошибок, сценарии, нрав и пул минут тарифа, а звонку помощнику не
// положено ничего из этого. Здесь только: вход обязателен (Луна знает ученика,
// аноним ей не нужен), свой дневной лимит (callUsage.js) и короткая metadata.
//
// Отвечает за ответы НЕ агент: он спрашивает браузер, а тот — тот же
// /api/assistant/chat по токену ученика. Поэтому в metadata нет ни памяти,
// ни контекста — только язык, имя и бюджет секунд для сторожа агента.
//
// Учёт строже, чем у тьютора (ревью 16.10.2026): сбой базы — звонка нет (503),
// а не полный бюджет без счёта; вторая комната, пока идёт первая, — 409: бюджет
// секунд выдаётся комнате один раз, и две вкладки уложили бы в день вдвое
// больше лимита.

import { AccessToken } from 'livekit-server-sdk'
import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { closeStaleSessions, getUsage, isDbConfigured, openSession } from '@/lib/usage.js'
import { ASSISTANT_CALL_DAILY_SEC, assistantCallProfileId, hasOpenAssistantCall } from '@/lib/assistant/callUsage.js'
import { assistantCallHiddenFor } from '@/lib/assistant/callGate.js'

export const runtime = 'nodejs'

// Env из Windows-пайпа приходит с BOM — режем, как и везде на сервере.
const env = (name) => (process.env[name] || '').replace(/^﻿/, '').trim()

const LANGS = new Set(['ru', 'kz', 'en'])
const json = (status, body) => Response.json(body, { status })
const rand = () => Math.random().toString(36).slice(2, 10)

// Домен, на который пришёл ученик. За nginx приложение видит свой внутренний
// адрес, поэтому сначала заголовок прокси.
const requestHost = (request) =>
  (request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host).split(',')[0]

export async function POST(request) {
  // На проде звонка ещё нет (callGate.js): кнопку прячет окно, а роут не даёт
  // позвонить и в обход неё — агент без режима assistant провёл бы комнату
  // уроком тьютора.
  if (assistantCallHiddenFor(requestHost(request))) return json(404, { error: 'not_found' })

  const auth = await verifyTokenStatus(bearerFromRequest(request))
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })

  const apiKey = env('LIVEKIT_API_KEY')
  const apiSecret = env('LIVEKIT_API_SECRET')
  const url = env('LIVEKIT_URL')
  if (!apiKey || !apiSecret || !url) return json(503, { configured: false, error: 'livekit_unconfigured' })

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — язык по умолчанию */
  }
  const lang = LANGS.has(body.lang) ? body.lang : 'ru'

  const userId = auth.user.userId
  const profileId = assistantCallProfileId(userId)
  const limitSec = ASSISTANT_CALL_DAILY_SEC
  let ttl = limitSec
  // Без базы (локальный стенд) лимит не посчитать — звонок даём, его длину
  // держит сторож агента по sessionTtlSec.
  const metered = isDbConfigured()
  if (metered) {
    try {
      await closeStaleSessions(profileId)
      if (await hasOpenAssistantCall(profileId)) return json(409, { configured: true, error: 'call_busy' })
      const { todaySeconds } = await getUsage(profileId)
      // Разговор короче минуты бессмыслен: остаток меньше — честнее «кончилось».
      if (limitSec - todaySeconds < 60) return json(403, { configured: true, limited: true, error: 'daily_limit', limitSec })
      ttl = limitSec - todaySeconds
    } catch (err) {
      console.error('[assistant.call] usage check failed', err?.message || err)
      return json(503, { configured: true, error: 'usage_unavailable' })
    }
  }

  const room = `jts-luna-${rand()}-${Date.now()}`
  const identity = `student-${userId}-${rand()}`
  const name = String(auth.user.name || '').trim().slice(0, 40)
  const metadata = JSON.stringify({
    mode: 'assistant',
    tutor: 'gentle',
    lang,
    sessionTtlSec: ttl,
    ...(name ? { userName: name } : {}),
  })

  // Строку сессии — ДО токена: без неё звонок не тарифицировался бы вовсе
  // (armSession обновлять нечего), а чат не узнал бы живой звонок.
  if (metered) {
    try {
      await openSession(room, profileId)
    } catch (err) {
      console.error('[assistant.call] openSession failed', err?.message || err)
      return json(503, { configured: true, error: 'usage_unavailable' })
    }
  }

  const at = new AccessToken(apiKey, apiSecret, { identity, ttl, metadata })
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true })
  const token = await at.toJwt()

  return json(200, { configured: true, token, url, room, identity, ttl, limitSec })
}
