// Read the JWT payload client-side (no verification — server enforces auth). Used only
// to pick the UI variant by role; never for authorization decisions.
export function roleFromToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    const payload = JSON.parse(json)
    return payload.role ?? null
  } catch {
    return null
  }
}
