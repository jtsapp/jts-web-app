import { describe, expect, it } from 'vitest'
import {
  SKILL_TABS, byWritingType, guideSection, isNewWritingTask, listRows, listTitle, recommendWritingDrills, shortRows, skillRows, writingDrillChips,
  writingDrillGroups, writingDrillInfo, writingDrillList, writingDrillsForType, writingTabCounts, writingTaskList, writingTypeChips,
} from './practiceModel.js'
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
    expect(SKILL_TABS.writing.map((x) => x.key)).toEqual(['task1', 'task2', 'mock', 'drills', 'guide'])
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

// Каталог Writing (ТЗ §3.2–3.4, §5.4): чипы по типу, порядок от лёгких, тренировки типа и «по вашему разбору»
describe('practiceModel — Writing по типам', () => {
  const W = [
    { id: 'W1-AC-001', kind: 'task1', module: 'academic', category: 'line', bandMin: 6, bandMax: 7 },
    { id: 'W1-AC-201', kind: 'task1', module: 'academic', category: 'line', bandMin: 4.5, bandMax: 5.5 },
    { id: 'W1-AC-103', kind: 'task1', module: 'academic', category: 'pie', bandMin: 5, bandMax: 6 },
    { id: 'W1-GT-001', kind: 'task1', module: 'general', category: 'formal', bandMin: 5, bandMax: 6 },
    { id: 'W2-001', kind: 'task2', module: 'both', category: 'opinion', bandMin: 5.5 },
    { id: 'W2-201', kind: 'task2', module: 'both', category: 'problem_solution', bandMin: 4 },
  ]
  // каталог дриллов бэкенда — без part/types: их даёт таблица пакета по ключу WD-<drillKey>
  const DR = ['WD-T1-TPL', 'WD-T1-TREND', 'WD-T1-PROCESS', 'WD-T1-APPROX', 'WD-T2-PLAN', 'WD-T2-CAUSESOL', 'WD-T2-LINK', 'WD-GT-LETTER', 'WD-T1-OVERVIEW', 'WD-T1-FEATURES']
    .map((id) => ({ id, kind: 'drill', module: id.includes('-T1-') ? 'academic' : id.includes('-GT-') ? 'general' : 'both', category: id.includes('-T2-') ? 'task2' : 'task1', title: id }))
  const lists = { writing: [...W, ...DR], writingDrills: DR }

  it('задания трека от лёгких к сложным, чипы «Все · [типы]» со счётчиками в порядке части', () => {
    const t1 = writingTaskList(lists.writing, 'task1', 'academic')
    expect(t1.map((t) => t.id)).toEqual(['W1-AC-201', 'W1-AC-103', 'W1-AC-001'])
    expect(writingTypeChips(t1, 'T1')).toEqual([{ key: 'all', n: 3 }, { key: 'line', n: 2 }, { key: 'pie', n: 1 }])
    expect(byWritingType(t1, 'pie').map((t) => t.id)).toEqual(['W1-AC-103'])
    // GT: Task 1 — письма, чипы — регистры
    const gt = writingTaskList(lists.writing, 'task1', 'general')
    expect(writingTypeChips(gt, 'GT')).toEqual([{ key: 'all', n: 1 }, { key: 'formal', n: 1 }])
    expect(writingTabCounts(lists, 'academic')).toEqual({ task1: 3, task2: 2, drills: 9 })
  })

  it('«новое · проще» — только у заданий пакета 2xx', () => {
    expect(['W1-AC-201', 'W1-GT-204', 'W2-210', 'W1-AC-020', 'W2-101', 'W2-2010'].map(isNewWritingTask)).toEqual([true, true, true, false, false, false])
  })

  it('часть и типы дрилла: поля строки, иначе таблица пакета, иначе по category', () => {
    expect(writingDrillInfo({ id: 'WD-T1-PROCESS' })).toMatchObject({ drillKey: 'T1-PROCESS', part: 'T1', types: ['process'] })
    expect(writingDrillInfo({ id: 'WD-X', part: 'T2', types: ['opinion'] })).toMatchObject({ part: 'T2', types: ['opinion'] })
    expect(writingDrillInfo({ id: 'WD-SAMPLE-LINKING', module: 'both', category: 'both' })).toMatchObject({ part: 'T2', types: 'all' })
    // GT-дриллы видит только General Training, T1 — только Academic
    expect(writingDrillList(lists, 'general').map((d) => d.drillKey)).toEqual(['T2-PLAN', 'T2-CAUSESOL', 'T2-LINK', 'GT-LETTER'])
  })

  it('тренировки типа: сначала только этого типа, затем общие с ≥ 4 вопросами типа; не больше 4', () => {
    const drills = writingDrillList(lists, 'academic')
    expect(writingDrillsForType(drills, 'T1', 'process').map((d) => d.drillKey)).toEqual(['T1-PROCESS', 'T1-TPL', 'T1-OVERVIEW'])
    expect(writingDrillsForType(drills, 'T1', 'line').map((d) => d.drillKey)).toEqual(['T1-TREND', 'T1-APPROX', 'T1-FEATURES', 'T1-TPL'])
    expect(writingDrillsForType(drills, 'T2', 'problem_solution').map((d) => d.drillKey)).toEqual(['T2-CAUSESOL', 'T2-PLAN'])
  })

  it('чипы и группы вкладки тренировок: Все · Общие · [типы]', () => {
    const drills = writingDrillList(lists, 'academic')
    const chips = writingDrillChips(drills, 'T1')
    expect(chips.slice(0, 2)).toEqual([{ key: 'all', n: 6 }, { key: 'common', n: 2 }])
    expect(chips.find((c) => c.key === 'line')).toEqual({ key: 'line', n: 3 })
    expect(writingDrillGroups(drills, 'T1').map((g) => [g.key, g.list.length])).toEqual([['common', 2], ['typed', 4]])
    expect(writingDrillGroups(drills, 'T1', 'common').map((g) => g.key)).toEqual(['common'])
    expect(writingDrillGroups(drills, 'T1', 'process')[0].list.map((d) => d.drillKey)).toEqual(['T1-PROCESS', 'T1-TPL', 'T1-OVERVIEW'])
  })

  it('«Рекомендуем по разбору»: критерии ниже 6.5, слабейший первым, только своей части и типа, до 4', () => {
    const drills = writingDrillList(lists, 'academic')
    const review = { part: 'T1', category: 'line', criteria: { taskResponse: 6, coherenceCohesion: 7, lexicalResource: 5, grammaticalRange: 6.5 } }
    const rec = recommendWritingDrills(review, drills)
    expect(rec.map((r) => [r.drill.drillKey, r.crit])).toEqual([['T1-TREND', 'lexicalResource'], ['T1-APPROX', 'lexicalResource'], ['T1-OVERVIEW', 'taskResponse'], ['T1-FEATURES', 'taskResponse']])
    expect(recommendWritingDrills({ ...review, category: 'process', criteria: { grammaticalRange: 5 } }, drills).map((r) => r.drill.drillKey)).toEqual(['T1-PROCESS'])
    expect(recommendWritingDrills({ part: 'T2', criteria: { coherenceCohesion: 7 } }, drills)).toEqual([])
    expect(recommendWritingDrills(null, drills)).toEqual([])
  })

  it('глава гида по части и типу; вкладка «Как писать» без строк', () => {
    expect(guideSection('T1', 'line')).toBe('t1ac.line')
    expect(guideSection('T2', 'problem_solution')).toBe('t2.problem_solution')
    expect(guideSection('GT', 'all')).toBe('t1gt')
    expect(skillRows('writing', 'guide', { writing: [{ id: 'WR-GUIDE', kind: 'guide', module: 'both' }] }, 'academic')).toEqual([])
    expect(SKILL_TABS.writing.map((x) => x.key)).toContain('guide')
  })
})
