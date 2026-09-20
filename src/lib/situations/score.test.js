// Сборка итогового балла. Главное здесь — поведение без произношения: Azure
// отвечает не всегда, и студент не должен из-за этого «терять» четверть балла.

import { describe, it, expect } from 'vitest'
import { AXES, WEIGHTS, composeScore, normalizeAxis, scoreLabelKey } from './score.js'

describe('normalizeAxis', () => {
  it('округляет и зажимает в 0..100', () => {
    expect(normalizeAxis(87.4)).toBe(87)
    expect(normalizeAxis(-5)).toBe(0)
    expect(normalizeAxis(140)).toBe(100)
  })

  it('мусор — это null, а не ноль', () => {
    // Ноль студент читает как приговор, хотя означает он «поставщик не ответил».
    expect(normalizeAxis(undefined)).toBeNull()
    expect(normalizeAxis(null)).toBeNull()
    expect(normalizeAxis('не знаю')).toBeNull()
    expect(normalizeAxis(NaN)).toBeNull()
  })
})

describe('composeScore', () => {
  it('веса дают ровно единицу — иначе итог поехал бы', () => {
    const sum = AXES.reduce((acc, axis) => acc + WEIGHTS[axis], 0)
    expect(Number(sum.toFixed(6))).toBe(1)
  })

  it('считает по весам прототипа', () => {
    const { overall, axes } = composeScore({
      grammar: 80,
      pronunciation: 60,
      vocabulary: 70,
      fluency: 90,
      coherence: 50,
    })
    // 80*.30 + 60*.25 + 70*.20 + 90*.15 + 50*.10 = 24 + 15 + 14 + 13.5 + 5
    expect(overall).toBe(72)
    expect(axes.pronunciation).toBe(60)
  })

  it('без произношения нормирует веса, а не срезает итог', () => {
    const axes = { grammar: 80, vocabulary: 70, fluency: 90, coherence: 50 }
    const withPron = composeScore({ ...axes, pronunciation: 80 })
    const without = composeScore(axes)
    expect(without.axes.pronunciation).toBeNull()
    // Оценка «как остальные оси» не должна отличаться от полного набора с
    // тем же уровнем: иначе отсутствие Azure читается как падение результата.
    expect(without.overall).toBeGreaterThan(70)
    expect(Math.abs(without.overall - withPron.overall)).toBeLessThanOrEqual(3)
  })

  it('ни одной оси — null, а не ноль', () => {
    expect(composeScore({}).overall).toBeNull()
  })
})

describe('scoreLabelKey', () => {
  it('пороги прототипа', () => {
    expect(scoreLabelKey(92)).toBe('situations.score.excellent')
    expect(scoreLabelKey(85)).toBe('situations.score.excellent')
    expect(scoreLabelKey(84)).toBe('situations.score.great')
    expect(scoreLabelKey(70)).toBe('situations.score.great')
    expect(scoreLabelKey(69)).toBe('situations.score.good')
    expect(scoreLabelKey(55)).toBe('situations.score.good')
    expect(scoreLabelKey(54)).toBe('situations.score.keepPractising')
  })

  it('без балла — своя подпись', () => {
    expect(scoreLabelKey(null)).toBe('situations.score.na')
  })
})
