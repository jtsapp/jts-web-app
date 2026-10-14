// Уровень CEFR → Neon-профиль этого приложения (его читает голосовой тьютор). Зовут двое: голосовой агент tool-ом
// report_placement_level после устного собеседования (клиент финализирует уровень сам из LiveKit, так что это
// подстраховка) и клиентская запись уровня (lib/levelSave.js → lib/tutorPrefs.js) — тест уровня v16, уровень из
// бэкенда при входе.
//
// Порт felix app/api/placement/complete/route.ts.
//
// До 14.10.2026 роут ещё и пересчитывал уровень по прогону прежнего теста (журнал ответов, проверка по ключам) и
// докладывал бэкенду снимок θ/SE. Прогоны заводил только экран прежнего теста — он удалён вместе с этой веткой.
// Тест v16 хранит свой результат сам (/api/placement/attempts) и пишет уровень только в пустой аккаунт.

import { isDbConfigured } from '@/lib/db/sql.js'
import { upsertProfile } from '@/lib/db/profile.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { profileLevel } from '@/lib/placement.js'

export const runtime = 'nodejs'

// A0 бэкенд знает давно (enum LanguageLevel): без него уровень новичка молча отбраковывался четырёхсоткой.
const VALID_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  const measured = typeof body.level === 'string' && VALID_LEVELS.includes(body.level) ? body.level : null
  if (!measured) {
    return Response.json({ configured: isDbConfigured(), error: 'Invalid or missing level.' }, { status: 400 })
  }
  const level = profileLevel(measured)

  if (!isDbConfigured()) {
    // Сохранить некуда, но уровень клиенту нужен — тот же, что записали бы.
    return Response.json({ configured: false, level, measured, error: 'DATABASE_URL is not set.' }, { status: 200 })
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  try {
    await upsertProfile(resolved.id, { level })
    return Response.json({ configured: true, ok: true, level, measured })
  } catch (err) {
    console.error('[placement.complete] failed', err)
    return Response.json({ configured: true, error: 'Placement persist failed.' }, { status: 500 })
  }
}
