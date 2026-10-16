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

import { AccessToken } from 'livekit-server-sdk'
import { bearerFromRequest, verifyTokenStatus } from '@/lib/auth-server.js'
import { closeStaleSessions, getUsage, isDbConfigured, openSession } from '@/lib/usage.js'
import { ASSISTANT_CALL_DAILY_SEC, assistantCallProfileId } from '@/lib/assistant/callUsage.js'

export const runtime = 'nodejs'

// Env из Windows-пайпа приходит с BOM — режем, как и везде на сервере.
const env = (name) => (process.env[name] || '').replace(/^﻿/, '').trim()

const LANGS = new Set(['ru', 'kz', 'en'])
const json = (status, body) => Response.json(body, { status })
const rand = () => Math.random().toString(36).slice(2, 10)

export async function POST(request) {
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
  // Без базы лимит не посчитать — звонок всё равно даём (как у тьютора), но
  // не дольше дневного лимита: его держит сторож агента по sessionTtlSec.
  if (isDbConfigured()) {
    try {
      await closeStaleSessions(profileId)
      const { todaySeconds } = await getUsage(profileId)
      // Разговор короче минуты бессмыслен: остаток меньше — честнее «кончилось».
      if (limitSec - todaySeconds < 60) return json(403, { configured: true, limited: true, error: 'daily_limit', limitSec })
      ttl = limitSec - todaySeconds
    } catch (err) {
      console.error('[assistant.call] usage check failed', err?.message || err)
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
  const at = new AccessToken(apiKey, apiSecret, { identity, ttl, metadata })
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true })
  const token = await at.toJwt()

  if (isDbConfigured()) {
    try {
      await openSession(room, profileId)
    } catch (err) {
      console.error('[assistant.call] openSession failed', err?.message || err)
    }
  }

  return json(200, { configured: true, token, url, room, identity, ttl, limitSec })
}
