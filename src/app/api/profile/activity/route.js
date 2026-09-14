// Пачка активного времени из тренажёра (хук src/lib/useTimeOnTask.js):
// POST { module, seconds } → прибавка к сегодняшней строке activity_time.
//
// Только для залогиненных: время нужно, чтобы сравнивать с планом Roadmap, а
// плана у анонима нет. Заодно не нужен перенос анонимных минут в аккаунт при
// входе — их просто нет. Аутентификация первична (401 без Bearer ещё до
// проверки БД), личность — resolveProfileId по токену, не из тела.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { addActivitySeconds, clampBatchSeconds, isClientTrackedModule } from '@/lib/db/activityTime.js'

export const runtime = 'nodejs'

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  // Белый список, а не «любой модуль экосистемы»: ai_tutor и shadowing считает
  // сервер по своим таблицам, и клиентская запись в них была бы двойным счётом.
  const moduleKey = typeof body.module === 'string' ? body.module : ''
  if (!isClientTrackedModule(moduleKey)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }

  const seconds = clampBatchSeconds(body.seconds)
  if (!seconds) return Response.json({ configured: true, recorded: 0 })

  try {
    const today = await addActivitySeconds(resolved.id, moduleKey, seconds)
    return Response.json({ configured: true, recorded: seconds, todaySeconds: today })
  } catch (err) {
    console.error('[profile.activity] write failed', err)
    return Response.json({ configured: true, error: 'activity write failed.' }, { status: 500 })
  }
}
