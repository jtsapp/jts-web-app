import { describe, it, expect } from 'vitest'
import {
  computeHighlights, wordDiff, avgScore,
  genreStats, overallBand, overallVerdict, TASKS_PER_GENRE
} from './resultFormat.js'

// Склейка сегментов обратно в строку — базовое свойство обеих функций.
function joinText(segs) { return segs.map(function (s) { return s.text }).join('') }

describe('computeHighlights', () => {
  const text = 'I has a dog. My dog is very nice. We goes to park.'
  const assessment = {
    corrections: [
      { original: 'I has', corrected: 'I have', severity: 'high' },
      { original: 'We goes', corrected: 'We go', severity: 'low' }
    ],
    strengths: [{ quote: 'My dog is very nice.' }]
  }

  it('сегменты склеиваются ровно в исходный текст', () => {
    expect(joinText(computeHighlights(text, assessment))).toBe(text)
  })

  it('severity high → err, low → imp, strengths → good, plain между ними', () => {
    const segs = computeHighlights(text, assessment)
    expect(segs.map((s) => s.kind)).toEqual(['err', 'plain', 'good', 'plain', 'imp', 'plain'])
    expect(segs[0].text).toBe('I has')
    expect(segs[2].text).toBe('My dog is very nice.')
    expect(segs[4].text).toBe('We goes')
  })

  it('severity кроме low (в т.ч. medium) даёт err — как в прототипе', () => {
    const segs = computeHighlights('bad bit here', {
      corrections: [{ original: 'bad bit', severity: 'medium' }], strengths: []
    })
    expect(segs[0].kind).toBe('err')
  })

  it('refKind/refIndex указывают в corrections/strengths', () => {
    const segs = computeHighlights(text, assessment)
    const marked = segs.filter((s) => s.kind !== 'plain')
    expect(marked.map((s) => [s.refKind, s.refIndex])).toEqual([['corr', 0], ['good', 0], ['corr', 1]])
  })

  it('перекрывающаяся отметка пропускается, ненайденная — тоже', () => {
    const t = 'the quick brown fox'
    const segs = computeHighlights(t, {
      corrections: [
        { original: 'quick brown', severity: 'high' },
        { original: 'brown fox', severity: 'high' }, // начинается внутри первой — прототип пропускает
        { original: 'no such text', severity: 'high' } // indexOf < 0
      ],
      strengths: []
    })
    expect(segs.filter((s) => s.kind !== 'plain')).toHaveLength(1)
    expect(joinText(segs)).toBe(t)
  })

  it('при равном старте выживает более длинная отметка', () => {
    const t = 'very good start here'
    const segs = computeHighlights(t, {
      corrections: [{ original: 'very good', severity: 'high' }],
      strengths: [{ quote: 'very good start' }]
    })
    const marked = segs.filter((s) => s.kind !== 'plain')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toMatchObject({ kind: 'good', text: 'very good start' })
  })
})

describe('wordDiff', () => {
  function ofOps(segs, ops) {
    return segs.filter((s) => ops.indexOf(s.op) >= 0).map((s) => s.text).join('')
  }

  it('одинаковые тексты → один same-прогон', () => {
    expect(wordDiff('one two three', 'one two three')).toEqual([{ op: 'same', text: 'one two three' }])
  })

  it('чистая вставка', () => {
    const segs = wordDiff('a b', 'a b c')
    expect(ofOps(segs, ['same', 'del'])).toBe('a b')
    expect(ofOps(segs, ['same', 'ins'])).toBe('a b c')
    expect(segs.some((s) => s.op === 'del')).toBe(false)
  })

  it('чистое удаление', () => {
    const segs = wordDiff('a b c', 'a b')
    expect(ofOps(segs, ['same', 'del'])).toBe('a b c')
    expect(ofOps(segs, ['same', 'ins'])).toBe('a b')
    expect(segs.some((s) => s.op === 'ins')).toBe(false)
  })

  it('замена слова даёт del, затем ins — как в проходе прототипа', () => {
    const segs = wordDiff('a b c', 'a X c')
    const marked = segs.filter((s) => s.op !== 'same')
    expect(marked.map((s) => s.op)).toEqual(['del', 'ins'])
    expect(marked[0].text).toBe('b')
    expect(marked[1].text).toBe('X')
  })

  it('свойство реконструкции на паре из 30 слов', () => {
    const words = []
    for (let i = 0; i < 30; i++) words.push('word' + i)
    const oldT = words.join(' ')
    const changed = words.slice()
    changed[5] = 'REPLACED'
    changed.splice(20, 2) // удаление пары слов
    changed.splice(10, 0, 'ADDED', 'TOKENS') // вставка
    const newT = changed.join(' ')
    const segs = wordDiff(oldT, newT)
    expect(ofOps(segs, ['same', 'del'])).toBe(oldT)
    expect(ofOps(segs, ['same', 'ins'])).toBe(newT)
  })

  it('бюджет n*m > 400000 — дифф не считается, весь новый текст одним same', () => {
    const many = (p) => Array.from({ length: 330 }, (_, i) => p + i).join(' ')
    const oldT = many('a')
    const newT = many('b')
    expect(wordDiff(oldT, newT)).toEqual([{ op: 'same', text: newT }])
  })
})

