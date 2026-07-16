// Общий обработчик для «журнальных» роутов памяти: facts, mistakes, topics,
// resolved. У felix это четыре почти дословные копии друг друга; здесь они
// сведены к одной фабрике — различаются только функцией записи, лимитом и
// текстом ошибки.
//
// Контракт (его использует голосовой агент): POST {deviceId?, items: string[]}.
// Личность решает resolveProfileId: Bearer → user-<id>, иначе deviceId.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export function itemsRoute({ append, cap, label }) {
  return async function POST(request) {
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
      /* пустое тело — ниже отдадим written: 0 */
    }

    const resolved = await resolveProfileId(request, body.deviceId)
    if ('error' in resolved) return resolved.error

    const items = Array.isArray(body.items)
      ? body.items.filter((x) => typeof x === 'string')
      : []
    if (items.length === 0) return Response.json({ configured: true, ok: true, written: 0 })

    try {
      await append(resolved.id, items.slice(0, cap))
      return Response.json({ configured: true, ok: true })
    } catch (err) {
      console.error(`[profile.${label}] failed`, err)
      return Response.json(
        { configured: true, error: `${label} append failed.` },
        { status: 500 },
      )
    }
  }
}
