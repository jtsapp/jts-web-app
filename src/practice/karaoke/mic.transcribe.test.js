// Распознавание дубля караоке: не дольше таймаута и отменяется выходом.
// Раньше ожидание было бесконечным, а выход с «Считаем…» закрыт — ученик
// сидел перед экраном до обрыва запроса.

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/ielts-audio.js', () => ({
  blobToWav16kMono: async () => new Blob([new Uint8Array(44)], { type: 'audio/wav' }),
}))

import { TRANSCRIBE_TIMEOUT_MS, transcribeTake } from './mic.js'

const take = () => new Blob([new Uint8Array(1000)], { type: 'audio/webm' })

// fetch, который не отвечает никогда (сервер ушёл в потоковое распознавание
// или сеть встала), но честно запоминает сигнал отмены.
function hangingFetch() {
  const seen = {}
  vi.stubGlobal(
    'fetch',
    vi.fn((url, opts) => {
      seen.signal = opts.signal
      return new Promise(() => {})
    }),
  )
  return seen
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('transcribeTake', () => {
  it('текст ответа — как раньше', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ text: '  I woke up  ' }) })))
    expect(await transcribeTake(take())).toBe('I woke up')
  })

  it('сервер молчит — через минуту null (слова не оцениваются), запрос закрыт', async () => {
    vi.useFakeTimers()
    const seen = hangingFetch()
    let out = 'pending'
    transcribeTake(take()).then((v) => (out = v))
    await vi.advanceTimersByTimeAsync(TRANSCRIBE_TIMEOUT_MS - 1000)
    expect(out).toBe('pending')
    await vi.advanceTimersByTimeAsync(1000)
    expect(out).toBe(null)
    expect(seen.signal.aborted).toBe(true)
  })

  it('выход ученика отменяет ожидание сразу', async () => {
    const seen = hangingFetch()
    const ctrl = new AbortController()
    const pending = transcribeTake(take(), { signal: ctrl.signal })
    await vi.waitFor(() => expect(seen.signal).toBeTruthy())
    ctrl.abort()
    expect(await pending).toBe(null)
    expect(seen.signal.aborted).toBe(true)
  })

  it('уже отменённый сигнал — в сеть не ходим', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const ctrl = new AbortController()
    ctrl.abort()
    expect(await transcribeTake(take(), { signal: ctrl.signal })).toBe(null)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ошибка сервера — null, а не исключение', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 524, json: async () => ({}) })))
    expect(await transcribeTake(take())).toBe(null)
  })
})
