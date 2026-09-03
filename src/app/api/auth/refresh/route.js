// Обновление access-токена через refresh (прокси на бэкенд /auth/refresh).
// Клиент зовёт при 401 на /api/auth/me, чтобы сессия переживала истечение access.

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
  let refreshToken = null
  try {
    const body = await request.json()
    if (typeof body?.refreshToken === 'string' && body.refreshToken.length > 0) {
      refreshToken = body.refreshToken
    }
  } catch {
    /* empty */
  }

  if (!refreshToken) {
    return Response.json({ error: 'Missing refresh token.' }, { status: 400 })
  }

  let res
  try {
    const url = `${BACKEND_URL}/auth/refresh?refreshToken=${encodeURIComponent(refreshToken)}`
    res = await fetch(url, { method: 'POST', cache: 'no-store' })
  } catch (err) {
    console.error('[auth.refresh] backend unreachable', err?.message || err)
    return Response.json({ error: 'Backend unavailable.' }, { status: 503 })
  }

  if (res.status === 401 || res.status === 403 || res.status === 400) {
    return Response.json({ error: 'Refresh rejected.' }, { status: 401 })
  }
  if (!res.ok) {
    console.error('[auth.refresh] backend status', res.status)
    return Response.json({ error: 'Backend error.' }, { status: 503 })
  }

  const data = await res.json().catch(() => null)
  if (!data?.accessToken) {
    return Response.json({ error: 'Invalid refresh response.' }, { status: 502 })
  }

  return Response.json({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || refreshToken,
    userId: data.userId ?? null,
    name: data.name ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    role: data.role ?? null,
  })
}
