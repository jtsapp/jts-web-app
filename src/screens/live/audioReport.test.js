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
