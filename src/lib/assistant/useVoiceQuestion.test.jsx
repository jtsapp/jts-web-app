// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Хук голосового вопроса поверх подменённого useRecorder: проверяются гонки,
// которые на живом микрофоне ловятся плохо, — двойное нажатие, пока браузер
// спрашивает разрешение; закрытие окна в это время; выход из аккаунта посреди
// распознавания.
const rec = vi.hoisted(() => ({ state: 'idle', error: null, starts: [], stop: null, release: null, drop: null, gate: null }))
vi.mock('../../ielts/speaking/useRecorder.js', () => ({
  useRecorder: () => ({
    state: rec.state,
    error: rec.error,
    elapsed: 0,
    stream: null,
    start: (opts) => {
      rec.starts.push(opts)
      return rec.gate
    },
    stop: rec.stop,
    release: rec.release,
    drop: rec.drop,
  }),
}))
vi.mock('../ielts-audio.js', () => ({ isMediaRecordingSupported: () => true }))

const { useVoiceQuestion } = await import('./useVoiceQuestion.js')

class FakeAudioContext {
  constructor() {
    this.state = 'suspended'
    FakeAudioContext.made++
  }
  resume() {
    this.state = 'running'
    FakeAudioContext.resumed++
    return Promise.resolve()
  }
  suspend() {
    this.state = 'suspended'
    return Promise.resolve()
  }
  close() {
    this.state = 'closed'
    return Promise.resolve()
  }
}

const flush = () => act(async () => {})
const out = () => ({ wav: new Blob([new Uint8Array(10)]), url: 'blob:q', durationSec: 2 })

describe('useVoiceQuestion', () => {
  let fetchMock, onText, resolveGate
  beforeEach(() => {
    Object.assign(rec, { state: 'idle', error: null, starts: [], stop: vi.fn(), release: vi.fn(), drop: vi.fn() })
    rec.gate = new Promise((r) => (resolveGate = r))
    FakeAudioContext.made = 0
    FakeAudioContext.resumed = 0
    vi.stubGlobal('AudioContext', FakeAudioContext)
    fetchMock = vi.fn(async () => Response.json({ text: 'где домашка' }))
    vi.stubGlobal('fetch', fetchMock)
    onText = vi.fn()
  })
  afterEach(() => vi.unstubAllGlobals())

  const mount = () => renderHook(() => useVoiceQuestion({ token: 'tok', lang: 'kk', screenId: 'home', onText }))

  it('вопрос: запись → распознавание с языком и экраном → onText, микрофон отпущен', async () => {
    const { result } = mount()
    expect(result.current.supported).toBe(true)
    act(() => result.current.toggle())
    resolveGate(true)
    await flush()
    await act(async () => rec.starts[0].onDone(out()))
    expect(rec.release).toHaveBeenCalled()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/assistant/transcribe')
    expect(init.headers.authorization).toBe('Bearer tok')
    expect(init.body.get('lang')).toBe('kk')
    expect(init.body.get('screen')).toBe('home')
    expect(onText).toHaveBeenCalledWith('где домашка')
    expect(rec.drop).toHaveBeenCalledWith('blob:q')
  })

  it('звуковой контекст будится в самом нажатии — до ответа о разрешении (iPhone)', () => {
    const { result } = mount()
    act(() => result.current.toggle())
    expect(FakeAudioContext.made).toBe(1)
    expect(FakeAudioContext.resumed).toBe(1)
  })

  it('двойное нажатие, пока браузер спрашивает разрешение, — одна запись', async () => {
    const { result } = mount()
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    expect(rec.starts).toHaveLength(1)
    expect(result.current.state).toBe('starting')
    resolveGate(true)
    await flush()
    expect(result.current.state).toBe('idle')
  })

  it('окно закрыли, пока ждём разрешения, — запись сразу гасится и в распознавание не идёт', async () => {
    const { result } = mount()
    act(() => result.current.toggle())
    act(() => result.current.cancel())
    resolveGate(true)
    await flush()
    expect(rec.stop).toHaveBeenCalled()
    await act(async () => rec.starts[0].onDone(out()))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(rec.drop).toHaveBeenCalledWith('blob:q')
  })

  it('после отмены следующий вопрос снова работает', async () => {
    const { result } = mount()
    act(() => result.current.toggle())
    act(() => result.current.cancel())
    resolveGate(true)
    await flush()
    rec.gate = Promise.resolve(true)
    act(() => result.current.toggle())
    await flush()
    await act(async () => rec.starts[1].onDone(out()))
    expect(onText).toHaveBeenCalledWith('где домашка')
  })

  it('выход из аккаунта посреди распознавания — запрос оборван, вопрос не задан', async () => {
    let signal
    fetchMock = vi.fn((url, init) => {
      signal = init.signal
      return new Promise(() => {})
    })
    vi.stubGlobal('fetch', fetchMock)
    const { result, unmount } = mount()
    act(() => result.current.toggle())
    resolveGate(true)
    await flush()
    await act(async () => {
      rec.starts[0].onDone(out())
    })
    unmount()
    expect(signal.aborted).toBe(true)
    expect(onText).not.toHaveBeenCalled()
  })

  it('пусто — not_heard, лимит — rate с секундами, сбой — stt_failed', async () => {
    const { result } = mount()
    const ask = async (res) => {
      fetchMock.mockResolvedValueOnce(res)
      rec.gate = Promise.resolve(true)
      act(() => result.current.toggle())
      await flush()
      await act(async () => rec.starts.at(-1).onDone(out()))
    }
    await ask(Response.json({ text: '  ' }))
    expect(result.current.error).toBe('not_heard')
    await ask(Response.json({ error: 'rate_limited', retryAfterSec: 120 }, { status: 429 }))
    expect(result.current.error).toBe('rate')
    expect(result.current.retryAfterSec).toBe(120)
    await ask(new Response('x', { status: 502 }))
    expect(result.current.error).toBe('stt_failed')
  })

  it('нет разрешения на микрофон — denied', () => {
    rec.error = 'denied'
    const { result } = mount()
    expect(result.current.error).toBe('denied')
  })

  // Позывной «Луна» (21.10.2026): запись без нажатия и звук, уже снятый «ухом».
  it('transcribeAudio — готовая запись сразу в распознавание, текст — своему получателю', async () => {
    const own = vi.fn()
    const { result } = mount()
    await act(() => result.current.transcribeAudio(new Blob([new Uint8Array(10)]), { onText: own }))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/assistant/transcribe')
    expect(own).toHaveBeenCalledWith('где домашка')
    expect(onText).not.toHaveBeenCalled()
  })

  it('listen — запись со своим получателем; кнопка микрофона после неё — прежний', async () => {
    const own = vi.fn()
    const { result } = mount()
    act(() => result.current.listen({ noVoiceMs: 6000, onText: own }))
    resolveGate(true)
    await flush()
    await act(async () => rec.starts[0].onDone(out()))
    expect(own).toHaveBeenCalledWith('где домашка')
    rec.gate = Promise.resolve(true)
    act(() => result.current.toggle())
    await flush()
    await act(async () => rec.starts[1].onDone(out()))
    expect(onText).toHaveBeenCalledWith('где домашка')
    expect(own).toHaveBeenCalledTimes(1)
  })
})
