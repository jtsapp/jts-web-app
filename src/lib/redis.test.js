import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ioredis подменяем: настоящий клиент полез бы в сеть.
const ctor = vi.hoisted(() => vi.fn())
vi.mock('ioredis', () => ({
  default: class {
    constructor(...args) {
      ctor(...args)
      this.on = vi.fn()
    }
  },
}))

let getRedis

beforeEach(async () => {
  ctor.mockClear()
  vi.resetModules()
  ;({ getRedis } = await import('./redis.js'))
})

afterEach(() => vi.unstubAllEnvs())

describe('getRedis', () => {
  it('без REDIS_URL — null, клиента не создаём', () => {
    vi.stubEnv('REDIS_URL', '')
    expect(getRedis()).toBeNull()
    expect(ctor).not.toHaveBeenCalled()
  })

  it('BOM и пробелы из env срезаны, команды не копятся в офлайне', () => {
    vi.stubEnv('REDIS_URL', '\uFEFF redis://redis:6379 ')
    const r = getRedis()
    expect(r).not.toBeNull()
    const [url, opts] = ctor.mock.calls[0]
    expect(url).toBe('redis://redis:6379')
    expect(opts.enableOfflineQueue).toBe(false)
    expect(r.on).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('один клиент на процесс', () => {
    vi.stubEnv('REDIS_URL', 'redis://redis:6379')
    expect(getRedis()).toBe(getRedis())
    expect(ctor).toHaveBeenCalledTimes(1)
  })
})
