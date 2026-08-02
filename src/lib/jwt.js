// Read the JWT payload client-side (no verification — server enforces auth). Used only
// to pick the UI variant by role; never for authorization decisions.
function payloadOf(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function roleFromToken(token) {
  return payloadOf(token)?.role ?? null
}

export function userIdFromToken(token) {
  const id = payloadOf(token)?.userId
  if (typeof id === 'number') return id
  return id != null ? Number(id) || null : null
}
