import { describe, it, expect } from 'vitest'
import { roleFromToken, userIdFromToken } from './jwt.js'

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

// helper: build a JWT with userId claim
const tokenWithUserId = (userId) => {
  const payload = Buffer.from(JSON.stringify({ userId })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${payload}.s`
}

describe('userIdFromToken', () => {
  it('extracts the userId claim', () => {
    expect(userIdFromToken(tokenWithUserId(116))).toBe(116)
    expect(userIdFromToken(tokenWithUserId(1))).toBe(1)
  })
  it('coerces string userId to number', () => {
    const payload = Buffer.from(JSON.stringify({ userId: '42' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(userIdFromToken(`h.${payload}.s`)).toBe(42)
  })
  it('returns null for missing/garbage input', () => {
    expect(userIdFromToken(null)).toBeNull()
    expect(userIdFromToken('')).toBeNull()
    expect(userIdFromToken('not-a-jwt')).toBeNull()
    expect(userIdFromToken('a.b')).toBe(null) // b is not valid base64 json → null
  })
  it('returns null when userId claim is missing', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'STUDENT' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(userIdFromToken(`h.${payload}.s`)).toBeNull()
  })
})
