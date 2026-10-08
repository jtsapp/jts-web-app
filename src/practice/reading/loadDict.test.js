import { describe, it, expect, afterEach, vi } from 'vitest'

// Ревью 08.10.2026: сбой загрузки словаря запоминался как {} — пустой объект
// «есть словарь», и тап по слову до перезагрузки страницы шёл мимо офлайн-слоя
// (без казахского перевода).

const DICT = { honey: ['мёд', 'бал'] }
const ok = () => ({ ok: true, status: 200, json: async () => DICT })
const bad = () => ({ ok: false, status: 502, json: async () => ({}) })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function load(...replies) {
  const fetch = vi.fn()
  for (const r of replies) {
    if (r instanceof Error) fetch.mockRejectedValueOnce(r)
    else fetch.mockResolvedValueOnce(r())
  }
  vi.stubGlobal('fetch', fetch)
  const { loadDict } = await import('./loadDict.js')
  return { fetch, loadDict }
}

describe('loadDict', () => {
  it('ответ сервера с ошибкой — null, и следующий тап качает заново', async () => {
    const { fetch, loadDict } = await load(bad, ok)
    expect(await loadDict()).toBeNull()
    expect(await loadDict()).toEqual(DICT)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('сеть оборвалась — тоже null и повтор', async () => {
    const { fetch, loadDict } = await load(new TypeError('Failed to fetch'), ok)
    expect(await loadDict()).toBeNull()
    expect(await loadDict()).toEqual(DICT)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('удачный словарь качается один раз на все тапы', async () => {
    const { fetch, loadDict } = await load(ok)
    expect(await loadDict()).toEqual(DICT)
    expect(await loadDict()).toEqual(DICT)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
