// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Устройство без английского голоса: в системе стоят только русский и казахский.
//
// Раньше словарь в такой ситуации молчал — намеренно, чтобы английское слово не
// читал русский голос. Но преподаватель прислал это как поломку: «в словаре
// слова не озвучиваются, и в упражнениях, где нужно по аудио определить какое
// слово, нету озвучки». Задание, где слово надо услышать, без звука неотвечаемо,
// и молчание там хуже неидеального произношения.
//
// Теперь такой случай уходит на серверную озвучку — ту же, что читает тексты
// Listening.
const speakListeningAudio = vi.fn()
vi.mock('../../lib/ielts-audio.js', () => ({
  speakListeningAudio: (...args) => speakListeningAudio(...args),
}))
vi.mock('../../screens/live/audioReport.js', () => ({ reportAudio: () => {} }))

function withVoices(voices) {
  window.speechSynthesis = {
    getVoices: () => voices,
    cancel: () => {},
    speak: vi.fn(),
  }
  // jsdom не реализует синтез речи: конструктор реплики нужен подставной, иначе
  // ветка с настоящим голосом падает ещё до вызова speak().
  window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
    this.text = text
  }
  globalThis.SpeechSynthesisUtterance = window.SpeechSynthesisUtterance
  return window.speechSynthesis
}

describe('озвучка слова на устройстве без английского голоса', () => {
  beforeEach(() => {
    vi.resetModules()
    speakListeningAudio.mockReset()
    speakListeningAudio.mockResolvedValue('eleven')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('слово уходит на серверную озвучку, а не пропадает в тишине', async () => {
    withVoices([{ name: 'Milena', lang: 'ru-RU' }, { name: 'Aigul', lang: 'kk-KZ' }])
    const { speak } = await import('./audio.js')

    speak('answer')

    expect(speakListeningAudio).toHaveBeenCalledTimes(1)
    expect(speakListeningAudio.mock.calls[0][0]).toBe('answer')
  })

  it('русскому голосу английское слово не отдаём', async () => {
    const synth = withVoices([{ name: 'Milena', lang: 'ru-RU' }])
    const { speak } = await import('./audio.js')

    speak('answer')
    vi.advanceTimersByTime(100)

    // Пародия на произношение хуже отсутствия: браузерный синтез не трогаем.
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('когда сервер не настроен, говорим об этом один раз, а не на каждое слово', async () => {
    speakListeningAudio.mockResolvedValue('none')
    withVoices([{ name: 'Milena', lang: 'ru-RU' }])
    const { speak } = await import('./audio.js')
    const onNoVoice = vi.fn()

    speak('answer', { onNoVoice })
    await Promise.resolve()
    await Promise.resolve()
    speak('question', { onNoVoice })
    await Promise.resolve()
    await Promise.resolve()

    expect(onNoVoice).toHaveBeenCalledTimes(1)
  })

  it('английский голос есть — серверную озвучку не дёргаем и не платим за неё', async () => {
    const synth = withVoices([{ name: 'Samantha', lang: 'en-US' }])
    const { speak } = await import('./audio.js')

    speak('answer')
    vi.advanceTimersByTime(100)

    expect(speakListeningAudio).not.toHaveBeenCalled()
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })
})
