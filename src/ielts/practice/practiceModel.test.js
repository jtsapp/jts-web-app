import { describe, expect, it } from 'vitest'
import { listRows } from './practiceModel.js'
import { groupByLevel } from '../model/levels.js'

describe('practiceModel', () => {
  it('полный тест всегда в «Рекомендуемых», даже если каталог пометил его ниже уровня', () => {
    const lists = { reading: [{ id: 'R1', kind: 'test', title: 'Test 1', level: 'below', module: 'academic' }, { id: 'P1', kind: 'passage', title: 'Text', level: 'below', module: 'academic' }] }
    const full = listRows('reading:test', lists, 'academic')
    expect(groupByLevel(full).recommended.map((r) => r.id)).toEqual(['R1'])
    expect(groupByLevel(listRows('reading:passage', lists, 'academic')).unsuitable.map((r) => r.id)).toEqual(['P1'])
  })
})
