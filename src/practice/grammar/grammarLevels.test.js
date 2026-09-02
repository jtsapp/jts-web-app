// Витрина уровней «Грамматики» и раскладка уровня студента на код курса.
// Данные раздела — public/practice/grammar/, собираются scripts/extract-grammar.js
// из выгрузки курса; здесь проверяется только сам список и его соответствие
// реально лежащим на диске файлам, чтобы чип не вёл в пустой экран.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { GRAMMAR_LEVELS, levelToCourse } from './grammarData.js'
import { fileURLToPath } from 'node:url'

// fileURLToPath, а не .pathname: на Windows pathname отдаёт «/C:/…», и
// склейка с путём давала «C:\C:\…» — тест падал на ENOENT там, где файл есть.
const DATA = fileURLToPath(new URL('../../../public/practice/grammar/', import.meta.url))
const withData = GRAMMAR_LEVELS

describe('GRAMMAR_LEVELS', () => {
  // В витрине только уровни с курсом: C2 убран вместе с заглушкой «скоро».
  it('витрина идёт от A0 до C1 и ничем не заглушена', () => {
    expect(GRAMMAR_LEVELS.map((l) => l.code)).toEqual(['a0', 'a1', 'a2', 'b1', 'b2', 'c1'])
    expect(GRAMMAR_LEVELS.some((l) => l.empty)).toBe(false)
  })

  // Чип уровня без файла — это пустой экран «скоро» вместо курса, причём
  // молча: загрузчик глотает 404 и отдаёт null.
  it('у каждого уровня витрины есть файл контента и раздел в каталоге', () => {
    const index = JSON.parse(readFileSync(`${DATA}index.json`, 'utf8'))
    for (const { code } of withData) {
      expect(existsSync(`${DATA}${code}.json`), `нет ${code}.json`).toBe(true)
      expect(index[code], `нет раздела ${code} в index.json`).toBeTruthy()
      expect(index[code].units.length).toBeGreaterThan(0)
    }
    expect(index.levels.map((l) => l.code)).toEqual(withData.map((l) => l.code))
  })

  it('каждый юнит каталога ведёт в юнит с теорией и упражнениями', () => {
    const index = JSON.parse(readFileSync(`${DATA}index.json`, 'utf8'))
    for (const { code } of withData) {
      const content = JSON.parse(readFileSync(`${DATA}${code}.json`, 'utf8')).units
      for (const u of index[code].units) {
        const unit = content[String(u.id)]
        expect(unit, `${code}: юнит ${u.id} есть в каталоге, но не в контенте`).toBeTruthy()
        expect(unit.learn.length, `${code}/${u.id}: пустая теория`).toBeGreaterThan(0)
        expect(unit.activities.length, `${code}/${u.id}: нет упражнений`).toBeGreaterThan(0)
      }
    }
  })

  // Плеер рисует тело упражнения через switch по type; незнакомый тип
  // отвалился бы в пустой экран уже после клика по уроку.
  it('типы упражнений ограничены теми, что умеет плеер', () => {
    const known = new Set([
      'mc', 'gap', 'transform', 'dictation', 'order', 'error',
      'categorize', 'matching', 'truefalse', 'timeline', 'dialogue',
      'speaking', 'flashcard',
    ])
    const seen = new Set()
    for (const { code } of withData) {
      const content = JSON.parse(readFileSync(`${DATA}${code}.json`, 'utf8')).units
      for (const unit of Object.values(content)) for (const a of unit.activities) seen.add(a.type)
    }
    expect([...seen].filter((t) => !known.has(t))).toEqual([])
  })
})

describe('levelToCourse', () => {
  it('уровень студента открывает свой курс', () => {
    expect(levelToCourse('A0')).toBe('a0')
    expect(levelToCourse('b2')).toBe('b2')
    expect(levelToCourse('C1')).toBe('c1')
  })

  // C2 из витрины убран, но студент с таким уровнем в базе остаётся: его
  // нельзя оставить на пустом экране, поэтому откатываем на ближайший курс.
  it('уровни без курса откатываются на ближайший', () => {
    expect(levelToCourse('C2')).toBe('c1')
    expect(levelToCourse('B3')).toBe('b1')
    expect(levelToCourse('')).toBe('a1')
    expect(levelToCourse(null)).toBe('a1')
  })
})
