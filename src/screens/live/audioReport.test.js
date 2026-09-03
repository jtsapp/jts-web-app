// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { playBroadcastAudio, stopBroadcastAudio, releaseBroadcastAudio } from './audioReport.js'

// «Слушать вместе»: преподаватель останавливает дорожку там, где непонятно,
// разбирает и продолжает — класс обязан продолжить с того же места, а не
// начать сначала. Раньше каждый «play» создавал новый Audio и играл с нуля.
const created = []

class FakeAudio {
  constructor(src) {
    this.src = src
    this.currentTime = 0
    this.readyState = 1
    this.paused = true
    this.dataset = {}
    this.play = vi.fn(() => { this.paused = false; return Promise.resolve() })
    this.pause = vi.fn(() => { this.paused = true })
    this.addEventListener = vi.fn()
    created.push(this)
  }
}

beforeEach(() => {
  created.length = 0
  releaseBroadcastAudio()
  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn() })
})

describe('трансляция аудио классу', () => {
  it('продолжение после паузы идёт с места преподавателя, тем же элементом', () => {
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 0 })
    playBroadcastAudio({ kind: 'file', action: 'stop', position: 42 })
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 42 })

    expect(created).toHaveLength(1)
    expect(created[0].currentTime).toBe(42)
    expect(created[0].play).toHaveBeenCalledTimes(2)
  })

  it('другая дорожка — новый элемент, прежний остановлен', () => {
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'a.mp3', position: 0 })
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'b.mp3', position: 3 })

    expect(created).toHaveLength(2)
    expect(created[0].pause).toHaveBeenCalled()
    expect(created[1].currentTime).toBe(3)
  })

  it('перемотка преподавателя переносит класс, а не доигрывает старое', () => {
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 0 })
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 118.5 })

    expect(created).toHaveLength(1)
    expect(created[0].currentTime).toBe(118.5)
  })

  it('метаданных ещё нет — перемотку откладываем до loadedmetadata', () => {
    class NotReady extends FakeAudio {
      constructor(src) { super(src); this.readyState = 0 }
    }
    vi.stubGlobal('Audio', NotReady)

    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 12 })

    expect(created[0].currentTime).toBe(0)
    expect(created[0].addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function), { once: true })
  })

  it('выход из урока отпускает дорожку — следующий урок начинает с нуля', () => {
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 10 })
    releaseBroadcastAudio()
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 0 })

    expect(created).toHaveLength(2)
  })

  it('стоп без новой дорожки просто ставит паузу', () => {
    playBroadcastAudio({ kind: 'file', action: 'play', url: 'track.mp3', position: 0 })
    stopBroadcastAudio()

    expect(created[0].pause).toHaveBeenCalled()
  })
})
