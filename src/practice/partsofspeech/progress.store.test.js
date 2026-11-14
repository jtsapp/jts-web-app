// @vitest-environment jsdom
//
// Хранилище прогресса Parts of Speech World: запись → чтение, копия для движка,
// сведение записи движка с хранилищем, сброс «Replay this quest» и забитый
// localStorage (под входом его съедает кэш каталогов, см. progressQuota.test.js).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PARTSOFSPEECH_KEY } from '../practiceKeys.js'
import { readPartsOfSpeech, savePartsOfSpeech, writePartsOfSpeech } from './progress.js'

const EMPTY = { acts: {}, cases: {}, clues: {}, seen: {} }
const CLOSED = { done: [0, 1, 2, 3], first: { 0: [9, 10] }, complete: true }

beforeEach(() => {
  localStorage.clear()
  writePartsOfSpeech(EMPTY)
})
afterEach(() => vi.restoreAllMocks())

describe('хранилище Parts of Speech World', () => {
  it('пустое хранилище читается как пустой прогресс', () => {
    expect(readPartsOfSpeech()).toEqual(EMPTY)
  })

  it('записанное читается обратно и лежит под своим ключом', () => {
    writePartsOfSpeech({ ...EMPTY, acts: { u01a1: { score: 6, total: 8 } }, cases: { c01: CLOSED } })
    expect(readPartsOfSpeech().acts.u01a1).toEqual({ score: 6, total: 8 })
    expect(JSON.parse(localStorage.getItem(PARTSOFSPEECH_KEY))).toEqual(readPartsOfSpeech())
  })

  it('read отдаёт копию: движок меняет её, не трогая память', () => {
    writePartsOfSpeech({ ...EMPTY, cases: { c01: CLOSED } })
    const s = readPartsOfSpeech()
    s.cases.c01.done.push(9)
    s.acts.u01a1 = { score: 1, total: 1 }
    expect(readPartsOfSpeech()).toEqual({ ...EMPTY, cases: { c01: CLOSED } })
  })

  it('запись движка сводится с хранилищем: снимок сервера посреди урока не затирается старой копией', () => {
    // движок прочитал прогресс при входе в урок (пусто), потом пришёл снимок сервера с другого устройства
    writePartsOfSpeech({ ...EMPTY, acts: { u05a1: { score: 5, total: 5 } }, cases: { c01: CLOSED } })
    savePartsOfSpeech({ ...EMPTY, acts: { u01a1: { score: 3, total: 8 } }, cases: { c01: { done: [0], first: {}, complete: false } } })
    expect(readPartsOfSpeech()).toEqual({ ...EMPTY, acts: { u05a1: { score: 5, total: 5 }, u01a1: { score: 3, total: 8 } }, cases: { c01: CLOSED } })
  })

  it('«Replay this quest»: сброшенное дело не возвращается сведением, остальное на месте', () => {
    writePartsOfSpeech({ ...EMPTY, cases: { c01: CLOSED, c02: CLOSED }, clues: { c01: [0] } })
    savePartsOfSpeech({ ...EMPTY, cases: { c01: { done: [], first: {}, complete: false }, c02: CLOSED } }, 'c01')
    expect(readPartsOfSpeech()).toEqual({ ...EMPTY, cases: { c02: CLOSED }, clues: { c01: [0] } })
  })

  it('забитый localStorage не прячет пройденное', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    savePartsOfSpeech({ ...EMPTY, acts: { u01a1: { score: 1, total: 8 } } })
    savePartsOfSpeech({ ...EMPTY, acts: { u01a2: { score: 2, total: 6 } } })
    expect(Object.keys(readPartsOfSpeech().acts)).toEqual(['u01a1', 'u01a2'])
  })
})
