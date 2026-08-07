// Read the JWT payload client-side (no verification — server enforces auth). Used only
// to pick the UI variant by role; never for authorization decisions.
function payloadOf(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    // base64url → base64 и добивка padding: atob к его отсутствию придирчив и
    // на длине % 4 == 2..3 бросает, теряя роль вместе с payload.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json =
      typeof atob === 'function'
        ? // atob отдаёт байты по символу — payload с не-ASCII (имя, телефон)
          // иначе разбирается в мусор и JSON.parse падает.
          decodeURIComponent(
            atob(padded)
              .split('')
              .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
              .join('')
          )
        : Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function roleFromToken(token) {
  return payloadOf(token)?.role ?? null
}

/** Преподаватель ли это. Отдельной функцией — проверка встречается в разметке. */
export function isTeacher(token) {
  return String(roleFromToken(token) ?? '').toUpperCase() === 'TEACHER'
}

export function userIdFromToken(token) {
  const id = payloadOf(token)?.userId
  if (typeof id === 'number') return id
  return id != null ? Number(id) || null : null
}