describe('avgScore', () => {
  it('среднее четырёх критериев с округлением до десятых', () => {
    expect(avgScore({ task: 3, organisation: 4, vocabulary: 4, grammar: 4 })).toBe(3.8)
    expect(avgScore({ task: 5, organisation: 5, vocabulary: 5, grammar: 5 })).toBe(5)
  })
})

describe('genreStats / overallBand', () => {
  const genre = {
    id: 'email',
    tasks: [
      { id: 't1', step: 4, type: 'word-order' },
      { id: 't2', step: 4, type: 'gap-fill' },
      { id: 't3', step: 5, type: 'free-write' }
    ]
  }
  const taskStates = { t1: { correct: 3, total: 4 }, t2: { correct: 4, total: 4 }, t3: undefined }

  it('genreStats: done/correct/total/accuracy как в прототипе', () => {
    expect(genreStats(genre, taskStates)).toEqual({ done: 2, correct: 7, total: 8, accuracy: 88 })
    expect(genreStats(genre, {})).toEqual({ done: 0, correct: 0, total: 0, accuracy: 0 })
  })

  it('overallBand без оценки текста: только упражнения', () => {
    const band = overallBand(genre, taskStates, null)
    // exercisePart = (2/11)*0.5 + 0.88*0.5 = 0.530909…
    expect(band.score).toBe(2.7)
    expect(band.percent).toBe(53)
    expect(band.cefr).toBeNull()
    expect(band.last).toBeNull()
    expect(band.stats.done).toBe(2)
    expect(TASKS_PER_GENRE).toBe(11)
  })

  it('overallBand с оценкой текста: половина за упражнения, половина за текст', () => {
    const last = { scores: { task: 3, organisation: 4, vocabulary: 3, grammar: 4 }, cefr: 'A2' }
    const band = overallBand(genre, taskStates, last)
    // textPart = 14/4/5 = 0.7; frac = 0.530909…*0.5 + 0.7*0.5 = 0.615454…
    expect(band.score).toBe(3.1)
    expect(band.percent).toBe(62)
    expect(band.cefr).toBe('A2')
    expect(band.last).toBe(last)
  })
})

describe('overallVerdict', () => {
  it('границы порогов дословно из прототипа', () => {
    expect(overallVerdict({ score: 4.3 })).toMatch(/^Strong\./)
    expect(overallVerdict({ score: 4.2 })).toMatch(/^Solid\./)
    expect(overallVerdict({ score: 3.4 })).toMatch(/^Solid\./)
    expect(overallVerdict({ score: 3.3 })).toMatch(/^Getting there\./)
    expect(overallVerdict({ score: 2.5 })).toMatch(/^Getting there\./)
    expect(overallVerdict({ score: 2.4 })).toMatch(/^Early days\./)
    expect(overallVerdict({ score: 0.1 })).toMatch(/^Early days\./)
    expect(overallVerdict({ score: 0 })).toMatch(/^Nothing counted yet\./)
  })
})
