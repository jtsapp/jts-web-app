// Машина попытки на фейковых часах бита, фейковом микрофоне и распознавателе.
// Проверяем цепочки прототипа целиком: «послушай → твоя очередь → итог»,
// микрофон на пропуске, ошибки, письмо и итог сессии.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VerbDrill, micErrorKey, recognitionErrorKey } from './drill.js'
import { nextEntry } from './engine.js'

const DATA = JSON.parse(
  readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'practice', 'verbs', 'verbs.json'), 'utf8'),
)

// Часы бита двигает тест: события срабатывают, только пока бит идёт — как у
// настоящего планировщика.
function fakeBeat() {
  return {
    t: 0,
    bpm: 96,
    running: false,
    audible: false,
    ducked: false,
    pending: null,
    ctx: null,
    lastStep: 0,
    events: [],
    clicks: [],
    onError: null,
    onTempoApplied: null,
    now() {
      return this.t
    },
    wake: vi.fn(),
    init() {
      return true
    },
    start(audible, bpm) {
      if (!this.running) {
        this.running = true
        if (bpm) this.bpm = bpm
      }
      this.audible = !!audible
    },
    stop() {
      this.running = false
      this.audible = false
      this.events = []
    },
    setAudible(on) {
      this.audible = !!on
    },
    setVolume() {},
    duck(on) {
      this.ducked = on
    },
    click(t) {
      this.clicks.push(t)
    },
    nextBar() {
      const bar = 240 / this.bpm
      return Math.ceil((this.t + 0.1) / bar) * bar
    },
    at(time, fn) {
      this.events.push({ time, fn })
      this.events.sort((a, b) => a.time - b.time)
    },
    advance(to) {
      this.t = to
      while (this.running && this.events.length && this.events[0].time <= to) this.events.shift().fn()
    },
  }
}

function fakeClips({ fail = false } = {}) {
  return {
    ensure: vi.fn(() => (fail ? Promise.reject(new Error('404')) : Promise.resolve())),
    play: vi.fn(() => true),
    stop: vi.fn(),
    prefetch: vi.fn(),
    setVolume: vi.fn(),
  }
}

class FakeSR {
  static last = null
  constructor() {
    FakeSR.last = this
    this.started = false
    this.stopped = false
  }
  start() {
    this.started = true
  }
  stop() {
    this.stopped = true
  }
  abort() {
    this.aborted = true
  }
}

const result = (text, isFinal = true) => {
  const r = [{ transcript: text }]
  r.isFinal = isFinal
  return r
}

function setup({ settings = {}, env = {}, clips = fakeClips(), scores = {} } = {}) {
  const s = { practiceLevel: 'A1', formCount: 3, set: 'all', limit: 0, beat: true, bpm: 96, volume: 45, tutor: 90, auto: false, ...settings }
  const beat = fakeBeat()
  const persisted = []
  const store = scores // по ссылке: тест может досыпать результаты после сборки
  const track = { stop: vi.fn() }
  const drill = new VerbDrill({
    data: DATA,
    beat,
    clips,
    getSettings: () => s,
    saveSettings: (patch) => Object.assign(s, patch),
    getSaved: () => ({ go: true }),
    getScores: (key) => store[key] || {},
    persist: (key, id, r) => {
      persisted.push({ key, id, r })
      store[key] = { ...(store[key] || {}), [id]: nextEntry((store[key] || {})[id], r) }
    },
    onWrittenChecked: vi.fn(),
    env: {
      SpeechRecognition: () => FakeSR,
      hasMic: () => true,
      getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [track] })),
      raf: () => 0,
      caf: () => {},
      ...env,
    },
  })
  return { drill, beat, clips, s, persisted, track, snap: () => drill.getSnapshot() }
}

const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
  vi.useFakeTimers()
  FakeSR.last = null
})
afterEach(() => vi.useRealTimers())

describe('очередь', () => {
  it('по умолчанию — ритм, A1, три формы: 29 глаголов', () => {
    const { snap } = setup()
    expect(snap()).toMatchObject({ mode: 'repeat', count: 29, idx: 0, phase: 'ready' })
    expect(snap().verb.v1).toBe('be')
  })

  it('смена режима и набора пересобирает очередь', () => {
    const { drill, snap } = setup()
    drill.setMode('sentence')
    expect(snap().count).toBe(18) // A1-предложения на V1/V2 (V3 у A1 нет)
    drill.updateScope({ set: 'saved' })
    expect(snap().queue.every((it) => it.verb === 'go')).toBe(true)
    drill.updateScope({ set: 'all', limit: 10 })
    expect(snap().count).toBe(10)
  })
})

