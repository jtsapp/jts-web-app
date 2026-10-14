// Результат теста уровня v16: POST { envelope } → сохранить, GET → последний конверт ({ envelope | null }).
//
// Только для вошедших: тест открывается из кабинета, и отчёт принадлежит аккаунту. Личность — resolveProfileId по
// токену, не из тела. Конверт проверяет общий src/placement/envelope.js; балл мы не пересчитываем (см. спеку) — и
// уровень аккаунта отсюда не пишется: его ставит клиент прежним путём (persistPlacementLevel), только в пустой
// аккаунт.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { loadLatestAttempt, saveAttempt } from '@/lib/db/placementV16.js'
import { MAX_ENVELOPE_BYTES, validateEnvelope } from '@/placement/envelope.js'

export const runtime = 'nodejs'

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false, envelope: null })

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    return Response.json({ configured: true, envelope: await loadLatestAttempt(resolved.id) })
  } catch (err) {
    console.error('[placement.attempts] read failed', err)
    return Response.json({ configured: true, error: 'read failed' }, { status: 500 })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false, saved: false }, { status: 503 })

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  const text = await request.text().catch(() => '')
  if (text.length > MAX_ENVELOPE_BYTES + 1024) return Response.json({ error: 'too_large' }, { status: 413 })
  let body = null
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  const checked = validateEnvelope(body?.envelope)
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 })

  try {
    const summary = await saveAttempt(resolved.id, checked.envelope)
    return Response.json({ configured: true, saved: true, attemptId: summary?.attemptId ?? null })
  } catch (err) {
    console.error('[placement.attempts] write failed', err)
    return Response.json({ configured: true, error: 'write failed' }, { status: 500 })
  }
}
