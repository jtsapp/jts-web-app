import { describe, it, expect, vi, afterEach } from 'vitest'
import { installMicArbiter, withOwnMic } from './micArbiter.js'

function fakeTrack() {
  return {
    readyState: 'live',
    stop() {
      this.readyState = 'ended'
    },
  }
}

// Окно без DOM: getUserMedia и распознаватель речи — всё, на что смотрит арбитр.
function fakeWin() {
  const tracks = []
  const md = {
    getUserMedia: vi.fn(async () => {
      const t = fakeTrack()
      tracks.push(t)
      return { getAudioTracks: () => [t], getTracks: () => [t] }
    }),
  }
  class Rec extends EventTarget {
    start() {
      this.started = true
    }
  }
  return { navigator: { mediaDevices: md }, webkitSpeechRecognition: Rec, tracks, md, Rec }
}

let handles = []
const install = (opts) => {
  const h = installMicArbiter(opts)
  handles.push(h)
  return h
}
afterEach(() => {
  handles.forEach((h) => h.uninstall())
  handles = []
  vi.useRealTimers()
})

describe('арбитр микрофона', () => {
  it('чужой getUserMedia: сначала onClaim, занят с запроса и до конца дорожки', async () => {
    vi.useFakeTimers()
    const win = fakeWin()
    const order = []
    win.md.getUserMedia.mockImplementation(async () => {
      order.push('gum')
      const t = fakeTrack()
      win.tracks.push(t)
      return { getAudioTracks: () => [t] }
    })
    const arb = install({ win, onClaim: () => order.push('claim') })
    const seen = []
    arb.subscribe((b) => seen.push(b))
    const p = win.navigator.mediaDevices.getUserMedia({ audio: true })
    expect(arb.isBusy()).toBe(true)
    await p
    expect(order).toEqual(['claim', 'gum'])
    win.tracks[0].stop()
    await vi.advanceTimersByTimeAsync(1000)
    expect(arb.isBusy()).toBe(false)
    expect(seen).toEqual([true, false])
  })

  it('getUserMedia самого «уха» и запрос без звука — не чужие', async () => {
    const win = fakeWin()
    const claim = vi.fn()
    const arb = install({ win, onClaim: claim })
    await withOwnMic(() => win.navigator.mediaDevices.getUserMedia({ audio: true }))
    await win.navigator.mediaDevices.getUserMedia({ video: true })
    expect(claim).not.toHaveBeenCalled()
    expect(arb.isBusy()).toBe(false)
  })

  it('отказ в разрешении — не занят', async () => {
    const win = fakeWin()
    win.md.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
    const arb = install({ win })
    await expect(win.navigator.mediaDevices.getUserMedia({ audio: true })).rejects.toThrow('no')
    expect(arb.isBusy()).toBe(false)
  })

  it('распознавание речи: занят от start до end', () => {
    const win = fakeWin()
    const claim = vi.fn()
    const arb = install({ win, onClaim: claim })
    const rec = new win.webkitSpeechRecognition()
    rec.start()
    expect(claim).toHaveBeenCalledTimes(1)
    expect(rec.started).toBe(true)
    expect(arb.isBusy()).toBe(true)
    rec.dispatchEvent(new Event('end'))
    expect(arb.isBusy()).toBe(false)
  })

  it('снят последний — браузерные функции на месте', () => {
    const win = fakeWin()
    const gum = win.md.getUserMedia
    const start = win.Rec.prototype.start
    const a = installMicArbiter({ win })
    const b = installMicArbiter({ win })
    a.uninstall()
    expect(win.md.getUserMedia).not.toBe(gum)
    b.uninstall()
    expect(win.md.getUserMedia).toBe(gum)
    expect(win.Rec.prototype.start).toBe(start)
  })
})
