// Инварианты экстрактора Writing: срез по маркерам жив, данные полные,
// повторный прогон детерминирован. Падение здесь = кто-то пере-экспортировал
// прототип и структура уехала — чинить надо экстрактор, а не замалчивать.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { slicePrototype, evalPrototype, validate, LEVELS, SEEDS_PER_LEVEL, BANK_KEYS, DEFAULT_SRC } from './extract-writing.js'

const html = fs.readFileSync(DEFAULT_SRC, 'utf8')

describe('extract-writing', () => {
  it('срез находит маркеры и не содержит DOM-кода', () => {
    const { data, engine } = slicePrototype(html)
    expect(data.length).toBeGreaterThan(100000)
    expect(engine).toContain('function hashStr')
    expect(engine).toContain('function shuffle')
    // Языковый DOM-блок вырезан
    expect(data).not.toContain('MutationObserver')
    expect(data).not.toContain('langBuildDict')
  })

  it('данные полные: 6 уровней × 30 жанров, банки, тройки en/ru/kk', () => {
    const sandbox = evalPrototype(html)
    expect(validate(sandbox)).toBe(LEVELS.length * SEEDS_PER_LEVEL)
    for (const level of LEVELS) {
      for (const key of BANK_KEYS) expect(sandbox.BANKS[level][key]).toBeDefined()
    }
  })

  it('повторное исполнение детерминировано байт-в-байт', () => {
    const a = evalPrototype(html)
    const b = evalPrototype(html)
    expect(JSON.stringify(a.SEEDS)).toBe(JSON.stringify(b.SEEDS))
    expect(JSON.stringify(a.BANKS)).toBe(JSON.stringify(b.BANKS))
    // и прототипный buildGenre тоже (seeded rng, без Math.random)
    const ga = a.buildGenre(a.SEEDS.b1[0], a.BANKS.b1)
    const gb = b.buildGenre(b.SEEDS.b1[0], b.BANKS.b1)
    expect(JSON.stringify(ga)).toBe(JSON.stringify(gb))
  })

  it('buildGenre прототипа собирает 11 заданий с фиксированными id', () => {
    const sandbox = evalPrototype(html)
    for (const level of LEVELS) {
      const g = sandbox.buildGenre(sandbox.SEEDS[level][0], sandbox.BANKS[level])
      expect(g.tasks.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11'])
    }
  })
})
