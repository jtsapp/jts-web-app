// Регрессия: раздел «Грамматика» исчезал из Практики после единственного сбоя
// сети. Промис индекса кэшировался вместе с промахом, и до перезагрузки
// страницы каталог больше не грузился ни разу.
//
// Кэш живёт в модульной переменной, поэтому каждый тест берёт свежий модуль.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

async function freshLoader() {
  vi.resetModules()
  const mod = await import('./grammarData.js')
  return mod.loadGrammarIndex
}

describe('loadGrammarIndex — кэш только для удачи', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('после сбоя повторный вызов идёт в сеть заново и отдаёт индекс', async () => {
    const index = { levels: [{ code: 'a1' }] }
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => index })
    vi.stubGlobal('fetch', fetchMock)

    const loadGrammarIndex = await freshLoader()
    expect(await loadGrammarIndex()).toBeNull()
    expect(await loadGrammarIndex()).toEqual(index)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('удачный ответ кэшируется — второй раз в сеть не ходим', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ levels: [] }) })
    vi.stubGlobal('fetch', fetchMock)

    const loadGrammarIndex = await freshLoader()
    await loadGrammarIndex()
    await loadGrammarIndex()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
