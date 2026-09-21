// @vitest-environment jsdom
// «Мой словарь» пустого ученика. Бэкенд на пустой набор отвечает 404
// («No saved vocabulary»), и экран принимал это за поломку: «Мой словарь» не
// открывался вовсе — а значит, и кнопки «Добавить» ученику было не достать, —
// а удаление последнего слова заканчивалось тостом об ошибке.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const TOKEN = `${b64url({ alg: 'HS512' })}.${b64url({ sub: '77001234567', userId: 42 })}.sig`

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const status = (code) => ({ ok: false, status: code, json: async () => ({}) })

describe('openLessonVocab — пустой личный словарь', () => {
  let api

  beforeEach(async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
    vi.resetModules()
    api = await import('./api.js')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('404 личного словаря — пустой набор, а не ошибка', async () => {
    globalThis.fetch.mockResolvedValue(status(404))
    await expect(api.openLessonVocab('saved', TOKEN)).resolves.toEqual({ words: [] })
  })

  it('404 урока словаря по-прежнему ошибка', async () => {
    globalThis.fetch.mockResolvedValue(status(404))
    await expect(api.openLessonVocab('17', TOKEN)).rejects.toMatchObject({ status: 404 })
  })

  it('другие сбои личного словаря не маскируются', async () => {
    globalThis.fetch.mockResolvedValue(status(500))
    await expect(api.openLessonVocab('saved', TOKEN)).rejects.toMatchObject({ status: 500 })
  })

  it('непустой словарь отдаётся как есть', async () => {
    globalThis.fetch.mockResolvedValue(ok({ words: [{ id: 1, word: 'go' }] }))
    await expect(api.openLessonVocab('saved', TOKEN)).resolves.toEqual({ words: [{ id: 1, word: 'go' }] })
  })
})
