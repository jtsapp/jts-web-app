// @vitest-environment jsdom
// Ревью «Практики» 08.10.2026, #60: сбой загрузки самого комикса запоминался
// пустым ответом до перезагрузки вкладки — повторное открытие сразу
// показывало «Не получилось загрузить комикс», в сеть никто не ходил.
// Каталог (loadComicsIndex) это уже не делает с 9ea3cbda, сам комикс — делал.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getComic = vi.fn()
vi.mock('../../api.js', () => ({
  getComics: vi.fn(),
  getComic: (...a) => getComic(...a),
  searchComics: vi.fn(),
}))

async function fresh() {
  vi.resetModules()
  return (await import('./comicsData.js')).loadComic
}

const DOC = { id: 5, slug: 'ghost', title: 'The Ghost', pages: [{ pageNumber: 1, imageUrl: 'p1.webp' }] }

beforeEach(() => {
  getComic.mockReset()
})

describe('loadComic — сбой не запоминается', () => {
  it('после сбоя следующее открытие снова спрашивает сеть', async () => {
    getComic.mockRejectedValueOnce(new Error('сеть')).mockResolvedValueOnce(DOC)
    const loadComic = await fresh()
    expect(await loadComic('T', { id: 5, slug: 'ghost' })).toBeNull()
    const doc = await loadComic('T', { id: 5, slug: 'ghost' })
    expect(doc?.pages?.length).toBe(1)
    expect(getComic).toHaveBeenCalledTimes(2)
  })

  it('удачный ответ кэшируется: второй раз в сеть не ходим', async () => {
    getComic.mockResolvedValue(DOC)
    const loadComic = await fresh()
    await loadComic('T', { id: 5, slug: 'ghost' })
    await loadComic('T', { id: 5, slug: 'ghost' })
    expect(getComic).toHaveBeenCalledTimes(1)
  })
})
