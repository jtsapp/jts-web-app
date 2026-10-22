import { describe, it, expect, vi } from 'vitest'
import { loadReadingLevel, readingStaticUrl } from './readingContent.js'

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const status = (code) => ({ ok: false, status: code, json: async () => ({}) })
const TEXT = (from) => ({ id: 'a1-sci-honey', level: 'A1', genre: 'science', title: from })

function fetchWith(remote) {
  return vi.fn(async (url) => {
    if (String(url).startsWith('https://api.test/')) return remote
    if (url === readingStaticUrl('a1')) return ok({ level: 'A1', texts: [TEXT('static')] })
    return status(404)
  })
}

const load = (fetchImpl) => loadReadingLevel('a1', { fetchImpl, base: 'https://api.test', timeoutMs: 50 })

describe('loadReadingLevel', () => {
  it('бэкенд отдал массив текстов — экран получает форму файла уровня', async () => {
    const f = fetchWith(ok([TEXT('api')]))
    expect(await load(f)).toEqual({ data: { level: 'A1', texts: [TEXT('api')] }, source: 'api' })
    expect(f.mock.calls[0][0]).toBe('https://api.test/practice-content/reading/a1')
  })

  it('на стенде пакет не залит (404 или пусто) — файл уровня как раньше', async () => {
    for (const remote of [status(404), ok([])]) {
      expect(await load(fetchWith(remote))).toEqual({ data: { level: 'A1', texts: [TEXT('static')] }, source: 'static' })
    }
  })

  it('битый файл уровня — ошибка, а не пустая библиотека', async () => {
    const f = vi.fn(async (url) => (String(url).startsWith('https://api.test/') ? status(500) : ok({ level: 'A1' })))
    await expect(load(f)).rejects.toThrow(/bad level data/)
  })
})