describe('ритм без микрофона', () => {
  it('тьютор на доли 1–2–3, затем «твоя очередь», самопроверка — в прогресс', async () => {
    const { drill, beat, clips, snap, persisted } = setup()
    drill.startAttempt('manual')
    expect(beat.wake).toHaveBeenCalled() // контекст будится в клике
    expect(snap()).toMatchObject({ busy: true, phase: 'listening' })
    await flush()
    const bar = 60 / 96
    const start = clips.play.mock.calls[0][1]
    expect(clips.play.mock.calls.map((c) => c[0])).toEqual(['be', 'was', 'been'])
    expect(clips.play.mock.calls.map((c) => +(c[1] - start).toFixed(6))).toEqual([0, +bar.toFixed(6), +(2 * bar).toFixed(6)])
    beat.advance(start + bar)
    expect(snap().highlight).toBe(1)
    beat.advance(start + 4 * bar)
    expect(snap()).toMatchObject({ phase: 'speaking', stage: { kind: 'speaking', key: 'yourCycle', mic: false } })
    drill.finishManual('manual')
    expect(snap()).toMatchObject({ phase: 'result', busy: false, result: { kind: 'manual' } })
    expect(persisted).toEqual([{ key: 'practice-v4-repeat-3-A1', id: 'be', r: { kind: 'manual', text: '' } }])
    expect(snap().scores.be).toMatchObject({ done: true, attempts: 1 })
  })

  it('стоп посреди «послушай» — поздние колбэки молча отваливаются', async () => {
    const { drill, clips, snap } = setup()
    drill.startAttempt('manual')
    drill.abort()
    await flush()
    expect(clips.play).not.toHaveBeenCalled()
    expect(snap()).toMatchObject({ busy: false, phase: 'ready' })
  })

  it('записи не загрузились — тишина и честное уведомление', async () => {
    const { drill, beat, snap } = setup({ clips: fakeClips({ fail: true }) })
    drill.startAttempt('manual')
    await flush()
    expect(snap()).toMatchObject({ busy: false, notice: { key: 'voiceUnavailable' } })
    expect(beat.running).toBe(false)
  })
})

describe('пропуск с микрофоном', () => {
  it('микрофон → распознаватель → «was» засчитан за V2', async () => {
    const { drill, snap, persisted, track } = setup()
    drill.setMode('gap')
    drill.startAttempt('speech')
    expect(snap().phase).toBe('preparing')
    await flush()
    const rec = FakeSR.last
    expect(rec.started).toBe(true)
    rec.onstart()
    expect(snap()).toMatchObject({ phase: 'speaking', stage: { key: 'sayNow', mic: true } })
    rec.onresult({ results: [result('was')] })
    expect(snap().transcript).toBe('was')
    drill.finishSpeaking()
    expect(rec.stopped).toBe(true)
    expect(snap().phase).toBe('processing')
    rec.onend()
    expect(snap().result).toMatchObject({ kind: 'speech', score: { hits: 1, total: 1 }, text: 'was' })
    expect(persisted.at(-1)).toMatchObject({ key: 'practice-v4-gap-3-A1', id: 'be' })
    expect(track.stop).toHaveBeenCalled() // микрофон отпущен
  })

  it('речь до «твоей очереди» в счёт не идёт', async () => {
    const { drill, snap } = setup()
    drill.setMode('gap')
    drill.startAttempt('speech')
    await flush()
    const rec = FakeSR.last
    rec.onresult({ results: [result('um hello')] }) // ещё не открыли ответ
    rec.onstart()
    rec.onresult({ results: [result('um hello'), result('was')] })
    expect(snap().transcript).toBe('was')
  })

  it('полное попадание при «дальше само» — переход через 2.4 с', async () => {
    const { drill, snap } = setup({ settings: { auto: true } })
    drill.setMode('gap')
    drill.startAttempt('speech')
    await flush()
    FakeSR.last.onstart()
    FakeSR.last.onresult({ results: [result('was')] })
    drill.finishSpeaking()
    FakeSR.last.onend()
    expect(snap().autoPending).toBe(true)
    await vi.advanceTimersByTimeAsync(2400)
    expect(snap()).toMatchObject({ idx: 1, gap: 2, result: null })
  })

  it('отказы микрофона и распознавателя — ключи прототипа', async () => {
    const noSR = setup({ env: { SpeechRecognition: () => null } })
    noSR.drill.setMode('gap')
    noSR.drill.startAttempt('speech')
    // «Повторить» без распознавания упёрся бы в то же самое — только ручной путь.
    expect(noSR.snap().notice).toEqual({ key: 'noSR', actions: ['manual'] })

    const denied = setup({ env: { getUserMedia: () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })) } })
    denied.drill.setMode('gap')
    denied.drill.startAttempt('speech')
    await flush()
    expect(denied.snap().notice.key).toBe('denied')

    const net = setup()
    net.drill.setMode('gap')
    net.drill.startAttempt('speech')
    await flush()
    FakeSR.last.onerror({ error: 'network' })
    expect(net.snap()).toMatchObject({ busy: false, notice: { key: 'network', actions: ['retry', 'manual'] } })

    expect([micErrorKey('NotFoundError'), micErrorKey('Weird')]).toEqual(['noDevice', 'micFailed'])
    expect(['no-speech', 'audio-capture', 'aborted'].map(recognitionErrorKey)).toEqual(['noSpeech', 'noDevice', 'micFailed'])
  })

  it('слушать нечем — снимок знает это до нажатия', () => {
    expect(setup().snap().canListen).toBe(true)
    expect(setup({ env: { SpeechRecognition: () => null } }).snap().canListen).toBe(false)
    expect(setup({ env: { hasMic: () => false } }).snap().canListen).toBe(false)
  })

  it('«без микрофона» из уведомления у пропуска — показать ответ', () => {
    const { drill, snap } = setup({ env: { SpeechRecognition: () => null } })
    drill.setMode('gap')
    drill.startAttempt('speech')
    drill.fallbackManual()
    expect(snap().result).toMatchObject({ kind: 'manual' })
  })
})

