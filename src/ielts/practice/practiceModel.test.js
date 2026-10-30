import { describe, expect, it } from 'vitest'
import { SKILL_TABS, listRows, listTitle, shortRows, skillRows } from './practiceModel.js'
import { groupByLevel } from '../model/levels.js'

describe('practiceModel', () => {
  it('полный тест всегда в «Рекомендуемых», даже если каталог пометил его ниже уровня', () => {
    const lists = { reading: [{ id: 'R1', kind: 'test', title: 'Test 1', level: 'below', module: 'academic' }, { id: 'P1', kind: 'passage', title: 'Text', level: 'below', module: 'academic' }] }
    const full = listRows('reading:test', lists, 'academic')
    expect(groupByLevel(full).recommended.map((r) => r.id)).toEqual(['R1'])
    expect(groupByLevel(listRows('reading:passage', lists, 'academic')).unsuitable.map((r) => r.id)).toEqual(['P1'])
  })

  // набор вида из плана («Writing · эссе: Opinion») — только задания этого вида и заголовок с его именем
  it('набор вида Writing / Speaking: задания одной категории и её имя в заголовке', () => {
    const lists = {
      writing: [{ id: 'W1', kind: 'task2', category: 'opinion', module: 'both' }, { id: 'W2', kind: 'task2', category: 'discussion', module: 'both' },
        { id: 'G1', kind: 'task1', category: 'informal', module: 'general' }, { id: 'A1', kind: 'task1', category: 'line', module: 'academic' }],
      speaking: [{ id: 'S1', kind: 'part2', category: 'person' }, { id: 'S2', kind: 'part2', category: 'place' }],
    }
    expect(listRows('writing:task2:opinion', lists, 'academic').map((r) => [r.id, r.open.view])).toEqual([['W1', 'writing-task2']])
    expect(listRows('writing:task1:informal', lists, 'general').map((r) => r.id)).toEqual(['G1'])
    expect(listRows('speaking:part2:person', lists, 'academic').map((r) => r.id)).toEqual(['S1'])
    const t = (k) => ({ 'ieltsWriting.p.essay.opinion': 'Opinion essay', 'ieltsWriting.p.register.informal': 'Informal letter', 'ieltsSpeaking.p.cat.person': 'Person' })[k] || k
    expect(listTitle('writing:task2:opinion', t)).toBe('Task 2 · Opinion essay')
    expect(listTitle('writing:task1:informal', t)).toBe('Task 1 · Informal letter')
    expect(listTitle('speaking:part2:person', t)).toBe('Part 2 · Person')
    expect(listTitle('reading:types:tfng', t)).toBe('True / False / Not Given')
  })

  // замечание владельца 30.10.2026: «Short drills» Writing открывали полные задания Task 1 (строка short:task1 вела в
  // список writing:task1), а внутри Writing были только задания — без вкладки коротких тренировок
  it('Writing: короткие тренировки — дриллы, а не полные задания Task 1; своя вкладка у страницы навыка', () => {
    const lists = { writing: [{ id: 'W1', kind: 'task1', category: 'line', module: 'academic' }, { id: 'W2', kind: 'task2', category: 'opinion', module: 'both' }] }
    const rows = shortRows('writing', lists, 'academic')
    expect(rows.some((r) => r.id === 'short:task1' || r.open?.list?.startsWith('writing:task1'))).toBe(false)
    const drills = rows.filter((r) => r.open?.view === 'writing-drills')
    expect(drills.length).toBeGreaterThan(0)
    expect(drills.every((r) => r.open.testId && r.sample)).toBe(true)
    expect(drills.map((r) => r.id)).toContain('wdrill:WD-SAMPLE-T1-OVERVIEW')
    // трек: регистр письма — только у General Training, графики — только у Academic
    expect(shortRows('writing', lists, 'general').map((r) => r.id)).toContain('wdrill:WD-SAMPLE-GT-REGISTER')
    expect(shortRows('writing', lists, 'general').map((r) => r.id)).not.toContain('wdrill:WD-SAMPLE-T1-OVERVIEW')
    expect(SKILL_TABS.writing.map((x) => x.key)).toEqual(['task1', 'task2', 'mock', 'drills'])
    expect(skillRows('writing', 'drills', lists, 'academic').map((r) => r.id)).toEqual(drills.map((r) => r.id))
    // дриллы банка вытесняют пробные
    const bank = { writing: [...lists.writing, { id: 'WD-001', kind: 'drill', module: 'both', title: 'Overview', attemptCount: 0 }] }
    expect(skillRows('writing', 'drills', bank, 'academic').map((r) => [r.id, r.sample, r.open.testId])).toEqual([['wdrill:WD-001', false, 'WD-001']])
    expect(skillRows('writing', 'task1', lists, 'academic').map((r) => r.id)).toEqual(['W1'])
  })

  // замечание владельца 10: mock Writing по типам — строка на тип трека, ведёт на описание mock этого типа
  it('Writing: вкладка «Mock по типам» — тип трека строкой, пустой тип без перехода', () => {
    const lists = {
      writing: [
        { id: 'A1', kind: 'task1', category: 'line', module: 'academic', attemptCount: 1 },
        { id: 'G1', kind: 'task1', category: 'formal', module: 'general', attemptCount: 0 },
        { id: 'E1', kind: 'task2', category: 'opinion', module: 'both', attemptCount: 0 },
      ],
      writingMockDrafts: ['E1'],
    }
    const ac = skillRows('writing', 'mock', lists, 'academic')
    expect(ac.map((r) => r.id)).toEqual(['wmock:task1:line', 'wmock:task1:bar', 'wmock:task1:pie', 'wmock:task1:table', 'wmock:task1:process',
      'wmock:task1:map', 'wmock:task1:multi', 'wmock:task2:opinion', 'wmock:task2:discussion', 'wmock:task2:adv_disadv',
      'wmock:task2:problem_solution', 'wmock:task2:two_part'])
    const line = ac.find((r) => r.id === 'wmock:task1:line')
    expect(line).toMatchObject({ title: 'Mock · Task 1 · Line graph', minutes: 20, mode: 'exam', status: 'done', open: { tab: 'learn', view: 'writing-mock', list: 'task1:line' } })
    // тип без заданий — «скоро» и без перехода (страница навыка такие строки прячет)
    expect(ac.find((r) => r.id === 'wmock:task1:map')).toMatchObject({ status: 'soon', open: null })
    // начатый mock — «Продолжить»
    expect(ac.find((r) => r.id === 'wmock:task2:opinion')).toMatchObject({ minutes: 40, status: 'started' })
    const gt = skillRows('writing', 'mock', lists, 'general')
    expect(gt.filter((r) => r.open).map((r) => r.id)).toEqual(['wmock:task1:formal', 'wmock:task2:opinion'])
    expect(gt.some((r) => r.id === 'wmock:task1:line')).toBe(false)
  })
})
