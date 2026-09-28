import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EXAM_CODE,
  answeredCount,
  examQuestions,
  loadLevelExam,
  optionOrder,
  scoreExam,
  sectionQuestions,
} from './levelExam.js'

// fileURLToPath, а не .pathname: на Windows тот отдаёт '/C:/…'.
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const LEVELS = fs.readdirSync(path.join(ROOT, 'public/exam')).filter((d) => fs.existsSync(path.join(ROOT, 'public/exam', d, 'exam.json')))
const examOf = (level) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public/exam', level, 'exam.json'), 'utf8'))
const oracleOf = (level) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/learning/__fixtures__', `level-exam-oracle-${level}.json`), 'utf8'))

describe('levelExam — выгрузка', () => {
  it('экзамены есть у A0, A1, A2, B2', () => {
    expect(LEVELS).toEqual(['a0', 'a1', 'a2', 'b2'])
    expect(EXAM_CODE).toBe('EXAM')
  })

  // Синтеза на экране нет: запись не загрузилась — «Повторить». Значит, файл
  // обязан быть у каждой записи, иначе раздел аудирования немой.
  it.each(LEVELS)('%s: у каждой записи аудирования есть mp3', (level) => {
    const listening = examOf(level).sections.find((s) => s.key === 'listening')
    for (const p of listening.passages) {
      const file = path.join(ROOT, 'public/exam', level, 'audio', p.audio)
      expect(fs.existsSync(file), `${level}/${p.id}: нет ${p.audio} — node scripts/voice-level-exams.js`).toBe(true)
      expect(fs.statSync(file).size).toBeGreaterThan(10_000)
    }
  })
})

describe('levelExam — счёт совпадает с прототипом (оракул)', () => {
  for (const level of LEVELS) {
    it(`${level}: все наборы ответов`, () => {
      const exam = examOf(level)
      const oracle = oracleOf(level)
      // Оракул снят с того же экзамена: иначе сверяли бы с чужими вопросами.
      expect(oracle.version).toBe(exam.version)
      for (const c of oracle.cases) {
        const got = scoreExam(exam, c.answers)
        const skills = Object.fromEntries(got.skills.map((s) => [s.key, [s.correct, s.total]]))
        const weak = got.skills.filter((s) => s.weak).map((s) => s.key)
        expect({ correct: got.correct, pct: got.pct, passed: got.passed, skills, weak }, c.name).toEqual(c.expect)
      }
    })
  }
})

describe('levelExam — вопросы и ответы', () => {
  const exam = examOf('a1')

  it('сквозная нумерация 1…50 в порядке прототипа: диалог, вопросы, тексты, записи', () => {
    const qs = examQuestions(exam)
    expect(qs.map((q) => q.num)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
    expect(qs[0].id).toBe('gd1')
    expect(qs[8].section).toBe('grammar')
    expect(qs[20].id).toBe('vd1')
    expect(qs[30].id).toBe('r1q1')
    expect(qs[40].id).toBe('l1q1')
    expect(sectionQuestions(exam.sections[0])).toHaveLength(20)
  })

  it('answeredCount считает только целые индексы', () => {
    expect(answeredCount(exam, {})).toBe(0)
    expect(answeredCount(exam, { gd1: 0, gd2: 2, g6: null, v1: 'x', nope: 1 })).toBe(2)
  })

  it('без ответов — ноль и провал, у каждого навыка «повторить»', () => {
    const s = scoreExam(exam, {})
    expect(s).toMatchObject({ correct: 0, total: 50, pct: 0, passed: false })
    expect(s.skills.every((k) => k.weak)).toBe(true)
  })
})

describe('levelExam — порядок вариантов', () => {
  it('перестановка исходных индексов, стабильна, True/False не трогает', () => {
    for (const level of LEVELS) {
      for (const q of examQuestions(examOf(level))) {
        const order = optionOrder(level, q)
        expect([...order].sort()).toEqual(q.options.map((_, i) => i))
        expect(optionOrder(level.toUpperCase(), q)).toEqual(order)
        if (q.tf) expect(order).toEqual([0, 1])
      }
    }
  })

  // В исходниках верный ответ «Слов» у A1/A2 — всегда первый вариант, в
  // аудировании девять из десяти — второй. После перемешивания ни в одном
  // разделе позиция не должна выдавать ответ.
  it.each(LEVELS)('%s: верный ответ не собирается в одной позиции', (level) => {
    for (const section of examOf(level).sections) {
      const qs = sectionQuestions(section).filter((q) => !q.tf)
      if (qs.length < 6) continue
      const at = [0, 0, 0]
      for (const q of qs) at[optionOrder(level, q).indexOf(q.answer)]++
      expect(Math.max(...at) / qs.length, `${level}/${section.key}: ${at.join('/')}`).toBeLessThanOrEqual(0.7)
    }
  })
})

describe('loadLevelExam', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('404 — null и запоминается; сбой сети и 5xx — null, но повторяется', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 404, json: async () => null }))
    vi.stubGlobal('fetch', fetch)
    expect(await loadLevelExam('zz')).toBe(null)
    expect(await loadLevelExam('ZZ')).toBe(null)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/exam/zz/exam.json')

    const flaky = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', flaky)
    expect(await loadLevelExam('yy')).toBe(null)
    expect(await loadLevelExam('yy')).toBe(null)
    expect(flaky).toHaveBeenCalledTimes(2)

    const badGateway = vi.fn(async () => ({ ok: false, status: 502, json: async () => null }))
    vi.stubGlobal('fetch', badGateway)
    expect(await loadLevelExam('ww')).toBe(null)
    expect(await loadLevelExam('ww')).toBe(null)
    expect(badGateway).toHaveBeenCalledTimes(2)
  })

  it('битый файл без sections — null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ level: 'xx' }) })))
    expect(await loadLevelExam('xx')).toBe(null)
    expect(await loadLevelExam('')).toBe(null)
  })
})