describe('письмо', () => {
  it('пустое поле — просьба написать, ответ — проверка по полям, навык — один раз', () => {
    const { drill, snap } = setup()
    drill.setMode('write')
    expect(drill.checkWritten(['', 'been'])).toBe(0)
    expect(snap().notice.key).toBe('needsAnswer')
    expect(drill.checkWritten(['were', 'been'])).toBe(-1)
    expect(snap().result).toMatchObject({ kind: 'written', score: { hits: 2, total: 2 }, revealed: false })
    expect(drill.onWrittenChecked).toHaveBeenCalledWith(true)
    drill.checkWritten(['was', 'been'])
    expect(drill.onWrittenChecked).toHaveBeenCalledTimes(1)
  })

  it('«показать ответ» — ни одного попадания', () => {
    const { drill, snap } = setup()
    drill.setMode('fix')
    drill.checkWritten([''], true)
    expect(snap().result).toMatchObject({ revealed: true, score: { hits: 0, total: 1 } })
  })
})

describe('итог сессии', () => {
  it('после последнего задания — итог; «трудных» нет — так и говорим', () => {
    const scores = {}
    const { drill, snap, s } = setup({ settings: { limit: 10 }, scores })
    const key = 'practice-v4-repeat-3-A1'
    for (const it of drill.available) scores[key] = { ...(scores[key] || {}), [it.id]: { done: true, kind: 'speech', hits: 3, total: 3 } }
    expect(s.limit).toBe(10)
    for (let i = 0; i < 10; i++) drill.next()
    expect(snap().phase).toBe('summary')
    drill.tricky()
    expect(snap().notice.key).toBe('allDone')
  })

  it('«трудные» — не пройденные и пройденные самопроверкой', () => {
    const { drill, snap } = setup({ settings: { limit: 10 } })
    drill.startAttempt('manual')
    drill.finishManual('manual')
    drill.tricky()
    expect(snap().count).toBe(29) // самопроверка — тоже «трудное», остальные не тронуты
  })
})

