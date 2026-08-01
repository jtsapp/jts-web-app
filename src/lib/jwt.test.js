import { describe, it, expect } from 'vitest'
import { roleFromToken } from './jwt.js'

// header.payload.signature where payload = base64url({"role":"STUDENT"})
const tokenWithRole = (role) => {
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${payload}.s`
}

describe('roleFromToken', () => {
  it('extracts the role claim', () => {
    expect(roleFromToken(tokenWithRole('STUDENT'))).toBe('STUDENT')
    expect(roleFromToken(tokenWithRole('TEACHER'))).toBe('TEACHER')
  })
  it('returns null for missing/garbage input', () => {
    expect(roleFromToken(null)).toBeNull()
    expect(roleFromToken('')).toBeNull()
    expect(roleFromToken('not-a-jwt')).toBeNull()
    expect(roleFromToken('a.b')).toBe(null) // b is not valid base64 json → null
  })
})
