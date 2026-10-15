import { beforeEach, describe, expect, it, vi } from 'vitest'

// Плеер — сеть и <audio>; здесь проверяем только выбор пути: запись → синтез → «звука нет».
const calls = []
let urlFail = null
let ttsFail = null
vi.mock('../../lib/speech.js', () => ({
  playUrl: (src, o) => { calls.push(['url', src, o.rate]); if (urlFail) o.onFail(urlFail); else o.onStart?.(); return true },
  playTts: (text, o) => { calls.push(['tts', text, o.rate, o.speed, o.voice]); if (ttsFail) o.onFail(ttsFail); else o.onStart?.(); return true },
  prefetchUrl: (src) => calls.push(['prefetchUrl', src]),
  prefetchTts: (text) => calls.push(['prefetchTts', text]),
  stopTts: () => {},
  unlockSpeech: () => {},
}))

const { createNumbersVoice } = await import('./voice.js')

beforeEach(() => {
  calls.length = 0
  urlFail = null
  ttsFail = null
})

describe('звук «Чисел»', () => {
  const voice = () => createNumbersVoice({ thirteen: 'abc123' })

  it('есть запись — играет она, с темпом раунда', () => {
    voice().say('thirteen', 0.95)
    expect(calls).toEqual([['url', '/practice/numbers/audio/abc123.mp3', 0.95]])
  })

  it('записи нет — тот же голос синтезом на скорости 1, темп — на устройстве', () => {
    voice().say('thirty', 1.15)
    expect(calls).toEqual([['tts', 'thirty', 1.15, 1, 'Freya']])
  })

  it('запись не загрузилась — синтез той же фразы; «нет жеста» — ничего', () => {
    urlFail = 'error'
    voice().say('thirteen', 1)
    expect(calls.map((c) => c[0])).toEqual(['url', 'tts'])
    calls.length = 0
    urlFail = 'blocked'
    voice().say('thirteen', 1)
    expect(calls.map((c) => c[0])).toEqual(['url'])
  })

  it('звука нет совсем: onFail задания, после двух провалов ok() → false, успех сбрасывает', () => {
    const v = createNumbersVoice({})
    const onFail = vi.fn()
    ttsFail = 'error'
    v.say('a', 1, onFail)
    expect(v.ok()).toBe(true)
    v.say('b', 1, onFail)
    expect(onFail).toHaveBeenCalledTimes(2)
    expect(v.ok()).toBe(false)
    ttsFail = null
    v.say('c', 1)
    expect(v.ok()).toBe(true)
  })

  it('прогрев: запись — по файлу, без записи — синтез', () => {
    const v = voice()
    v.prefetch('thirteen')
    v.prefetch('thirty')
    expect(calls).toEqual([['prefetchUrl', '/practice/numbers/audio/abc123.mp3'], ['prefetchTts', 'thirty']])
  })
})
