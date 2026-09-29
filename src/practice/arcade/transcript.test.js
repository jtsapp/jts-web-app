import { afterEach, describe, expect, it } from 'vitest'
import { startTranscript } from './transcript.js'
import { createVoiceActivity } from './voiceActivity.js'
import { advance, initialState } from './engine.js'

// Порт javaTest tests/transcript.test.ts: что считается речью, как копится
// стенограмма и как ведёт себя распознаватель в браузере.

// Накопительный список результатов одной сессии, как его шлёт Chrome.
const event = (resultIndex, ...results) => ({
  resultIndex,
  results: results.map(([transcript, isFinal, confidence]) => ({ isFinal, 0: { transcript, confidence } })),
})
const texts = (t) => t.segments.filter((s) => s.tokens.length).map((s) => s.text)
const shape = (t) => t.segments.map((s) => [s.kind, s.start, s.end, s.text])

// Протяжный гласный держит высоту, громкость и тембр; речь меняет их каждый кадр.
const flat = new Float32Array(16)
const held = () => ({ volume: 0.05, pitch: 120, clarity: 0.95, spectrum: flat })
let syllable = 0
const talking = () => ({
  volume: 0.05,
  pitch: 120 + (syllable++ % 2) * 40,
  clarity: 0.95,
  spectrum: Float32Array.from({ length: 16 }, (_, b) => ((b + syllable) % 3 ? 8 : -8)),
})

// Подставной распознаватель: пишет вызовы и даёт тесту стрелять его событиями.
// Как Chrome, сразу сообщает о старте; `silent` — как Opera GX: start()
// принимает, а дальше ни события, ни ошибки.
function recogniser({ silent = false } = {}) {
  const calls = []
  const instances = []
  class FakeRecognition {
    continuous = false
    interimResults = false
    lang = ''
    onstart = null
    onresult = null
    onerror = null
    onend = null
    constructor() {
      instances.push(this)
    }
    start() {
      calls.push('start')
      if (!silent) this.onstart?.()
    }
    stop() {
      calls.push('stop')
    }
    abort() {
      calls.push('abort')
    }
  }
  return { calls, instances, FakeRecognition }
}

const NAMES = ['SpeechRecognition', 'webkitSpeechRecognition']
function install(name, value) {
  for (const n of NAMES) delete globalThis[n]
  if (value) globalThis[name] = value
}
afterEach(() => install(null, undefined))

// Сессия на поддельных часах; `at` — один кадр порога громкости.
function session(onChange = () => {}, options) {
  const r = recogniser(options)
  install('SpeechRecognition', r.FakeRecognition)
  let clock = 0
  const notes = []
  const speech = startTranscript(onChange, (code) => notes.push(code), () => clock)
  return {
    speech,
    calls: r.calls,
    rec: r.instances[0],
    notes: () => notes,
    tick: (ms) => (clock = ms),
    at(ms, voiced, features) {
      clock = ms
      return speech.sample(voiced, ms, features)
    },
  }
}

