import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSpeechEar, QUICK_ENDS, START_TIMEOUT_MS, WAKE_LANGS } from './speechEar.js'
import { installMicArbiter } from './micArbiter.js'

// Позывной на распознавании браузера (задача 202, п.2: без загрузки модели). Распознаватель подменён: тест сам
// шлёт его события (start, result, error, end) и смотрит, что «ухо» с ними делает.
class FakeRec {
  constructor() {
    FakeRec.made.push(this)
    this.started = false
    this.aborted = false
  }
  start() {
    this.started = true
  }
  abort() {
    this.aborted = true
  }
}
FakeRec.made = []

const final = (text) => Object.assign([{ transcript: text }], { isFinal: true })
const interim = (text) => Object.assign([{ transcript: text }], { isFinal: false })
const say = (rec, ...results) => rec.onresult({ resultIndex: 0, results })

function ear(extra = {}) {
  FakeRec.made = []
  const states = []
  const onWake = vi.fn()
  let t = 0
  const e = createSpeechEar({
    Recognition: FakeRec,
    onWake,
    onState: (s, err) => states.push(err ? `${s}:${err}` : s),
    getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })),
    activated: () => true,
    now: () => t,
    ...extra,
  })
  return { e, states, onWake, rec: () => FakeRec.made.at(-1), tick: (ms) => (t += ms) }
}

afterEach(() => vi.useRealTimers())

describe('speechEar — позывной на распознавании браузера', () => {
  it('слушает по-русски непрерывно; «Луна, где домашка?» — позывной целиком текстом', () => {
    const { e, states, onWake, rec } = ear()
    e.start()
    expect(rec()).toMatchObject({ lang: 'ru-RU', continuous: true, interimResults: false, started: true })
    rec().onstart()
    expect(states.at(-1)).toBe('listening')
    say(rec(), final('Луна, где домашка?'))
    expect(onWake).toHaveBeenCalledWith(expect.objectContaining({ text: 'Луна, где домашка?', full: true }))
    expect(onWake.mock.calls[0][0].preroll()).toBeNull()
  })

  it('обычная речь и промежуточный текст — не позывной', () => {
    const { e, onWake, rec } = ear()
    e.start()
    rec().onstart()
    say(rec(), final('Полная луна сегодня'), interim('Луна'))
    expect(onWake).not.toHaveBeenCalled()
  })

  it('Айзере слушают по-казахски; браузер без казахского — по-русски, без ошибки', () => {
    expect(WAKE_LANGS.aizere[0]).toBe('kk-KZ')
    const { e, states, onWake, rec } = ear({ persona: 'aizere' })
    e.start()
    expect(rec().lang).toBe('kk-KZ')
    rec().onerror({ error: 'language-not-supported' })
    expect(states.at(-1)).toBe('idle')
    e.start()
    expect(rec().lang).toBe('ru-RU')
    rec().onstart()
    say(rec(), final('Сәлем, Айзере'))
    expect(onWake).toHaveBeenCalledTimes(1)
    rec().onerror({ error: 'language-not-supported' })
    expect(states.at(-1)).toBe('error:unsupported')
  })

  it.each([
    ['not-allowed', 'denied'],
    ['audio-capture', 'mic'],
    ['network', 'network'],
    ['service-not-allowed', 'unsupported'],
  ])('отказ %s — ошибка %s', (code, error) => {
    const { e, states, rec } = ear()
    e.start()
    rec().onerror({ error: code })
    expect(states.at(-1)).toBe(`error:${error}`)
    expect(rec().aborted).toBe(true)
  })

  it('no-speech и aborted — не ошибка: дальше конец, «ухо» ждёт перезапуска', () => {
    const { e, states, rec } = ear()
    e.start()
    rec().onstart()
    rec().onerror({ error: 'no-speech' })
    rec().onend()
    expect(states.at(-1)).toBe('idle')
  })

  it('немой распознаватель (нет start) — unsupported', () => {
    vi.useFakeTimers()
    const { e, states } = ear()
    e.start()
    vi.advanceTimersByTime(START_TIMEOUT_MS + 1)
    expect(states.at(-1)).toBe('error:unsupported')
  })

  it('кончается сразу и без слов раз за разом — unsupported; со словами — нет', () => {
    const a = ear()
    for (let i = 0; i < QUICK_ENDS; i++) {
      a.e.start()
      a.rec().onstart()
      a.tick(100)
      a.rec().onend()
    }
    expect(a.states.at(-1)).toBe('error:unsupported')

    const b = ear()
    for (let i = 0; i < QUICK_ENDS + 2; i++) {
      b.e.start()
      b.rec().onstart()
      say(b.rec(), final('сегодня хорошая погода'))
      b.tick(100)
      b.rec().onend()
    }
    expect(b.states.at(-1)).toBe('idle')
  })

  it('до касания страницы спит; resume из нажатия — можно слушать', () => {
    let touched = false
    const { e, states, rec } = ear({ activated: () => touched })
    e.start()
    expect(states.at(-1)).toBe('asleep')
    expect(rec()).toBeUndefined()
    touched = true
    e.resume()
    expect(states.at(-1)).toBe('idle')
    e.start()
    expect(rec().started).toBe(true)
  })

  it('stop — распознаватель прерван, его поздний конец не трогает «ухо»', () => {
    const { e, states, rec } = ear()
    e.start()
    rec().onstart()
    const r = rec()
    e.stop()
    expect(r.aborted).toBe(true)
    expect(states.at(-1)).toBe('idle')
    r.onend?.()
    expect(states.at(-1)).toBe('idle')
  })

  it('prepare — разрешение заранее, микрофон сразу отдан; отказ — denied', async () => {
    const track = { stop: vi.fn() }
    const ok = ear({ getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) })
    await ok.e.prepare()
    expect(track.stop).toHaveBeenCalled()
    expect(ok.states.at(-1)).toBe('idle')

    const no = ear({ getUserMedia: vi.fn(async () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }))) })
    await no.e.prepare()
    expect(no.states.at(-1)).toBe('error:denied')
  })

  it('распознавателя в браузере нет — unsupported', async () => {
    const { e, states } = ear({ Recognition: null })
    e.start()
    expect(states.at(-1)).toBe('error:unsupported')
    await e.prepare()
    expect(states.at(-1)).toBe('error:unsupported')
  })

  it('свой запуск арбитр микрофона не считает чужим', () => {
    class Rec extends EventTarget {
      start() {
        this.started = true
      }
      abort() {}
    }
    const claim = vi.fn()
    const arb = installMicArbiter({ win: { navigator: {}, webkitSpeechRecognition: Rec }, onClaim: claim })
    try {
      const e = createSpeechEar({ Recognition: Rec, onWake: () => {}, activated: () => true })
      e.start()
      expect(claim).not.toHaveBeenCalled()
      expect(arb.isBusy()).toBe(false)
      // Чужое распознавание (Аркада) — занято, «ухо» отдаёт микрофон.
      new Rec().start()
      expect(claim).toHaveBeenCalledTimes(1)
      expect(arb.isBusy()).toBe(true)
    } finally {
      arb.uninstall()
    }
  })
})
