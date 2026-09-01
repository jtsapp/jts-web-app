// @vitest-environment jsdom
// Кэш книги на общем компьютере.
//
// Класс, ноутбук преподавателя на пробном уроке: в одной вкладке сначала
// работает оплативший ученик, потом демо. Кэш живёт на модуле и смену
// пользователя переживает, поэтому ключ обязан различать аккаунты — иначе
// демо-ученику достаётся полная книга из-под предыдущего, вообще без запроса
// к серверу, и всё серверное превью проходит мимо.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const b64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url')
const tokenFor = (userId) =>
  `${b64url({ alg: 'HS512' })}.${b64url({ userId, phone: '+7700', role: 'STUDENT' })}.sig`

const INDEX = [{ id: 'alice', title: 'Alice', chapters: 4 }]
const full = { book: {}, dict: {}, chapters: [{ num: 1, text: 'полный' }, { num: 2, text: 'полный' }] }
const preview = { book: {}, dict: {}, chapters: [{ num: 1, text: 'превью' }, { num: 2, text: '', locked: true }] }

describe('кэш текста книги', () => {
  let loadBookContent

  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn())
    // Импорт после сброса модулей: кэш живёт в области модуля, и без этого
    // тесты видели бы кэш друг друга.
    ;({ loadBookContent } = await import('./BookDetail.jsx'))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('ответ одного аккаунта не достаётся другому', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => INDEX })
      .mockResolvedValueOnce({ ok: true, json: async () => full })
      .mockResolvedValueOnce({ ok: true, json: async () => preview })

    const paid = await loadBookContent({ title: 'Alice' }, tokenFor(1))
    const demo = await loadBookContent({ title: 'Alice' }, tokenFor(2))

    expect(paid.chapters[1].text).toBe('полный')
    expect(demo.chapters[1].text).toBe('')
    expect(demo.chapters[1].locked).toBe(true)
  })

  it('тот же аккаунт второй раз в сеть не ходит', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => INDEX })
      .mockResolvedValueOnce({ ok: true, json: async () => full })

    const token = tokenFor(1)
    await loadBookContent({ title: 'Alice' }, token)
    await loadBookContent({ title: 'Alice' }, token)

    // Один запрос за индексом и один за книгой — повтор взят из кэша.
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('выход из аккаунта не оставляет книгу анониму', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => INDEX })
      .mockResolvedValueOnce({ ok: true, json: async () => full })
      .mockResolvedValueOnce({ ok: true, json: async () => preview })

    await loadBookContent({ title: 'Alice' }, tokenFor(1))
    const anon = await loadBookContent({ title: 'Alice' }, null)

    expect(anon.chapters[1].text).toBe('')
  })
})
