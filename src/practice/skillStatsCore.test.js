import { describe, expect, it } from 'vitest'
import { addLevelDelta, emptyStats, levelShare, MIN_LEVEL_TASKS, mergeLevelDeltas, shareBars, skillLevel, withStartEstimate } from './skillStatsCore.js'
import { validateByLevel } from '../lib/skillContract.js'
import { levelSkillHighlights, rankLevelSkills } from '../lib/levelProgress.js'

// ТЗ v2.0, 5.5: «Сильные и слабые стороны» — доля верных с первой попытки в заданиях ТЕКУЩЕГО уровня, одна формула
// на «Главной», в Профиле и у Луны. Раньше у одного ученика чтение было 32% на «Главной» и 73% в Профиле.
// Решение владельца 07.11.2026: пока заданий уровня меньше пяти — общий итог навыка как стартовая оценка.
describe('старт от прошлых заданий', () => {
  it('мало заданий уровня — общий итог с пометкой; пять и больше — только уровень', () => {
    const level = { reading: { done: 2, firstTry: 2 }, grammar: { done: 5, firstTry: 2 } }
    const total = { reading: { done: 40, firstTry: 30 }, grammar: { done: 90, firstTry: 80 }, vocab: { done: 3, firstTry: 3 } }
    const got = withStartEstimate(level, total)
    expect(got.reading).toEqual({ done: 40, firstTry: 30, estimate: true })
    expect(levelShare(got.reading)).toBe(75)
    expect(got.grammar).toEqual({ done: 5, firstTry: 2 })
    // в общем итоге тоже меньше пяти — «мало данных», как без старта
    expect(got.vocab).toEqual({ done: 0, firstTry: 0 })
    expect(levelShare(got.vocab)).toBe(null)
  })

  it('нет ни уровня, ни итога — все навыки пустые', () => {
    const got = withStartEstimate(null, undefined)
    expect(Object.values(got).every((s) => s.done === 0 && !s.estimate)).toBe(true)
    expect(withStartEstimate(null, { listening: { done: 7, firstTry: 7 } }).listening).toEqual({ done: 7, firstTry: 7, estimate: true })
  })
})

describe('навыки по уровню', () => {
  it('доля с первой попытки; меньше пяти заданий — «мало данных»', () => {
    expect(MIN_LEVEL_TASKS).toBe(5)
    expect(levelShare({ done: 4, firstTry: 4 })).toBe(null)
    expect(levelShare({ done: 5, firstTry: 4 })).toBe(80)
    expect(levelShare({ done: 10, firstTry: 3 })).toBe(30)
    // Битые данные (верных больше, чем решено) — не больше 100%.
    expect(levelShare({ done: 5, firstTry: 9 })).toBe(100)
    expect(levelShare()).toBe(null)
  })

  it('полоски по доле: 2..10, без доли — 2', () => {
    expect(shareBars(null)).toBe(2)
    expect(shareBars(0)).toBe(2)
    expect(shareBars(50)).toBe(6)
    expect(shareBars(100)).toBe(10)
  })

  it('уровень — ключом CEFR, чужое значение — не уровень', () => {
    expect(skillLevel('b1')).toBe('B1')
    expect(skillLevel(' A0 ')).toBe('A0')
    expect(skillLevel('IELTS')).toBe(null)
    expect(skillLevel(null)).toBe(null)
  })

  it('попытки копятся по уровню и склеиваются', () => {
    let d = addLevelDelta({}, 'a2', 'grammar', true)
    d = addLevelDelta(d, 'A2', 'grammar', false)
    d = addLevelDelta(d, 'B1', 'reading', true)
    // Без уровня или с чужим навыком — ничего.
    expect(addLevelDelta(d, null, 'grammar', true)).toBe(d)
    expect(addLevelDelta(d, 'A2', 'magic', true)).toBe(d)
    expect(d.A2.grammar).toEqual({ done: 2, firstTry: 1 })
    expect(d.B1.reading).toEqual({ done: 1, firstTry: 1 })
    const merged = mergeLevelDeltas(d, { A2: { ...emptyStats(), grammar: { done: 3, firstTry: 3 } }, junk: { grammar: { done: 9, firstTry: 9 } } })
    expect(merged.A2.grammar).toEqual({ done: 5, firstTry: 4 })
    expect(merged.junk).toBeUndefined()
  })

  it('разбивка по уровню в теле POST: кривая — отбрасывается целиком, нет — пустая', () => {
    expect(validateByLevel({})).toEqual({})
    expect(validateByLevel({ byLevel: { B1: { grammar: { done: 2, firstTry: 1 } } } })).toEqual({ B1: { grammar: { done: 2, firstTry: 1 } } })
    expect(validateByLevel({ byLevel: { b1: { grammar: { done: 2, firstTry: 1 } } } })).toBe(null)
    expect(validateByLevel({ byLevel: { B1: { grammar: { done: 'x' } } } })).toBe(null)
    expect(validateByLevel({ byLevel: [] })).toBe(null)
  })

  it('рейтинг: от сильного к слабому, «мало данных» в конце; слабый — только если правда слабее', () => {
    const ranked = rankLevelSkills({
      listening: { done: 10, firstTry: 8 },
      reading: { done: 10, firstTry: 3 },
      speaking: { done: 2, firstTry: 2 },
    })
    expect(ranked.slice(0, 3).map((r) => [r.skill, r.percent, r.done])).toEqual([
      ['listening', 80, 10],
      ['reading', 30, 10],
      ['speaking', null, 2],
    ])
    expect(levelSkillHighlights(ranked)).toMatchObject({ strongest: { skill: 'listening' }, weakest: { skill: 'reading' } })
    // Один навык с данными — сильный есть, слабого нет.
    expect(levelSkillHighlights(rankLevelSkills({ grammar: { done: 6, firstTry: 6 } })).weakest).toBe(null)
    expect(levelSkillHighlights(rankLevelSkills({}))).toEqual({ strongest: null, weakest: null })
  })
})
