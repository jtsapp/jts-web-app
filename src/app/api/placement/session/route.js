// Начало прогона теста на определение уровня.
//
// Прогон нужен, чтобы проверка ответов не была оракулом (см.
// lib/placementSessionLogic.js) и чтобы итоговый уровень считался по тому, что
// помнит сервер, а не по журналу от клиента. Без базы (dev, preview) токен не
// выдаётся: тест продолжает работать, но без привязки — это осознанная мягкая
// деградация, как у остальных серверных частей приложения.

import { createPlacementSession } from '@/lib/db/placementSession.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { isDbConfigured } from '@/lib/db/sql.js'

export const runtime = 'nodejs'

const VARIANTS = ['express', 'full']

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
    const token = await createPlacementSession({ profileId, variant })
    return Response.json({ configured: true, token })
  } catch (err) {
    console.error('[placement.session] failed', err)
    return Response.json({ configured: true, token: null, error: 'Session create failed.' }, { status: 500 })
  }
}
