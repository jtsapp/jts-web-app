// Инварианты экстрактора «Чтения»: срез по маркерам жив, данные полные,
// повторный прогон детерминирован. Падение здесь = кто-то пере-экспортировал
// прототип и структура уехала — чинить надо экстрактор, а не замалчивать.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

import {
  DEFAULT_SRC,
  EX_TYPES,
  LEVELS,
  TEXTS_PER_LEVEL,
  checkText,
  readPrototype,
  sliceData,
  sliceFunction,
  sliceI18n,
} from './extract-reading.js'

const html = fs.readFileSync(DEFAULT_SRC, 'utf8')

describe('срез прототипа', () => {
  it('слой данных найден и не содержит браузерного кода', () => {
    const data = sliceData(html)
    expect(data.length).toBeGreaterThan(500000)
    for (const mark of ['const DICT', 'const INS', 'const EXPL', 'const DATA']) {
      expect(data).toContain(mark)
    }
    expect(data).not.toContain('speechSynthesis')
    expect(data).not.toContain('localStorage.')
  })

  it('I18N вырезан до блока состояния', () => {
    const i18n = sliceI18n(html)
    expect(i18n).toContain("library:")
    expect(i18n).not.toContain('const S = {')
  })

  it('sliceFunction не спотыкается о фигурные скобки внутри регэкспа', () => {
    // exTotal ищет пропуски через /\{[^}]+\}/g — на голом счётчике скобок
    // функция закрывалась на середине, и оракул вообще не собирался.
    const engineSrc = html.slice(html.indexOf('<script>'), html.indexOf('</script>'))
    const src = sliceFunction(engineSrc, 'exTotal')
    expect(src.startsWith('function exTotal(')).toBe(true)
    expect(src.trimEnd().endsWith('}')).toBe(true)
    expect(src).toContain('case ')
    expect(src).toContain('default:')
  })

  it('исчезнувшая функция — падение, а не тихий пропуск', () => {
    expect(() => sliceFunction('function other(){}', 'exTotal')).toThrow(/exTotal/)
  })
})

describe('данные прототипа', () => {
  const { DATA, DICT, I18N, proto } = readPrototype(html)

  it('пять уровней по шестнадцать текстов', () => {
    for (const lv of LEVELS) expect(DATA[lv], lv).toHaveLength(TEXTS_PER_LEVEL)
  })

  it('каждый текст проходит валидацию экстрактора', () => {
    for (const lv of LEVELS) for (const x of DATA[lv]) expect(() => checkText(x, lv)).not.toThrow()
  })

  it('типов упражнений ровно тринадцать и все известны движку', () => {
    const seen = new Set()
    for (const lv of LEVELS) for (const x of DATA[lv]) for (const ex of x.exercises) seen.add(ex.type)
    expect([...seen].sort()).toEqual([...EX_TYPES].sort())
  })

  it('id текстов уникальны на весь раздел', () => {
    const ids = new Set()
    for (const lv of LEVELS) {
      for (const x of DATA[lv]) {
        expect(ids.has(x.id), x.id).toBe(false)
        ids.add(x.id)
      }
    }
    expect(ids.size).toBe(LEVELS.length * TEXTS_PER_LEVEL)
  })

  it('ключи словаря нормализованы — иначе тап по слову их не найдёт', () => {
    for (const word of Object.keys(DICT)) {
      expect(proto.norm(word), word).toBe(word)
      expect(DICT[word], word).toHaveLength(2)
    }
  })

  it('интерфейс прототипа есть на трёх языках', () => {
    for (const lang of ['en', 'ru', 'kz']) {
      expect(I18N[lang].library, lang).toBeTruthy()
      expect(Object.keys(I18N[lang].exType), lang).toHaveLength(EX_TYPES.length)
    }
  })
})

describe('детерминизм', () => {
  it('повторное исполнение даёт байт-в-байт то же', () => {
    const a = readPrototype(html)
    const b = readPrototype(html)
    expect(JSON.stringify(a.DATA)).toBe(JSON.stringify(b.DATA))
    expect(JSON.stringify(a.DICT)).toBe(JSON.stringify(b.DICT))
  })
})

describe('выгрузка совпадает с прототипом', () => {
  const { DATA } = readPrototype(html)

  it('json уровней не разошёлся с источником', () => {
    // Файлы в public/ коммитятся, а прототип может уехать вперёд. Этот тест
    // ловит «забыли прогнать экстрактор».
    for (const lv of LEVELS) {
      const key = lv.toLowerCase()
      const onDisk = JSON.parse(fs.readFileSync(`public/practice/reading/${key}.json`, 'utf8'))
      expect(JSON.stringify(onDisk), key).toBe(JSON.stringify({ level: lv, texts: DATA[lv] }))
    }
  })
})
