// Разбор результата раннера placement. Уровень отсюда уезжает в профиль
// студента, поэтому проверяется в первую очередь то, что в профиль не попадёт
// мусор, и что A0 — полноценный уровень, а не «почти A1».
import { describe, it, expect } from 'vitest'
import { placementLevel, placementFlags, profileLevel, PLACEMENT_LEVELS } from './placement.js'

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

// A0 в приложениях значит «тест не пройден»: мобильный клиент по нему держит
// карту под замком и снова просит пройти тест. Поэтому в профиль он не уезжает.
describe('profileLevel', () => {
  it('A0 превращается в A1 — первый уровень курса', () => {
    expect(profileLevel('A0')).toBe('A1')
  })

  it('остальные уровни не трогает', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      expect(profileLevel(level)).toBe(level)
    }
  })
})
