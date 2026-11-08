import { describe, expect, it } from 'vitest'
import GUIDE from '../data/desmosGuide.json'
import { DESMOS_TAGS, filterLessons, tagOf, tagsIn } from './desmosTags.js'

describe('теги уроков гида Desmos', () => {
  it('у каждого урока гида ровно один известный тег', () => {
    for (const s of GUIDE.sections) expect(DESMOS_TAGS, s.id).toContain(tagOf(s))
  })

  it('фильтр только скрывает: порядок и номера уроков прежние', () => {
    const data = filterLessons(GUIDE.sections, 'data')
    expect(data.length).toBeGreaterThan(0)
    expect(data.every(({ s }) => tagOf(s) === 'data')).toBe(true)
    const idx = data.map(({ i }) => i)
    expect(idx).toEqual([...idx].sort((a, b) => a - b))
    expect(GUIDE.sections[idx[0]].id).toBe(data[0].s.id)
    expect(filterLessons(GUIDE.sections, 'all')).toHaveLength(GUIDE.sections.length)
  })

  it('кнопки — только теги, у которых есть уроки', () => {
    expect(tagsIn([{ id: 'l9' }, { id: 'solve' }])).toEqual(['equations', 'data'])
    expect(tagsIn([])).toEqual([])
  })
})
