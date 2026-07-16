// Перенос анонимного прогресса в аккаунт. Зовётся клиентом один раз — сразу
// после входа, пока device-id ещё в localStorage.
//
// Требует Bearer: слить можно только в СВОЙ аккаунт. Сервисный ключ здесь
// намеренно не принимается — у агента нет причин переносить чужой прогресс,
// а ошибка в нём стоила бы дорого.

import { isDbConfigured } from '@/lib/db/sql.js'
import { mergeDeviceIntoAccount } from '@/lib/db/merge.js'
import {
  bearerFromRequest,
  verifyToken,
  profileIdForUser,
  isValidDeviceId,
} from '@/lib/auth-server.js'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }

  const token = bearerFromRequest(request)
  if (!token) {
    return Response.json({ configured: true, error: 'Authentication required.' }, { status: 401 })
  }
  const user = await verifyToken(token)
  if (!user) {
    return Response.json(
      { configured: true, error: 'Invalid or expired access token.' },
      { status: 401 },
    )
  }

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  if (!isValidDeviceId(body.deviceId)) {
    return Response.json({ configured: true, error: 'Invalid deviceId.' }, { status: 400 })
  }

  try {
    const result = await mergeDeviceIntoAccount(body.deviceId, profileIdForUser(user.userId))
    // reason (account-not-empty / nothing-to-merge) — не ошибка: клиент просто
    // пишет это в консоль и живёт дальше.
    return Response.json({ configured: true, ...result })
  } catch (err) {
    console.error('[profile.merge] failed', err)
    return Response.json({ configured: true, error: 'Merge failed.' }, { status: 500 })
  }
}
