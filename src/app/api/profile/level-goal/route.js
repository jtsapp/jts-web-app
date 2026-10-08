// Цель уровня на «Главной»: GET → { goal }, PUT { target, from } → { goal }.
// PUT { target: null } снимает цель.
//
// Только для залогиненных: «Главная» — кабинет, у анонима её нет. Личность —
// resolveProfileId по токену, не из тела. Без базы GET честно отдаёт
// configured: false и goal: null — клиент тогда держится своего кэша, а не
// стирает выбранную цель пустым ответом.

import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { loadLevelGoal, saveLevelGoal } from '@/lib/db/levelGoal.js'
import { sanitizeGoal } from '@/lib/levelProgress.js'

export const runtime = 'nodejs'

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return Response.json({ configured: false, goal: null })

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    return Response.json({ configured: true, goal: await loadLevelGoal(resolved.id) })
  } catch (err) {
    console.error('[profile.level-goal] read failed', err)
    return Response.json({ configured: true, error: 'level goal read failed.' }, { status: 500 })
  }
}

export async function PUT(request) {
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

  // Явный null — снять цель. Всё остальное обязано пройти ту же проверку, по
  // которой экран рисует дорожку: записанная «цель A1 с A2» показала бы пустоту.
  const clearing = 'target' in body && body.target === null
  const goal = clearing ? null : sanitizeGoal(body)
  if (!clearing && !goal) {
    return Response.json({ configured: true, error: 'Invalid goal.' }, { status: 400 })
  }

  try {
    return Response.json({ configured: true, goal: await saveLevelGoal(resolved.id, goal) })
  } catch (err) {
    console.error('[profile.level-goal] write failed', err)
    return Response.json({ configured: true, error: 'level goal write failed.' }, { status: 500 })
  }
}
