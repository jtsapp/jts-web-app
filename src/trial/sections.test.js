// Сценарий урока проверяем на настоящем банке заданий: ветвление зависит от
// того, что в банке реально есть (записи уроков, задания uoe2), и на выдуманных
// данных тест доказывал бы только сам себя.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { Session, mergeBank2 } from '../practice/placement/engine.generated.js'
import * as sections from './sections.js'
import { READING, VOCAB_MATCH } from './content.generated.js'

const BANK_PATH = new URL('../../public/practice/placement/bank.json', import.meta.url).pathname

let data

beforeAll(() => {
  data = JSON.parse(readFileSync(BANK_PATH, 'utf8'))
  mergeBank2(data.bank, data.manifest, data.bank2)
})

/** Сессия с фиксированным сидом: выбор заданий обязан быть воспроизводимым. */
const session = (startCando, seed = 12345) => {
  const s = new Session(data.bank, data.manifest, seed, 'express')
  s.setCanDo(startCando)
  return s
}

describe('порядок блоков урока', () => {
  it('Beginner получает мини-урок TO BE вместо интерактивной грамматики', () => {
    expect(sections.trialPlan(sections.BEGINNER)).toContain('tobe')
    expect(sections.trialPlan(sections.BEGINNER)).not.toContain('uoe2')
  })

  it('остальные — интерактивную грамматику', () => {
    for (const start of [sections.ELEMENTARY, sections.INTERMEDIATE]) {
      expect(sections.trialPlan(start)).toContain('uoe2')
      expect(sections.trialPlan(start)).not.toContain('tobe')
    }
  })

  it('порядок блоков одинаков для всех стартов', () => {
    const shape = (start) => sections.trialPlan(start).map((k) => (k === 'tobe' ? 'grammar' : k === 'uoe2' ? 'grammar' : k))
    expect(shape(sections.BEGINNER)).toEqual(shape(sections.ELEMENTARY))
  })
})

describe('разминка', () => {
  it('Beginner: шесть заданий, три из них — облегчённые A1', () => {
    const { items } = sections.buildRouting(session(sections.BEGINNER), sections.BEGINNER)
    expect(items).toHaveLength(6)
    expect(items.filter((it) => it.id.startsWith('tr-r-a1-'))).toHaveLength(3)
    expect(items.every((it) => it.block === 'routing')).toBe(true)
  })

  it('остальные идут по лестнице движка', () => {
    const s = session(sections.ELEMENTARY)
    const { items } = sections.buildRouting(s, sections.ELEMENTARY)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((it) => it.block === 'routing')).toBe(true)
    // Синтетических A1-заданий здесь быть не должно — это набор Beginner.
    expect(items.some((it) => it.id.startsWith('tr-r-a1-'))).toBe(false)
  })
})

describe('A0-мост кликами', () => {
  it('в вариантах есть правильный ответ и три отвлекающих', () => {
    const { items } = sections.buildA0Bridge(session(sections.BEGINNER))
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.a0options).toHaveLength(4)
      const correct = item.answer.map((a) => a.toLowerCase())
      expect(item.a0options.filter((w) => correct.includes(w.toLowerCase())).length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('словарь', () => {
  it('Beginner — простые слова, Int–Upper — идиомы', () => {
    expect(sections.buildVocabMatch(session(sections.BEGINNER), sections.BEGINNER).items[0].level).toBe('A1')
    expect(sections.buildVocabMatch(session(sections.INTERMEDIATE), sections.INTERMEDIATE).items[0].level).toBe('B2')
  })

  it('в середине набор берётся по оценке движка, но не выходит за A2/B1', () => {
    const built = sections.buildVocabMatch(session(sections.ELEMENTARY), sections.ELEMENTARY)
    expect(['A2', 'B1']).toContain(built.items[0].level)
    expect(built.items[0].pairs).toEqual(VOCAB_MATCH[built.items[0].level].pairs)
  })
})

describe('чтение', () => {
  it('Elementary читает то, что выбрал преподаватель', () => {
    const s = session(sections.ELEMENTARY)
    expect(sections.readingLevels(s, sections.ELEMENTARY, ['A2', 'B1'])).toEqual(['A2', 'B1'])
    expect(sections.readingLevels(s, sections.ELEMENTARY, [])).toEqual([])
  })

  it('Int–Upper всегда читает текст B2', () => {
    expect(sections.readingLevels(session(sections.INTERMEDIATE), sections.INTERMEDIATE)).toEqual(['B2'])
  })

  it('вопросы текста доезжают целиком', () => {
    const built = sections.buildReading('B2')
    expect(built.items).toHaveLength(READING.B2.qs.length)
    expect(built.text).toBe(READING.B2.text)
    expect(built.items.every((it) => it.block === 'reading' && it.options.length > 1)).toBe(true)
  })
})

describe('аудирование', () => {
  it('Elementary слушает записи присланных уроков', () => {
    const ids = sections.listeningSources(session(sections.ELEMENTARY), data.manifest, sections.ELEMENTARY)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((id) => /^src-l-a[12]-/.test(id))).toBe(true)
  })

  it('Int–Upper — записи b1/b2', () => {
    const ids = sections.listeningSources(session(sections.INTERMEDIATE), data.manifest, sections.INTERMEDIATE)
    expect(ids.every((id) => /^src-l-b[12]-/.test(id))).toBe(true)
  })

  it('к каждой записи собираются её вопросы', () => {
    const s = session(sections.ELEMENTARY)
    const built = sections.buildListening(s, data.manifest, sections.ELEMENTARY)
    expect(built.groups.length).toBeGreaterThan(0)
    for (const g of built.groups) {
      expect(g.items.length).toBeGreaterThan(0)
      expect(g.items.every((q) => q.source === g.src.id)).toBe(true)
    }
  })
})

describe('видео с пропусками', () => {
  it('Int–Upper получает сложные клипы, остальные — простые', () => {
    expect(sections.buildClips(sections.INTERMEDIATE).items.map((i) => i.id)).toEqual(['vf-clip5', 'vf-clip7'])
    expect(sections.buildClips(sections.BEGINNER).items.map((i) => i.id)).toEqual(['vf-clip1', 'vf-clip2'])
  })

  it('каждый клип — задание с банком слов и файлом', () => {
    for (const item of sections.buildClips(sections.ELEMENTARY).items) {
      expect(item.type).toBe('bankfill')
      expect(item.file).toMatch(/^clips\//)
      expect(item.bankWords.length).toBeGreaterThanOrEqual(item.answers.length)
    }
  })
})

describe('грамматика кликами', () => {
  it('печатать ничего не нужно — только order/bankfill/match', () => {
    const built = sections.buildGrammar2(session(sections.ELEMENTARY))
    expect(built.items.length).toBeGreaterThan(0)
    expect(built.items.every((it) => ['order', 'bankfill', 'match'].includes(it.type))).toBe(true)
  })
})
