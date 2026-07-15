// Server-side token verification + identity resolution for the IELTS routes.
// Verification is delegated to the backend (`GET /user/me`) so this app never
// needs the JWT signing secret.
//
// Ported from felix lib/auth-server.ts, trimmed to resolveProfileId and its
// dependencies (the registration/proxy helpers live in src/api.js here).

const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://dev-server.justtostudy.kz'
).replace(/\/+$/, '')

// Profile ids in the `user-<id>` namespace are reserved for authenticated
// learners. They are guessable (sequential user ids), so they must never be
// accessible by an anonymous caller passing a crafted deviceId — only a valid
// access token can resolve to one.
const RESERVED_ID_RE = /^user-/i
const DEVICE_ID_RE = /^[A-Za-z0-9_-]{6,64}$/

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
    if (!res.ok) return null
    const user = await res.json()
    if (user?.id == null) return null
    return {
      userId: Number(user.id),
      name: user.name ?? null,
      phone: user.phone ?? null,
      role: user.role ?? null,
    }
  } catch {
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
 * Returns { id } on success, or { error: Response } the caller should return.
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
    return { id: profileIdForUser(user.userId) }
  }

  if (!isValidDeviceId(clientDeviceId)) {
    return {
      error: Response.json({ configured: true, error: 'Invalid deviceId.' }, { status: 400 }),
    }
  }
  if (RESERVED_ID_RE.test(clientDeviceId)) {
    return {
      error: Response.json(
        { configured: true, error: 'This profile requires authentication.' },
        { status: 401 },
      ),
    }
  }
  return { id: clientDeviceId }
}
