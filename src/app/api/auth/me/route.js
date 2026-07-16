// Проверка сохранённого access-токена при загрузке страницы.
//
// Клиент POST-ит токен из localStorage, мы отдаём его бэкенду (`GET /user/me`)
// со своего сервера — браузеру не нужен CORS на dev-server, а мы заодно
// возвращаем профиль, которым App восстанавливает сессию (имя, уровень, id).
//
// Порт felix app/api/auth/me/route.ts.

import { verifyToken } from '@/lib/auth-server.js'

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

  const user = await verifyToken(token)
  // Просрочен или отозван — клиент выкинет токен и покажет welcome.
  if (!user) return Response.json({ error: 'Token rejected by backend.' }, { status: 401 })

  return Response.json({ user })
}
