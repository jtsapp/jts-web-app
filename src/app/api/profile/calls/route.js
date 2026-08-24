// История голосовых звонков.
//   POST — агент пишет звонок в конце сессии (служебный X-Internal-Key +
//     deviceId=user-<id>, тот же путь авторизации, что у log_mistake). Сразу
//     после ответа в after() крутится выжимка: разбор для ученика + факты в
//     долгую память (src/lib/callSummary/).
//   GET  — клиент читает список+транскрипт для текущего аккаунта/устройства.
//     Экран отчёта зовёт то же самое с ?limit=1, пока ждёт запись агента.
// Личность в обоих случаях решает resolveProfileId: Bearer → user-<id>, иначе
// deviceId (для user-* нужен служебный ключ).

import { after } from 'next/server'

import { insertCall, listCalls } from '@/lib/db/calls.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { isTrustedInternalCaller, resolveProfileId } from '@/lib/auth-server.js'
import { summarizeCall, sweepStaleSummaries } from '@/lib/callSummary/index.js'

export const runtime = 'nodejs'

const MAX_LIMIT = 50

export async function POST(request) {
  if (!isDbConfigured()) {
    return Response.json(
      { configured: false, error: 'DATABASE_URL is not set.' },
      { status: 503 },
    )
  }

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — insertCall тихо ничего не запишет */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  // Считаем ДО ответа: после него request трогать уже нельзя.
  const trusted = isTrustedInternalCaller(request)

  let callId = null
  try {
    callId = await insertCall(resolved.id, body)
  } catch (err) {
    console.error('[profile.calls] insert failed', err)
    return Response.json(
      { configured: true, error: 'call insert failed.' },
      { status: 500 },
    )
  }

  // Агент ждёт этот ответ в shutdown-колбэке с timeout=4.0 и глотает исключения
  // — выжимку он ждать не должен, иначе оборвёт соединение по таймауту, не зная,
  // записался ли звонок.
  after(async () => {
    await summarizeCall({
      callId,
      trusted,
      call: {
        deviceId: resolved.id,
        transcript: body.transcript,
        lang: body.lang,
        mode: body.mode,
        level: body.level,
      },
    })
    // Попутно добираем один звонок, чья выжимка не пережила рестарт контейнера.
    await sweepStaleSummaries()
  })

  return Response.json({ configured: true, ok: true, callId })
}

export async function GET(request) {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, calls: [] })
  }

  const params = new URL(request.url).searchParams
  const resolved = await resolveProfileId(request, params.get('deviceId'))
  if ('error' in resolved) return resolved.error

  const asked = Number.parseInt(params.get('limit') ?? '', 10)
  const limit = Number.isFinite(asked) ? Math.max(1, Math.min(MAX_LIMIT, asked)) : MAX_LIMIT

  try {
    const calls = await listCalls(resolved.id, limit)
    return Response.json({ configured: true, calls })
  } catch (err) {
    console.error('[profile.calls] list failed', err)
    // Мягкий отказ: история — не критичный экран, пустой список лучше 500.
    return Response.json({ configured: true, calls: [] })
  }
}
