// Выход ученика: закрыть сессию на бэкенде, чтобы записалось время выхода.
// Осечка бэкенда выход в браузере не отменяет — клиент стирает токен в любом случае.

export const runtime = 'nodejs'

const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://dev-server.justtostudy.kz'
)
  .replace(/^\uFEFF/, '')
  .trim()
  .replace(/\/+$/, '')

export async function POST(request) {
  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return Response.json({ ok: false }, { status: 400 })
  }
  try {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: authorization },
    })
  } catch {
    /* сеть пропала — локальный выход всё равно состоится */
  }
  return Response.json({ ok: true })
}
