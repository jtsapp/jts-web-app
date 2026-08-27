// Разбор результата раннера placement. Уровень отсюда уезжает в профиль
// студента, поэтому проверяется в первую очередь то, что в профиль не попадёт
// мусор, и что A0 — полноценный уровень, а не «почти A1».
import { describe, it, expect } from 'vitest'
import { placementLevel, placementFlags, placementSummary, PLACEMENT_LEVELS } from './placement.js'

describe('placementLevel', () => {
  it('берёт уровень из результата раннера', () => {
    expect(placementLevel({ level: 'B2', theta: 0.7 })).toBe('B2')
  })

  // Раннер ветвится на A0 отдельно от θ (branched && !bridgePassed), и это
  // ровно тот случай, ради которого A0 появился: старый тест ниже A1 не умел.
  it('A0 — обычный уровень, а не отбраковка', () => {
    expect(placementLevel({ level: 'A0', theta: -3.1 })).toBe('A0')
    expect(PLACEMENT_LEVELS[0]).toBe('A0')
  })

  it('регистр и пробелы не мешают', () => {
    expect(placementLevel({ level: ' c1 ' })).toBe('C1')
  })

  it('незнакомое или пустое значение не уезжает в профиль', () => {
    for (const bad of [{ level: 'D1' }, { level: '' }, { level: null }, {}, null, undefined]) {
      expect(placementLevel(bad)).toBeNull()
    }
  })
})

describe('placementFlags', () => {
  it('отдаёт флаги сессии как есть', () => {
    expect(placementFlags({ flags: ['yea_saying', 'unresolved'] })).toEqual(['yea_saying', 'unresolved'])
  })

  it('без флагов — пустой список, а не падение', () => {
    expect(placementFlags({})).toEqual([])
    expect(placementFlags(null)).toEqual([])
    expect(placementFlags({ flags: 'oops' })).toEqual([])
  })
})

describe('placementSummary', () => {
  it('собирает уровень, θ, SE и флаги, округляя числа', () => {
    expect(
      placementSummary({ level: 'B1', theta: -0.4567, se: 0.4123, flags: ['unresolved'] }),
    ).toEqual({ level: 'B1', theta: -0.46, se: 0.41, flags: ['unresolved'] })
  })

  it('без θ и SE поля остаются пустыми, уровень сохраняется', () => {
    expect(placementSummary({ level: 'A0' })).toEqual({ level: 'A0', theta: null, se: null, flags: [] })
  })

  it('без валидного уровня сводки нет', () => {
    expect(placementSummary({ theta: 1.2 })).toBeNull()
  })
})
