import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { checkExercise, mood, REFLECT_MIN_WORDS } from './check.js'
import { exTotal, initExercise, solvedState } from './engine.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']

describe('choice', () => {
  const ex = {
    type: 'mc',
    items: [
      { q: 'A', o: ['x', 'y'], a: 1 },
      { q: 'B', o: ['x', 'y'], a: 0 },
    ],
  }

  it('считает только совпавшие ответы', () => {
    const r = checkExercise(ex, { sel: { 0: 1, 1: 1 } })
    expect(r).toMatchObject({ score: 1, total: 2 })
    expect(r.detail.rows.map((x) => x.ok)).toEqual([true, false])
  })

  it('неотвеченный вопрос не засчитывается', () => {
    const r = checkExercise(ex, { sel: {} })
    expect(r.score).toBe(0)
    expect(r.detail.rows[0].chosen).toBeNull()
  })

  it('tf сверяется по булеву ответу данных', () => {
    const tf = { type: 'tf', items: [{ s: 'A', a: true }, { s: 'B', a: false }] }
    expect(checkExercise(tf, { sel: { 0: 0, 1: 1 } }).score).toBe(2)
    expect(checkExercise(tf, { sel: { 0: 1, 1: 1 } }).score).toBe(1)
  })
})

describe('match', () => {
  const ex = { type: 'match', pairs: [{ l: 'a' }, { l: 'b' }, { l: 'c' }] }

  it('пара верна, когда индексы совпали', () => {
    expect(checkExercise(ex, { pairs: { 0: 0, 1: 2, 2: 1 } }).score).toBe(1)
    expect(checkExercise(ex, { pairs: { 0: 0, 1: 1, 2: 2 } }).score).toBe(3)
  })

  it('пустой ответ — ноль', () => {
    expect(checkExercise(ex, { pairs: {} }).score).toBe(0)
  })
})

describe('gap', () => {
  const ex = { type: 'gap', text: '{one} and {two}', extra: ['three'] }
  const st = { answers: ['one', 'two'], bank: ['two', 'three', 'one'], fill: [2, 0] }

  it('сравнивает нормализованно', () => {
    expect(checkExercise(ex, st).score).toBe(2)
    expect(checkExercise(ex, { ...st, bank: ['Two!', 'three', ' ONE '] }).score).toBe(2)
  })

  it('пустой пропуск — ошибка, а не пропуск строки', () => {
    const r = checkExercise(ex, { ...st, fill: [null, 0] })
    expect(r.score).toBe(1)
    expect(r.detail.rows[0]).toMatchObject({ ok: false, given: null, answer: 'one' })
  })
})

describe('order', () => {
  const ex = { type: 'order', items: ['a', 'b', 'c'] }

  it('верна позиция, совпавшая со своим индексом', () => {
    expect(checkExercise(ex, { seq: [0, 1, 2] }).score).toBe(3)
    expect(checkExercise(ex, { seq: [0, 2, 1] }).score).toBe(1)
  })
})

describe('reflection', () => {
  const ex = {
    type: 'reflection',
    keys: [['patient', 'wait'], ['drop', 'fall'], ['because']],
    min: 2,
  }

  it('короткий ответ обнуляется даже с ключевыми словами', () => {
    const r = checkExercise(ex, { reflect: 'patient drop because' })
    expect(r.score).toBe(0)
    expect(r.detail.short).toBe(true)
    expect(r.detail.foundCount).toBe(3)
  })

  it('засчитывает идею по любому синониму', () => {
    const long = 'I would wait for it because the drop is very slow and I am curious'
    const r = checkExercise(ex, { reflect: long })
    expect(r.detail.words).toBeGreaterThanOrEqual(REFLECT_MIN_WORDS)
    expect(r.detail.found).toEqual(['patient', 'drop', 'because'])
    // total = ex.min = 2, найдено три идеи — балл не может превысить знаменатель
    expect(r).toMatchObject({ score: 2, total: 2 })
  })

  it('подсказывает, о чём не написали', () => {
    const r = checkExercise(ex, { reflect: 'I think this experiment is interesting to watch every year' })
    expect(r.detail.missing).toEqual(['patient', 'drop', 'because'])
    expect(r.score).toBe(0)
  })
})

describe('mood', () => {
  it('пороги прототипа', () => {
    expect(mood(100)).toBe('great')
    expect(mood(90)).toBe('great')
    expect(mood(89)).toBe('good')
    expect(mood(60)).toBe('good')
    expect(mood(59)).toBe('keep')
  })
})

describe('на реальных данных', () => {
  it('«показать ответ» даёт полный балл в каждом упражнении всех уровней', () => {
    // Самая широкая проверка связки данные ↔ initExercise ↔ solvedState ↔
    // checkExercise: если хоть где-то ключи разъехались, эталонный ответ
    // перестанет сходиться.
    for (const lv of LEVELS) {
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'practice', 'reading', `${lv}.json`), 'utf8'))
      for (const x of data.texts) {
        x.exercises.forEach((ex, i) => {
          if (ex.type === 'reflection') return // свободный ответ эталона не имеет
          const solved = solvedState(ex, initExercise(ex))
          const r = checkExercise(ex, solved)
          expect(r.total, `${x.id}#${i} ${ex.type}`).toBe(exTotal(ex))
          expect(r.score, `${x.id}#${i} ${ex.type}`).toBe(r.total)
        })
      }
    }
  })

  it('образцовый ответ reflection проходит собственную проверку', () => {
    for (const lv of LEVELS) {
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'practice', 'reading', `${lv}.json`), 'utf8'))
      for (const x of data.texts) {
        for (const ex of x.exercises) {
          if (ex.type !== 'reflection') continue
          const r = checkExercise(ex, { reflect: ex.model })
          // Модель обязана закрывать минимум идей: иначе кнопка «пример ответа»
          // показывает текст, который сам движок не зачёл бы.
          expect(r.score, `${x.id}: ${ex.q}`).toBe(r.total)
        }
      }
    }
  })
})
