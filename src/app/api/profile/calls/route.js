// История голосовых звонков.
//   POST — агент пишет звонок в конце сессии (служебный X-Internal-Key +
//     deviceId=user-<id>, тот же путь авторизации, что у log_mistake).
//   GET  — клиент читает список+транскрипт для текущего аккаунта/устройства.
// Личность в обоих случаях решает resolveProfileId: Bearer → user-<id>, иначе
// deviceId (для user-* нужен служебный ключ).

import { insertCall, listCalls } from '@/lib/db/calls.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

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

  try {
    await insertCall(resolved.id, body)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.calls] insert failed', err)
    return Response.json(
      { configured: true, error: 'call insert failed.' },
      { status: 500 },
    )
  }
}

export async function GET(request) {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, calls: [] })
  }

  const params = new URL(request.url).searchParams
  const resolved = await resolveProfileId(request, params.get('deviceId'))
  if ('error' in resolved) return resolved.error

  try {
    const calls = await listCalls(resolved.id, 50)
    return Response.json({ configured: true, calls })
  } catch (err) {
    console.error('[profile.calls] list failed', err)
    // Мягкий отказ: история — не критичный экран, пустой список лучше 500.
    return Response.json({ configured: true, calls: [] })
  }
}
