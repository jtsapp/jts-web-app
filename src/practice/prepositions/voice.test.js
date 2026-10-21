import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/speech.js', () => ({ playTts: vi.fn(), stopTts: vi.fn() }))
const { playTts, stopTts } = await import('../../lib/speech.js')
const { speakLesson, stopLesson } = await import('./voice.js')

afterEach(() => vi.clearAllMocks())

describe('озвучка урока', () => {
  it('Soniox голосом уроков на скорости прототипа', () => {
    speakLesson('The cat is in the box.')
    expect(playTts).toHaveBeenCalledWith('The cat is in the box.', expect.objectContaining({ voice: 'Grace', lang: 'en', speed: 0.85 }))
  })

  it('сервер не ответил — голос устройства', () => {
    const speak = vi.fn()
    globalThis.SpeechSynthesisUtterance = function (t) { this.text = t }
    globalThis.window = globalThis.window || globalThis
    window.speechSynthesis = { speak, cancel: vi.fn() }
    speakLesson('on the table')
    playTts.mock.calls[0][1].onFail('error')
    expect(speak).toHaveBeenCalled()
    expect(speak.mock.calls[0][0].lang).toBe('en-US')
  })

  it('stopLesson глушит и общий плеер, и голос устройства', () => {
    const cancel = vi.fn()
    globalThis.window = globalThis.window || globalThis
    window.speechSynthesis = { speak: vi.fn(), cancel }
    stopLesson()
    expect(stopTts).toHaveBeenCalled()
    expect(cancel).toHaveBeenCalled()
  })
})