describe('бит и темп', () => {
  // В прототипе тумблер показывал, звучит ли бит сейчас, и в покое писал
  // «выключен» при включённой настройке. Теперь тумблер — сама настройка.
  it('тумблер бита — настройка: в покое ничего не запускает, работает только в ритме', () => {
    const { drill, beat, s } = setup()
    drill.setMode('write')
    drill.toggleBeat()
    expect(s.beat).toBe(true)
    drill.setMode('repeat')
    drill.toggleBeat()
    expect(s.beat).toBe(false)
    expect(beat.running).toBe(false)
    drill.toggleBeat()
    expect(s.beat).toBe(true)
    expect(beat.running).toBe(false)
  })

  it('посреди попытки тумблер глушит и включает бит сразу, попытка идёт дальше', async () => {
    const { drill, beat, snap, s } = setup()
    drill.startAttempt('manual')
    await flush()
    expect(beat).toMatchObject({ running: true, audible: true })
    drill.toggleBeat()
    expect(beat).toMatchObject({ running: true, audible: false })
    expect(snap()).toMatchObject({ busy: true, phase: 'listening' })
    drill.toggleBeat()
    expect(beat.audible).toBe(true)
    expect(s.beat).toBe(true)
  })

  it('выключенный бит — попытка идёт на беззвучных часах', async () => {
    const { drill, beat } = setup({ settings: { beat: false } })
    drill.startAttempt('manual')
    await flush()
    expect(beat).toMatchObject({ running: true, audible: false })
  })

  it('послушать бит заранее — отдельная кнопка: крутится до второго нажатия, в попытке молчит', () => {
    const { drill, beat, snap, s } = setup({ settings: { beat: false } })
    drill.togglePreview()
    expect(beat).toMatchObject({ running: true, audible: true }) // слышно и при выключенной настройке
    expect(snap().previewing).toBe(true)
    expect(beat.wake).toHaveBeenCalled()
    drill.togglePreview()
    expect(beat.running).toBe(false)
    expect(snap().previewing).toBe(false)
    expect(s.beat).toBe(false) // предпрослушка настройку не трогает

    drill.startAttempt('manual')
    drill.togglePreview()
    expect(snap()).toMatchObject({ busy: true, previewing: false })
    drill.abort()
    drill.setMode('gap')
    drill.togglePreview()
    expect(beat.running).toBe(false)
  })

  it('темп на холостом бите ждёт такта, вне бита — сразу', () => {
    const { drill, beat, snap } = setup()
    drill.setTempo(110)
    expect(beat.bpm).toBe(110)
    drill.togglePreview()
    drill.setTempo(80)
    expect(beat.pending).toBe(80)
    expect(snap().tempoPending).toBe(true)
    beat.onTempoApplied()
    expect(snap().tempoPending).toBe(false)
  })
})

describe('после ревью', () => {
  it('запись не встала в буфер — «голос не загрузился», а не вечное «Слушай»', async () => {
    const clips = { ...fakeClips(), play: vi.fn(() => false) }
    const { drill, snap, beat } = setup({ clips })
    drill.startAttempt('manual')
    await flush()
    expect(snap()).toMatchObject({ busy: false, phase: 'ready', notice: { key: 'voiceUnavailable' } })
    expect(beat.running).toBe(false)
  })

  it('«показать ответ» у пропуска переводит ввод в ручной — «ещё раз» без микрофона', async () => {
    const { drill, snap } = setup()
    drill.setMode('gap')
    drill.startAttempt('speech')
    await flush()
    drill.abort()
    expect(snap().input).toBe('speech')
    drill.reveal()
    expect(snap()).toMatchObject({ input: 'manual', result: { kind: 'manual' } })
  })

  it('набор «отмеченные» перестраивается, если звёздочки поменялись в таблице', () => {
    const saved = { go: true }
    const s = { practiceLevel: 'all', formCount: 3, set: 'saved', limit: 0, beat: true, bpm: 96, auto: false }
    const drill = new VerbDrill({
      data: DATA,
      beat: fakeBeat(),
      clips: fakeClips(),
      getSettings: () => s,
      saveSettings: (p) => Object.assign(s, p),
      getSaved: () => saved,
      getScores: () => ({}),
      persist: () => {},
      env: { raf: () => 0, caf: () => {} },
    })
    expect(drill.getSnapshot().count).toBe(1)
    saved.be = true
    drill.cleanup() // уход в таблицу и обратно
    expect(drill.getSnapshot().count).toBe(2)
  })

  it('подпись «новый темп» не переживает остановку бита', () => {
    const { drill, snap } = setup()
    drill.togglePreview()
    drill.setTempo(80)
    expect(snap().tempoPending).toBe(true)
    drill.togglePreview()
    expect(snap().tempoPending).toBe(false)
  })
})
