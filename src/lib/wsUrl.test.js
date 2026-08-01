import { describe, it, expect, afterEach, vi } from 'vitest'
import { wsBase } from './wsUrl.js'

afterEach(() => { vi.unstubAllEnvs() })

describe('wsBase', () => {
  it('converts https api to wss and appends /ws', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://dev-server.justtostudy.kz')
    expect(wsBase()).toBe('wss://dev-server.justtostudy.kz/ws')
  })
  it('converts http api to ws', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8080')
    expect(wsBase()).toBe('ws://localhost:8080/ws')
  })
  it('strips a trailing slash before /ws', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://x.kz/')
    expect(wsBase()).toBe('wss://x.kz/ws')
  })
  it('falls back to the dev server default when env is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '')
    expect(wsBase()).toBe('wss://dev-server.justtostudy.kz/ws')
  })
})
