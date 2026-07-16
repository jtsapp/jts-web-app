// Словарь ученика. Тело отличается от журнальных роутов: items — объекты
// {word, hint}, а не строки. Порт felix app/api/profile/vocab/route.ts.

import { isDbConfigured } from '@/lib/db/sql.js'
import { appendVocab } from '@/lib/db/profile.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже written: 0 */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  const items = Array.isArray(body.items)
    ? body.items
        .map((x) => {
          if (!x || typeof x !== 'object') return null
          if (typeof x.word !== 'string') return null
          return { word: x.word, hint: typeof x.hint === 'string' ? x.hint : null }
        })
        .filter(Boolean)
    : []
  if (items.length === 0) return Response.json({ configured: true, ok: true, written: 0 })

  try {
    await appendVocab(resolved.id, items.slice(0, 50))
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.vocab] failed', err)
    return Response.json({ configured: true, error: 'Vocab append failed.' }, { status: 500 })
  }
}
