// Начало прогона теста на определение уровня.
//
// Уровень профиль определяет один раз — при регистрации. Законченный прогон
// закрывает тему: новый не заводится, и роут отвечает 409 с уже определённым
// уровнем. Незаконченный продолжается (закрыл вкладку на середине — вернулся).
//
// Прогон нужен, чтобы проверка ответов не была оракулом (см.
// lib/placementSessionLogic.js) и чтобы итоговый уровень считался по тому, что
// помнит сервер, а не по журналу от клиента. Без базы (dev, preview) токен не
// выдаётся: тест продолжает работать, но без привязки — это осознанная мягкая
// деградация, как у остальных серверных частей приложения.

import { latestPlacementSession, openPlacementSession } from '@/lib/db/placementSession.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { isDbConfigured } from '@/lib/db/sql.js'

export const runtime = 'nodejs'

const VARIANTS = ['express', 'full']

/** Проверка без побочных эффектов: определял ли профиль уровень раньше. */
export async function GET(request) {
  if (!isDbConfigured()) return Response.json({ configured: false, completed: false })

  const url = new URL(request.url)
  let profileId = null
  try {
    const resolved = await resolveProfileId(request, url.searchParams.get('deviceId'))
    if (!('error' in resolved)) profileId = resolved.id
  } catch {
    /* не опознали — считаем, что тест ещё не проходили */
  }

  try {
    const run = await latestPlacementSession(profileId)
    return Response.json({
      configured: true,
      completed: Boolean(run?.finished),
      level: run?.finished ? run.level : null,
    })
  } catch (err) {
    console.error('[placement.session] lookup failed', err)
    return Response.json({ configured: true, completed: false })
  }
}

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — прогон всё равно можно завести */
  }

  if (!isDbConfigured()) {
    return Response.json({ configured: false, token: null })
  }

  const variant = VARIANTS.includes(body.variant) ? body.variant : null
  // Прогон опознаём мягко: аноним тоже проходит тест, ему просто нет профиля.
  let profileId = null
  try {
    const resolved = await resolveProfileId(request, body.deviceId)
    if (!('error' in resolved)) profileId = resolved.id
  } catch {
    /* не опознали — прогон всё равно заводим */
  }

  try {
    const run = await openPlacementSession({ profileId, variant })
    if (run.blocked) {
      return Response.json(
        { configured: true, token: null, error: 'already_completed', level: run.level },
        { status: 409 },
      )
    }
    return Response.json({ configured: true, token: run.token, resumed: Boolean(run.resumed) })
  } catch (err) {
    console.error('[placement.session] failed', err)
    return Response.json({ configured: true, token: null, error: 'Session create failed.' }, { status: 500 })
  }
}