describe('arcade transcript', () => {
  it('мычание — не речь, распознанные слова — речь, и их задержка прощается', () => {
    const s = session()
    // Первому голосу раунда верим START_GRACE, пока ждём слова.
    expect(s.at(0, true)).toBe(true)
    expect(s.at(1900, true)).toBe(true)
    expect(s.at(2100, true)).toBe(false)
    // Тишина, потом новое мычание: слов до него не было — и доверия нет.
    expect(s.at(3000, false)).toBe(false)
    expect(s.at(3500, true)).toBe(false)
    // Слова пришли и держат WORD_HOLD после последнего обновления.
    s.tick(3800)
    s.rec.onresult(event(0, ['I grew up', false]))
    expect(s.at(3900, true)).toBe(true)
    expect(s.at(4900, true)).toBe(true)
    expect(s.at(5100, true)).toBe(false)
    // Вдох, снова голос: в прошлом отрезке были слова — начало засчитано.
    expect(s.at(5300, false)).toBe(false)
    expect(s.at(5600, true)).toBe(true)
    expect(s.at(6300, true)).toBe(true)
    expect(s.at(6500, true)).toBe(false)
    // Распознавание отвалилось посреди раунда — остаётся порог громкости.
    s.rec.onerror({ error: 'network' })
    s.rec.onend()
    expect(s.notes()).toEqual(['network'])
    expect(s.at(6600, true)).toBe(true)
    expect(s.at(6700, false)).toBe(false)
  })

  it('«э-э-э» сразу после слов перестаёт считаться, пока не придут новые слова', () => {
    const s = session()
    for (let ms = 0; ms <= 900; ms += 50) s.at(ms, true, talking())
    s.tick(900)
    s.rec.onresult(event(0, ['I think', false]))
    expect(s.at(950, true, talking())).toBe(true)
    for (let ms = 1000; ms < 1400; ms += 50) s.at(ms, true, held())
    expect(s.speech.hesitating()).toBe(false)
    expect(s.at(1450, true, held())).toBe(false)
    expect(s.speech.hesitating()).toBe(true)
    for (let ms = 1500; ms < 2000; ms += 50) s.at(ms, true, held())
    s.at(2000, true, talking())
    expect(s.at(2100, true, talking())).toBe(false)
    expect(s.speech.hesitating()).toBe(false)
    s.tick(2200)
    s.rec.onresult(event(0, ['I think technology', false]))
    expect(s.at(2250, true, talking())).toBe(true)
    expect(s.at(3300, true, talking())).toBe(true)
    expect(s.at(3500, true, talking())).toBe(false)
  })

  it('лента делит один результат по его паузе — по времени прихода каждого слова', () => {
    let latest = null
    const s = session((t) => (latest = t))
    const voiced = (ms) => (ms >= 500 && ms < 2000) || (ms >= 3500 && ms < 5000)
    const words = {
      900: event(0, ['He said', false]),
      1600: event(0, ['He said that', false]),
      3900: event(0, ['He said that that he', false]),
      4600: event(0, ['He said that that he is smart.', false]),
      5200: event(0, ['He said that that he is smart.', true, 0.82]),
    }
    for (let ms = 0; ms < 6000; ms += 20) {
      s.at(ms, voiced(ms))
      if (words[ms]) s.rec.onresult(words[ms])
    }
    s.tick(6000)
    s.speech.stop()
    s.rec.onend()
    // Края порога поправлены на ONSET_MS и RELEASE_MS обратно к самому голосу.
    expect(shape(latest)).toEqual([
      ['PAUSE', 0, 0.44, ''],
      ['WORD', 0.44, 1.72, 'He said that'],
      ['PAUSE', 1.72, 3.44, ''],
      ['WORD', 3.44, 4.72, 'that he is smart.'],
      ['PAUSE', 4.72, 6, ''],
    ])
    expect(latest.utterances).toEqual([{ text: 'He said that that he is smart.', confidence: 0.82 }])
    expect(latest.segments[3].tokens[0].repetition).toBe(true)
  })

  it('после паузы браузера распознавание возобновляется, последние слова сохраняются', () => {
    let latest = null
    const s = session((t) => (latest = t))
    expect([s.rec.continuous, s.rec.interimResults, s.rec.lang]).toEqual([true, true, 'en-US'])
    s.tick(1000)
    s.rec.onresult(event(0, ['I grew up', false]))
    s.tick(2000)
    s.rec.onresult(event(0, ['I grew up by the sea.', true]))
    expect(texts(latest)).toEqual(['I grew up by the sea.'])
    s.rec.onerror({ error: 'no-speech' })
    s.rec.onend()
    expect(s.calls).toEqual(['start', 'start'])
    s.tick(4000)
    s.rec.onresult(event(0, ['It was', true], [' quiet', false]))
    s.tick(5000)
    s.speech.stop()
    s.rec.onend()
    expect(s.calls).toEqual(['start', 'start', 'stop'])
    expect(latest.utterances.map((u) => u.text)).toEqual(['I grew up by the sea.', 'It was', ' quiet'])
    expect(s.notes()).toEqual([])
  })

  it('нет распознавателя — null; запрет сообщается, а не перезапускается', () => {
    install(null, undefined)
    expect(startTranscript(() => {})).toBeNull()
    install('webkitSpeechRecognition', recogniser().FakeRecognition)
    expect(startTranscript(() => {})).not.toBeNull()
    let latest = null
    const s = session((t) => (latest = t))
    s.rec.onresult(event(0, ['maybe', false]))
    s.rec.onerror({ error: 'not-allowed' })
    s.rec.onend()
    expect(s.calls).toEqual(['start'])
    expect(s.notes()).toEqual(['blocked'])
    // Слова, услышанные до отказа, сохраняются.
    expect(latest.utterances.map((u) => u.text)).toEqual(['maybe'])
  })

  it('распознаватель молчит совсем (Opera GX): 2 с без старта — дальше решает порог громкости', () => {
    const s = session(() => {}, { silent: true })
    for (let ms = 0; ms < 2000; ms += 20) s.at(ms, true, talking())
    expect(s.notes()).toEqual([])
    for (let ms = 2000; ms <= 2100; ms += 20) s.at(ms, true, talking())
    expect(s.notes()).toEqual(['silent'])
    expect(s.calls).toEqual(['start', 'abort'])
    // Стартовая фора давно кончилась, а голос всё равно засчитан — по громкости.
    expect(s.at(3000, true, talking())).toBe(true)
    expect(s.at(3100, false)).toBe(false)
  })

  it('старт есть, а слов нет (пустые результаты): после 4 с голоса — порог громкости', () => {
    const s = session()
    for (let ms = 0; ms < 4000; ms += 20) {
      s.at(ms, true, talking())
      if (ms === 1000) s.rec.onresult(event(0, ['', true]))
    }
    expect(s.notes()).toEqual([])
    for (let ms = 4000; ms <= 4100; ms += 20) s.at(ms, true, talking())
    expect(s.notes()).toEqual(['silent'])
    expect(s.at(4200, true, talking())).toBe(true)
  })

  it('мычание без слов сторожа не будит: «э-э-э» не включает счёт по громкости', () => {
    const s = session()
    for (let ms = 0; ms < 10000; ms += 20) s.at(ms, true, held())
    expect(s.notes()).toEqual([])
    expect(s.at(10000, true, held())).toBe(false)
  })

  it('слова пришли хоть раз — сторож больше не вмешивается', () => {
    const s = session()
    s.tick(700)
    s.rec.onresult(event(0, ['Well', false]))
    for (let ms = 0; ms < 10000; ms += 20) s.at(ms, true, talking())
    expect(s.notes()).toEqual([])
  })

  it('уход со страницы обрывает распознавание и бросает неподтверждённое', () => {
    const seen = []
    const s = session((t) => seen.push(t))
    s.rec.onresult(event(0, ['maybe', false]))
    s.speech.abort()
    s.rec.onend()
    expect(s.calls).toEqual(['start', 'abort'])
    expect(seen.map((t) => t.utterances.length)).toEqual([0, 0])
  })

  it('долгое мычание доводит пилу до дерева, настоящие слова держат её вдали', () => {
    const hum = session()
    const detect = createVoiceActivity(0.002)
    let state = initialState()
    for (let ms = 0; ms < 15000; ms += 20) state = advance(state, hum.at(ms, detect(0.09, ms), held()), 0.02, 10)
    expect(state.danger).toBeGreaterThan(0.99999)
    expect(state.speaking).toBeLessThan(2.5)
    expect(state.silence).toBeGreaterThan(9.99)

    const talk = session()
    const detectTalk = createVoiceActivity(0.002)
    let words = ''
    state = initialState()
    for (let ms = 0; ms < 15000; ms += 20) {
      if (ms % 400 === 0) {
        talk.tick(ms)
        words += 'word '
        talk.rec.onresult(event(0, [words, false]))
      }
      state = advance(state, talk.at(ms, detectTalk(0.09, ms), talking()), 0.02, 10)
    }
    expect(state.danger).toBe(0)
    expect(state.speaking).toBeGreaterThan(14.5)
  })
})
