import { describe, it, expect, vi, afterEach } from 'vitest'
import { geProfileShape, getGeProfile } from '../api.js'

afterEach(() => vi.unstubAllGlobals())

describe('geProfileShape', () => {
  it('профиль — только с булевым onboarded', () => {
    expect(geProfileShape({})).toBe(null)
    expect(geProfileShape(null)).toBe(null)
    expect(geProfileShape({ onboarded: false })).toEqual({ onboarded: false })
  })
})

describe('getGeProfile', () => {
  it('404 — null, а не исключение', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    expect(await getGeProfile('tok')).toBe(null)
  })
  it('без токена в сеть не ходит', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    expect(await getGeProfile(null)).toBe(null)
    expect(f).not.toHaveBeenCalled()
  })
})
