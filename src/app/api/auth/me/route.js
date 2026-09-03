// Проверка сохранённого access-токена при загрузке страницы.
//
// Клиент POST-ит токен из localStorage, мы отдаём его бэкенду (`GET /user/me`)
// со своего сервера — браузеру не нужен CORS на dev-server, а мы заодно
// возвращаем профиль, которым App восстанавливает сессию (имя, уровень, id).
//
// 401 — токен реально отвергнут (клиент может чистить / пробовать refresh).
// 503 — бэкенд недоступен (клиент НЕ должен разлогинивать).

import { verifyTokenStatus } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

export async function POST(request) {
  let token = null
  try {
    const body = await request.json()
    if (typeof body?.token === 'string' && body.token.length > 0) token = body.token
  } catch {
    /* тело не JSON — ниже вернём 400 */
  }

  if (!token) return Response.json({ error: 'Missing access token.' }, { status: 400 })

  const result = await verifyTokenStatus(token)
  if (result.status === 'unavailable') {
    return Response.json({ error: 'Backend unavailable.' }, { status: 503 })
  }
  if (result.status !== 'ok' || !result.user) {
    return Response.json({ error: 'Token rejected by backend.' }, { status: 401 })
  }

  return Response.json({ user: result.user })
}
