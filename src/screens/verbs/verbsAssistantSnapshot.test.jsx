// @vitest-environment jsdom
// Что про ответ в «Неправильных глаголах» узнаёт помощник по сайту (снимок экрана). Разбор и так пишет верные формы,
// но строкой «↻ Попробовать ещё · was / were» без метки поля — ключ «V2 → was / were» приходит только после проверки
// с ошибкой; до неё и после «Показать ответ» его нет. Попытка — настоящая машина VerbDrill на фейковых часах бита,
// записях и распознавателе (как в practice/verbs/drill.test.js).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, act, within } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { VerbDrill } from '../../practice/verbs/drill.js'
import { nextEntry } from '../../practice/verbs/engine.js'
import { snapshotScreen } from '../../lib/assistant/screenSnapshot.js'
import VerbsPractice from './VerbsPractice.jsx'

const DATA = JSON.parse(readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'practice', 'verbs', 'verbs.json'), 'utf8'))
const EXPECTED = 'верный ответ по заданию'

// Часы бита двигает тест — как в drill.test.js.
function fakeBeat() {
  return {
    t: 0,
    bpm: 96,
    running: false,
    audible: false,
    events: [],
    now() {
      return this.t
    },
    wake: vi.fn(),
    init: () => true,
    start(audible, bpm) {
      this.running = true
      if (bpm) this.bpm = bpm
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
    duck() {},
    click() {},
    nextBar() {
      const bar = 240 / this.bpm
      return Math.ceil((this.t + 0.1) / bar) * bar
    },
    at(time, fn) {
      this.events.push({ time, fn })
      this.events.sort((a, b) => a.time - b.time)
    },
  }
}

const fakeClips = () => ({ ensure: vi.fn(() => Promise.resolve()), play: vi.fn(() => true), stop: vi.fn(), prefetch: vi.fn(), setVolume: vi.fn() })

class FakeSR {
  static last = null
  constructor() {
    FakeSR.last = this
  }
  start() {}
  stop() {}
  abort() {}
}

const srResult = (text) => {
  const r = [{ transcript: text }]
  r.isFinal = true
  return r
}

function mount(mode) {
  const s = { practiceLevel: 'A1', formCount: 3, set: 'all', limit: 0, beat: true, bpm: 96, volume: 45, tutor: 90, auto: false }
  const store = {}
  const drill = new VerbDrill({
    data: DATA,
    beat: fakeBeat(),
    clips: fakeClips(),
    getSettings: () => s,
    saveSettings: (patch) => Object.assign(s, patch),
    getSaved: () => ({}),
    getScores: (key) => store[key] || {},
    persist: (key, id, r) => {
      store[key] = { ...(store[key] || {}), [id]: nextEntry((store[key] || {})[id], r) }
    },
    onWrittenChecked: vi.fn(),
    env: {
      SpeechRecognition: () => FakeSR,
      hasMic: () => true,
      getUserMedia: vi.fn(() => Promise.resolve({ getTracks: () => [{ stop() {} }] })),
      raf: () => 0,
      caf: () => {},
    },
  })
  drill.setMode(mode)
  const utils = render(
    <I18nProvider>
      <VerbsPractice drill={drill} data={DATA} settings={s} saved={{}} lang="ru" token="" onGoTable={() => {}} onResetProgress={() => {}} />
    </I18nProvider>,
  )
  return { ...utils, drill }
}

const snap = (utils) => snapshotScreen(utils.container)
const button = (utils, name) => within(utils.container.querySelector('.vb-practice')).getByRole('button', { name })

function write(utils, values) {
  const inputs = utils.container.querySelectorAll('input.vb-answer')
  values.forEach((v, i) => fireEvent.change(inputs[i], { target: { value: v } }))
  fireEvent.click(button(utils, /^Проверить$/))
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('«Глаголы», письмо: ключ — только после проверки с ошибкой', () => {
  it('три формы be: до проверки ключа нет, после ошибки — обе формы с метками', () => {
    const utils = mount('write')
    expect(utils.drill.getSnapshot().verb.v1).toBe('be')
    expect(snap(utils)).not.toContain(EXPECTED)

    write(utils, ['was', 'beed'])
    const text = snap(utils)
    expect(text).toContain('ученик ввёл «beed» (отмечено как неверное)')
    expect(text).toContain(`[${EXPECTED}: «V2 → was / were; V3 → been»]`)
  })

  it('верный ответ ключа не несёт', () => {
    const utils = mount('write')
    write(utils, ['were', 'been'])
    expect(snap(utils)).not.toContain(EXPECTED)
  })

  it('«Показать ответ» — самопроверка: ключа нет', () => {
    const utils = mount('write')
    fireEvent.click(button(utils, /Показать ответ/))
    expect(utils.drill.getSnapshot().result).toMatchObject({ revealed: true })
    expect(snap(utils)).not.toContain(EXPECTED)
  })

  it('исправление ошибки: одно поле, ключ — слово задания', () => {
    const utils = mount('fix')
    const item = utils.drill.getSnapshot().item
    write(utils, ['zzz'])
    expect(snap(utils)).toContain(`[${EXPECTED}: «V${item.form + 1} → ${item.answer}»]`)
  })
})

describe('«Глаголы», пропуск голосом: ключ — когда форма не распознана', () => {
  async function say(utils, text) {
    act(() => utils.drill.startAttempt('speech'))
    await act(() => vi.advanceTimersByTimeAsync(0))
    const rec = FakeSR.last
    act(() => rec.onstart())
    act(() => rec.onresult({ results: [srResult(text)] }))
    act(() => utils.drill.finishSpeaking())
    act(() => rec.onend())
  }

  it('до попытки ключа нет; «went» вместо was — ключ «V2 → was / were»', async () => {
    const utils = mount('gap')
    expect(snap(utils)).not.toContain(EXPECTED)
    await say(utils, 'went')
    expect(utils.drill.getSnapshot().result).toMatchObject({ kind: 'speech', score: { hits: 0, total: 1 } })
    expect(snap(utils)).toContain(`[${EXPECTED}: «V2 → was / were»]`)
  })

  it('распознанная форма ключа не несёт', async () => {
    const utils = mount('gap')
    await say(utils, 'was')
    expect(utils.drill.getSnapshot().result).toMatchObject({ kind: 'speech', score: { hits: 1, total: 1 } })
    expect(snap(utils)).not.toContain(EXPECTED)
  })

  it('«Показать ответ» у пропуска — самопроверка, ключа нет', () => {
    const utils = mount('gap')
    act(() => utils.drill.reveal())
    expect(utils.drill.getSnapshot().result).toMatchObject({ kind: 'manual' })
    expect(snap(utils)).not.toContain(EXPECTED)
  })
})
