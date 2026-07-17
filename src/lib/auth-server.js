// Server-side token verification + identity resolution for the IELTS routes.
// Verification is delegated to the backend (`GET /user/me`) so this app never
// needs the JWT signing secret.
//
// Ported from felix lib/auth-server.ts, trimmed to resolveProfileId and its
// dependencies (the registration/proxy helpers live in src/api.js here).

import { timingSafeEqual } from 'node:crypto'

// BOM/пробелы из env вырезаем: значение, вставленное через Windows-пайп,
// приходит с U+FEFF (BOM) в начале — fetch падает «Invalid URL», и каждый Bearer
// превращался в 401 «сессия истекла» на всём проде (поймано 17.07.2026).
const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://dev-server.justtostudy.kz'
)
  .replace(/^\uFEFF/, '')
  .trim()
  .replace(/\/+$/, '')

// Profile ids in the `user-<id>` namespace are reserved for authenticated
// learners. They are guessable (sequential user ids), so they must never be
// accessible by an anonymous caller passing a crafted deviceId — only a valid
// access token can resolve to one.
const RESERVED_ID_RE = /^user-/i
const DEVICE_ID_RE = /^[A-Za-z0-9_-]{6,64}$/

/**
 * Доверенный сервер-к-серверу вызов (голосовой агент на воркере LiveKit).
 * У агента нет токена ученика: он получает profileId в metadata комнаты, которую
 * подписал наш же /api/livekit/token. Ключ живёт только в server-env обоих
 * процессов и в браузер не попадает.
 *
 * Не настроен INTERNAL_API_KEY → канал закрыт. Пустая переменная НЕ должна
 * означать «пускаем всех» — иначе забытый env открывает запись в любой аккаунт.
 */
function isTrustedInternalCaller(request) {
  const expected = process.env.INTERNAL_API_KEY
  if (!expected) return false
  const got = request.headers.get('x-internal-key')
  if (typeof got !== 'string') return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  // timingSafeEqual падает на разной длине — сравниваем её отдельно, а сам
  // ключ всегда постоянным временем.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function isValidDeviceId(id) {
  return typeof id === 'string' && DEVICE_ID_RE.test(id)
}

export function bearerFromRequest(request) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

export async function verifyToken(token) {
  if (!token) return null
  try {
    const res = await fetch(`${BACKEND_URL}/user/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      // Различаем «бэкенд отверг токен» и «бэкенд недоступен» — иначе любая
      // проблема конфига/сети выглядит как протухшая сессия и разлогинивает.
      console.error('[auth] backend rejected token:', res.status, BACKEND_URL)
      return null
    }
    const user = await res.json()
    if (user?.id == null) return null
    return {
      userId: Number(user.id),
      name: user.name ?? null,
      phone: user.phone ?? null,
      role: user.role ?? null,
      // Для восстановления сессии на клиенте: /api/auth/me отдаёт это в App,
      // чтобы уровень не сбрасывался на A1 после перезагрузки.
      languageLevel: user.languageLevel ?? null,
    }
  } catch (err) {
    console.error(
      '[auth] backend unreachable:',
      err?.cause?.code || err?.cause?.message || err?.message || err,
      BACKEND_URL,
    )
    return null
  }
}

export function profileIdForUser(userId) {
  return `user-${userId}`
}

/**
 * Resolves the profile id a request is allowed to act on:
 * - With a valid Bearer token → the authenticated `user-<id>` (the client's
 *   deviceId is ignored, so a learner can't read/write someone else's data).
 * - With an invalid/expired token → 401.
 * - With no token → the anonymous deviceId, UNLESS it intrudes on the reserved
 *   `user-*` namespace (then 401: that data requires authentication).
 *
 * Returns { id, name } on success, or { error: Response } the caller should
 * return. `name` is the backend's display name for an authenticated learner and
 * null for everyone else — verifyToken already fetches it, so callers that want
 * it (the LiveKit token route, for the voice scenarios) cost no extra request.
 * It is derived from the token, never from the client body: a caller cannot
 * claim someone else's name.
 */
export async function resolveProfileId(request, clientDeviceId) {
  const token = bearerFromRequest(request)

  if (token) {
    const user = await verifyToken(token)
    if (!user) {
      return {
        error: Response.json(
          { configured: true, error: 'Invalid or expired access token.' },
          { status: 401 },
        ),
      }
    }
    return { id: profileIdForUser(user.userId), name: user.name ?? null }
  }

  if (!isValidDeviceId(clientDeviceId)) {
    return {
      error: Response.json({ configured: true, error: 'Invalid deviceId.' }, { status: 400 }),
    }
  }
  if (RESERVED_ID_RE.test(clientDeviceId)) {
    // Единственное исключение: наш же голосовой агент с сервисным ключом. Он
    // пишет память ученика от его имени, своего токена не имея.
    if (isTrustedInternalCaller(request)) return { id: clientDeviceId, name: null }
    return {
      error: Response.json(
        { configured: true, error: 'This profile requires authentication.' },
        { status: 401 },
      ),
    }
  }
  return { id: clientDeviceId, name: null }
}
