// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// jsdom не умеет HTMLMediaElement.play — подменяем конструктор целиком и считаем,
// сколько элементов создал модуль: в этом весь смысл правки.
function stubAudio(playImpl) {
  const created = []
  class FakeAudio {
    constructor(src) {
      this.src = src ?? ''
      // Настоящий <audio> его имеет, а модуль по dataset.url отличает «та же
      // дорожка, продолжаем с места» от «дорожку сменили».
      this.dataset = {}
      this.play = vi.fn(playImpl)
      this.pause = vi.fn()
      created.push(this)
    }
  }
  vi.stubGlobal('Audio', FakeAudio)
  return created
}

beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('трансляция аудио классу', () => {
  it('играет тем же элементом, что разблокирован жестом входа', async () => {
    const created = stubAudio(() => Promise.resolve())
    const { unlockBroadcastAudio, playBroadcastAudio } = await import('./audioReport.js')

    unlockBroadcastAudio()                                   // жест: «Присоединиться к уроку»
    playBroadcastAudio({ kind: 'file', url: '/course/a1/audio/x.mp3' })

    // На iOS разрешение выдано КОНКРЕТНОМУ элементу — второму играть
    // не разрешат, поэтому его и не должно появиться.
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/course/a1/audio/x.mp3')
    expect(created[0].play).toHaveBeenCalledTimes(2)         // тишина на жесте + трансляция
  })

  it('сообщает об отказе браузера, а не глушит его', async () => {
    stubAudio(() => Promise.reject(new DOMException('gesture required', 'NotAllowedError')))
    const { playBroadcastAudio } = await import('./audioReport.js')
    const onBlocked = vi.fn()
    const onStarted = vi.fn()

    playBroadcastAudio({ kind: 'file', url: '/x.mp3' }, { onBlocked, onStarted })

    await vi.waitFor(() => expect(onBlocked).toHaveBeenCalledTimes(1))
    expect(onStarted).not.toHaveBeenCalled()
  })

  it('не ждёт ничего между жестом и play()', async () => {
    const created = stubAudio(() => Promise.resolve())
    const { unlockBroadcastAudio } = await import('./audioReport.js')

    unlockBroadcastAudio()
    // Синхронно, БЕЗ await перед проверкой: любой await до play() съедает жест.
    expect(created[0].play).toHaveBeenCalled()
  })

  it('на двух трансляциях подряд не объявляет заблокированной ту, что играет', async () => {
    // Элемент теперь один, и AbortError от прерванной первой приходит ПОСЛЕ
    // старта второй — тот же случай, что в lib/ielts-audio.js playTutorSample.
    let rejectFirst
    stubAudio(function () {
      if (this.src === '/first.mp3') return new Promise((_, r) => { rejectFirst = r })
      return Promise.resolve()
    })
    const { playBroadcastAudio } = await import('./audioReport.js')
    const onBlocked = vi.fn()

    playBroadcastAudio({ kind: 'file', url: '/first.mp3' }, { onBlocked })
    playBroadcastAudio({ kind: 'file', url: '/second.mp3' }, { onBlocked })
    rejectFirst(new DOMException('interrupted by pause()', 'AbortError'))
    // Три такта микрозадач: отказ идёт по цепочке then→catch и за один такт
    // обработчик ещё не успевает — с одним тактом тест проходил бы и со
    // сломанным счётчиком поколений, то есть не проверял бы ничего.
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()

    expect(onBlocked).not.toHaveBeenCalled()
  })
})

// Слово, которое учитель транслирует классу, читает Soniox тем же элементом
// трансляции (с 23.09.2026); синтез устройства — только если сервер не ответил.
describe('трансляция слова классу', () => {
  function stubSynth() {
    const spoken = []
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text } })
    window.speechSynthesis = { speak: (u) => spoken.push(u), cancel: vi.fn() }
    return spoken
  }
  afterEach(() => { delete window.speechSynthesis })

  it('играет запись Soniox в разблокированном элементе, синтез молчит', async () => {
    const created = stubAudio(() => Promise.resolve())
    const spoken = stubSynth()
    const { unlockBroadcastAudio, playBroadcastAudio } = await import('./audioReport.js')
    const onStarted = vi.fn()

    unlockBroadcastAudio()
    playBroadcastAudio({ kind: 'tts', text: 'water', accent: 'GB' }, { onStarted })
    await Promise.resolve(); await Promise.resolve()

    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/api/tts?v=Freya&l=en&s=0.9&t=water')
    expect(onStarted).toHaveBeenCalledOnce()
    expect(spoken.filter((u) => u.text.trim())).toHaveLength(0)
  })

  it('Soniox не ответил — слово читает синтез устройства', async () => {
    stubAudio(function () {
      if (String(this.src).startsWith('/api/tts')) return Promise.reject(new DOMException('503', 'NotSupportedError'))
      return Promise.resolve()
    })
    const spoken = stubSynth()
    const { playBroadcastAudio } = await import('./audioReport.js')
    const onBlocked = vi.fn()

    playBroadcastAudio({ kind: 'tts', text: 'water' }, { onBlocked })
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()

    expect(spoken.map((u) => u.text)).toEqual(['water'])
    expect(spoken[0].lang).toBe('en-US')
  })

  it('нет жеста — просим «Включить звук», а не читаем синтезом', async () => {
    stubAudio(() => Promise.reject(new DOMException('gesture', 'NotAllowedError')))
    const spoken = stubSynth()
    const { playBroadcastAudio } = await import('./audioReport.js')
    const onBlocked = vi.fn()
    const evt = { kind: 'tts', text: 'water' }

    playBroadcastAudio(evt, { onBlocked })
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()

    expect(onBlocked).toHaveBeenCalledWith(evt)
    expect(spoken).toHaveLength(0)
  })

  it('после слова дорожка-файл меняет источник, а не продолжает слово', async () => {
    const created = stubAudio(() => Promise.resolve())
    stubSynth()
    const { playBroadcastAudio } = await import('./audioReport.js')

    playBroadcastAudio({ kind: 'tts', text: 'water' })
    playBroadcastAudio({ kind: 'file', url: '/course/a1/audio/x.mp3' })

    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('/course/a1/audio/x.mp3')
  })
})
