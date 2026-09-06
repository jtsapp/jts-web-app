// Сверка порта движка с прототипом. Фикстуры пишет scripts/extract-reading.js
// ПРОТОТИПНЫМИ функциями (wordCount/readMin/sentences/exTotal, выкушенными из
// data/jtsreading.html), поэтому красный тест здесь значит одно: порт разъехался
// с исходником — и чинить надо порт, а не фикстуру.

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  choiceItems,
  exTotal,
  gapParts,
  initExercise,
  isChoice,
  isMatch,
  isOrder,
  norm,
  readMin,
  sentences,
  shuffledIdx,
  solvedState,
  textScore,
  wordCount,
} from './engine.js'

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const ROOT = path.join(__dirname, '..', '..', '..')

function level(lv) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'practice', 'reading', `${lv}.json`), 'utf8'))
}
function oracle(lv) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__', `oracle-${lv}.json`), 'utf8'))
}

describe('порт движка совпадает с прототипом', () => {
  for (const lv of LEVELS) {
    it(`${lv}: метрики текстов и очки упражнений`, () => {
      const data = level(lv)
      const want = oracle(lv)
      expect(data.texts.length).toBe(want.texts.length)

      data.texts.forEach((x, i) => {
        const w = want.texts[i]
        expect(x.id).toBe(w.id)
        expect(wordCount(x.text)).toBe(w.words)
        expect(readMin(x.text)).toBe(w.minutes)
        expect(x.text.map((p) => sentences(p))).toEqual(w.sentences)
        expect(x.exercises.map((ex) => ({ type: ex.type, total: exTotal(ex) }))).toEqual(w.exTotals)
      })
    })
  }
})

describe('семейства типов покрывают все упражнения данных', () => {
  it('каждое упражнение попадает ровно в одно семейство', () => {
    for (const lv of LEVELS) {
      for (const x of level(lv).texts) {
        for (const ex of x.exercises) {
          const families = [isChoice(ex.type), isMatch(ex.type), isOrder(ex.type), ex.type === 'gap', ex.type === 'reflection']
          expect(families.filter(Boolean).length, `${x.id} / ${ex.type}`).toBe(1)
        }
      }
    }
  })
})

describe('norm', () => {
  it('чистит пунктуацию, регистр и типографский апостроф', () => {
    expect(norm('  “Honey,” ')).toBe('honey')
    expect(norm('can’t')).toBe("can't")
    expect(norm('—')).toBe('')
  })
})

describe('gapParts', () => {
  it('делит шаблон на текст и ответы', () => {
    const { parts, answers } = gapParts({ text: 'a {one} b {two} c' })
    expect(answers).toEqual(['one', 'two'])
    expect(parts.filter((_, i) => i % 2 === 0)).toEqual(['a ', ' b ', ' c'])
  })
})

describe('choiceItems', () => {
  const labels = { yes: 'Да', no: 'Нет', notGiven: 'Не сказано' }

  it('tf превращает булев ответ в индекс кнопки', () => {
    const ex = { type: 'tf', items: [{ s: 'A', a: true }, { s: 'B', a: false }] }
    expect(choiceItems(ex, labels).map((i) => i.a)).toEqual([0, 1])
  })

  it('tfng раскладывает T/F/NG по трём кнопкам', () => {
    const ex = { type: 'tfng', items: [{ s: 'A', a: 'T' }, { s: 'B', a: 'F' }, { s: 'C', a: 'NG' }] }
    const items = choiceItems(ex, labels)
    expect(items.map((i) => i.a)).toEqual([0, 1, 2])
    expect(items[2].o).toEqual(['Да', 'Нет', 'Не сказано'])
  })

  it('mc берёт вопрос из q, finish — из s', () => {
    expect(choiceItems({ type: 'mc', items: [{ q: 'Q', o: ['a'], a: 0 }] }, labels)[0].q).toBe('Q')
    expect(choiceItems({ type: 'finish', items: [{ s: 'S', o: ['a'], a: 0 }] }, labels)[0].q).toBe('S')
  })
})

describe('shuffledIdx', () => {
  it('никогда не оставляет всё на своих местах', () => {
    // Иначе «соедини пары» и «расставь по порядку» иногда открывались бы
    // уже решёнными — ровно то, что чинил прототип.
    for (let n = 2; n <= 8; n++) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const s = shuffledIdx(n)
        expect(s.every((v, i) => v === i)).toBe(false)
        expect([...s].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i))
      }
    }
  })

  it('на одном элементе перестановки нет', () => {
    expect(shuffledIdx(1)).toEqual([0])
  })
})

describe('initExercise', () => {
  it('gap кладёт в банк ответы плюс лишние слова', () => {
    const ex = { type: 'gap', text: 'a {one} b {two}', extra: ['three'] }
    const st = initExercise(ex)
    expect(st.answers).toEqual(['one', 'two'])
    expect([...st.bank].sort()).toEqual(['one', 'three', 'two'])
    expect(st.fill).toEqual([null, null])
  })

  it('match и order перемешивают, не теряя элементов', () => {
    const m = initExercise({ type: 'match', pairs: [{}, {}, {}] })
    expect([...m.right].sort()).toEqual([0, 1, 2])
    const o = initExercise({ type: 'order', items: ['a', 'b', 'c'] })
    expect([...o.seq].sort()).toEqual([0, 1, 2])
  })
})

describe('solvedState', () => {
  it('gap собирает ответы из своего же банка', () => {
    const ex = { type: 'gap', text: '{one} {two}', extra: ['x'] }
    const st = initExercise(ex)
    const solved = solvedState(ex, st)
    expect(solved.fill.map((b) => st.bank[b])).toEqual(['one', 'two'])
  })

  it('order восстанавливает исходный порядок', () => {
    const ex = { type: 'order', items: ['a', 'b', 'c'] }
    expect(solvedState(ex, initExercise(ex)).seq).toEqual([0, 1, 2])
  })
})

describe('textScore', () => {
  const text = {
    exercises: [
      { type: 'tf', items: [{}, {}] },
      { type: 'order', items: ['a', 'b', 'c'] },
    ],
  }

  it('без сохранённого — ноль процентов', () => {
    expect(textScore(text, undefined)).toEqual({ got: 0, total: 5, pct: 0 })
  })

  it('складывает результаты упражнений', () => {
    expect(textScore(text, { 0: { score: 2 }, 1: { score: 1 } })).toEqual({ got: 3, total: 5, pct: 60 })
  })

  it('не даёт сохранённому перевесить знаменатель', () => {
    // Данные могли смениться под уже записанным прогрессом; 120 % на карточке
    // выглядели бы поломкой.
    expect(textScore(text, { 0: { score: 99 } }).pct).toBe(40)
  })
})
