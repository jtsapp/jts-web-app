import { describe, it, expect, vi } from 'vitest'
import { resolveShortLink, shortLinkTarget } from './shortLink.js'

const ok = (body) => vi.fn(async () => ({ ok: true, json: async () => body }))

describe('resolveShortLink', () => {
  it('метки ссылки с бэкенда: ключ в заголовке, имя в адресе', async () => {
    const fetchImpl = ok({ utm: { utm_source: 'tiktok', utm_content: 'dana', junk: 'x' } })
    const utm = await resolveShortLink('dana', { backendUrl: 'http://be', key: 'k3y', fetchImpl })

    expect(utm).toEqual({ utm_source: 'tiktok', utm_content: 'dana' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://be/landing/short-links/dana/visit')
    expect(init.method).toBe('POST')
    expect(init.headers['X-Landing-Key']).toBe('k3y')
  })

  it('нет ключа, 404, пустые метки, сеть упала — null, без исключений', async () => {
    expect(await resolveShortLink('dana', { backendUrl: 'http://be', key: '', fetchImpl: ok({}) })).toBeNull()
    const notFound = vi.fn(async () => ({ ok: false, status: 404 }))
    expect(await resolveShortLink('dana', { backendUrl: 'http://be', key: 'k', fetchImpl: notFound })).toBeNull()
    expect(await resolveShortLink('dana', { backendUrl: 'http://be', key: 'k', fetchImpl: ok({ utm: {} }) })).toBeNull()
    const down = vi.fn(async () => { throw new TypeError('fetch failed') })
    expect(await resolveShortLink('dana', { backendUrl: 'http://be', key: 'k', fetchImpl: down })).toBeNull()
  })
})

describe('shortLinkTarget', () => {
  it('лендинг с метками ссылки; чужие utm из адреса отброшены, fbclid сохранён', () => {
    const to = shortLinkTarget({ utm_source: 'tiktok', utm_content: 'dana' }, '?utm_source=x&utm_term=y&fbclid=abc')
    const sp = new URLSearchParams(to.slice(2))
    expect(to.startsWith('/?')).toBe(true)
    expect(Object.fromEntries(sp)).toEqual({ fbclid: 'abc', utm_source: 'tiktok', utm_content: 'dana' })
  })

  it('ссылки нет — лендинг как есть', () => {
    expect(shortLinkTarget(null)).toBe('/')
    expect(shortLinkTarget(null, '?lang=kz')).toBe('/?lang=kz')
  })
})
