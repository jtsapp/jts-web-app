// «Память Луны» в Профиле (ТЗ v2.0, 8.1): GET → { configured, facts: [{ id, fact, createdAt, expiresAt }] },
// DELETE ?id=<id> → { ok }. Факты пишет только чат Луны (метка [[REMEMBER …]], lib/assistant/facts.js); здесь ученик
// их видит и удаляет любой — без вопросов и без «удалить всё навсегда»: факт живёт 30 дней и так.
//
// Только для залогиненных: Луна гостю недоступна. Личность — resolveProfileId по токену, не из тела, поэтому удалить
// можно только свой факт. Без базы GET отдаёт configured: false — блок в Профиле тогда не рисуется.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { deleteFact, loadFacts } from '@/lib/db/assistantFacts.js'
import { dropStudentContext } from '@/lib/assistant/studentContext.js'

export const runtime = 'nodejs'

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false, facts: [] })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  return Response.json({ configured: true, facts: await loadFacts(resolved.id) })
}

export async function DELETE(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error
  const id = new URL(request.url).searchParams.get('id')
  if (!/^\d{1,18}$/.test(String(id || ''))) return Response.json({ configured: true, error: 'Invalid id.' }, { status: 400 })
  const ok = await deleteFact(resolved.id, id)
  // Луна не должна вспомнить удалённое из кэша профиля (до 15 минут).
  if (ok) dropStudentContext(resolved.id.replace(/^user-/, ''))
  return Response.json({ configured: true, ok }, { status: ok ? 200 : 404 })
}
