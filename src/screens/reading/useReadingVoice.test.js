// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Озвучка текста идёт через общий движок воркбука, а тап по слову и 🔊 у
// ключевых слов говорят через него же — и обрывают текущее предложение.
// Ревью 08.10.2026: после такого обрыва хук оставался «играет» навсегда —
// колбэк «следующее предложение» уже не приходил, кнопка «Слушать» и
// подсветка зависали. Прототип в этом месте останавливал чтение (sayWord →
// ttsStop), так и проверяем.

const tts = { calls: [], down: false }
vi.mock('../../lib/speech.js', () => ({
  playTts: (text, o) => {
    tts.calls.push({ text, ...o })
    if (tts.down) o.onFail?.('error')
    return true
  },
  prefetchTts: () => {},
  stopTts: () => {},
  unlockSpeech: () => {},
  isTtsActive: () => true,
  pauseTts: () => {},
  resumeTts: () => {},
}))

class FakeUtterance {
  constructor(text) {
    this.text = text
  }
}

beforeEach(() => {
  tts.calls.length = 0
  tts.down = false
  vi.useFakeTimers()
  vi.stubGlobal('speechSynthesis', {
    speaking: false,
    paused: false,
    getVoices: () => [],
    speak: () => {},
    cancel: () => {},
    resume: () => {},
    pause: () => {},
    addEventListener: () => {},
  })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function setup(lines = ['One.', 'Two.']) {
  const { default: useReadingVoice } = await import('./useReadingVoice.js')
  const voice = await import('../../practice/workbook/voice.js')
  const hook = renderHook(() => useReadingVoice(lines))
  return { hook, voice }
}

describe('useReadingVoice', () => {
  it('тап по слову посреди чтения не оставляет «Слушать» зависшим', async () => {
    const { hook, voice } = await setup()
    act(() => hook.result.current.start())
    expect(hook.result.current).toMatchObject({ playing: true, index: 0 })

    act(() => voice.speak(['word']))
    expect(hook.result.current).toMatchObject({ playing: false, paused: false, index: -1 })
  })

  it('тап в паузе между предложениями тоже сбрасывает чтение', async () => {
    const { hook, voice } = await setup()
    act(() => hook.result.current.start())
    // Предложение дозвучало — до следующего ещё пауза turnGap.
    act(() => tts.calls[0].onEnd())
    act(() => voice.speak(['word']))
    await act(() => vi.runAllTimersAsync())
    expect(hook.result.current).toMatchObject({ playing: false, index: -1 })
  })

  it('«Пауза» между предложениями: тап по слову тоже сбрасывает чтение', async () => {
    const { hook, voice } = await setup()
    act(() => hook.result.current.start())
    // Предложение дозвучало, и ученик жмёт «Пауза», пока идёт промежуток
    // перед следующим: движок отдаёт «дальше», а чтение ждёт «Продолжить».
    act(() => tts.calls[0].onEnd())
    act(() => hook.result.current.pauseResume())
    await act(() => vi.runAllTimersAsync())
    expect(hook.result.current).toMatchObject({ playing: true, paused: true })

    act(() => voice.speak(['word']))
    expect(hook.result.current).toMatchObject({ playing: false, paused: false, index: -1 })
  })

  it('«Пауза» между предложениями: «Продолжить» читает дальше', async () => {
    const { hook } = await setup()
    act(() => hook.result.current.start())
    act(() => tts.calls[0].onEnd())
    act(() => hook.result.current.pauseResume())
    await act(() => vi.runAllTimersAsync())
    act(() => hook.result.current.pauseResume())
    expect(hook.result.current).toMatchObject({ playing: true, paused: false, index: 1 })
    expect(tts.calls.map((c) => c.text)).toEqual(['One.', 'Two.'])
  })

  it('без помех читает до конца и сам гаснет', async () => {
    const { hook } = await setup()
    act(() => hook.result.current.start())
    act(() => tts.calls[0].onEnd())
    await act(() => vi.runAllTimersAsync())
    expect(hook.result.current.index).toBe(1)
    act(() => tts.calls[1].onEnd())
    await act(() => vi.runAllTimersAsync())
    expect(hook.result.current).toMatchObject({ playing: false, index: -1 })
    expect(tts.calls.map((c) => c.text)).toEqual(['One.', 'Two.'])
  })

  it('Soniox не ответил — запасной синтез дочитывает, это не обрыв', async () => {
    const { hook } = await setup()
    tts.down = true
    act(() => hook.result.current.start())
    expect(hook.result.current).toMatchObject({ playing: true, index: 0 })
  })

  it('повторный старт обрывает старый запуск, но сам играет', async () => {
    const { hook } = await setup()
    act(() => hook.result.current.start())
    act(() => hook.result.current.start(1))
    expect(hook.result.current).toMatchObject({ playing: true, index: 1 })
  })

  it('пауза — не обрыв: после «продолжить» чтение идёт дальше', async () => {
    const { hook } = await setup()
    act(() => hook.result.current.start())
    act(() => hook.result.current.pauseResume())
    expect(hook.result.current).toMatchObject({ playing: true, paused: true })
    act(() => hook.result.current.pauseResume())
    act(() => tts.calls[0].onEnd())
    await act(() => vi.runAllTimersAsync())
    expect(hook.result.current).toMatchObject({ playing: true, index: 1 })
  })
})
