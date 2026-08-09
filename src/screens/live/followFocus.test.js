import { describe, it, expect } from 'vitest'
import { knowsFocusTarget } from './followFocus.js'

const SECTIONS = [
  { id: 1, title: 'Разогрев', materials: [{ id: 8, materialId: 3, title: 'Уровень PRE INTER' }] },
  { id: 2, title: 'Основная часть', materials: [] },
]

describe('knowsFocusTarget', () => {
  it('знает раздел и материал, которые уже загружены', () => {
    expect(knowsFocusTarget(SECTIONS, { sectionId: 1, materialId: 3 })).toBe(true)
  })

  it('не знает материал, прикреплённый после загрузки разделов', () => {
    // Ровно этот случай: учитель выбрал урок из каталога, пока ученик сидел на занятии.
    expect(knowsFocusTarget(SECTIONS, { sectionId: 1, materialId: 42 })).toBe(false)
  })

  it('не знает раздел, созданный после загрузки', () => {
    expect(knowsFocusTarget(SECTIONS, { sectionId: 99, materialId: 42 })).toBe(false)
  })

  it('считает известным раздел без материала в событии', () => {
    expect(knowsFocusTarget(SECTIONS, { sectionId: 2, materialId: null })).toBe(true)
    expect(knowsFocusTarget(SECTIONS, { sectionId: 2 })).toBe(true)
  })

  it('не знает материал в разделе, у которого материалов ещё нет', () => {
    expect(knowsFocusTarget(SECTIONS, { sectionId: 2, materialId: 3 })).toBe(false)
  })

  it('не требует перезагрузки, когда звать некуда', () => {
    // sectionId == null отсекается раньше в LiveLessonPage, но помощник не должен врать.
    expect(knowsFocusTarget(SECTIONS, { sectionId: null })).toBe(true)
    expect(knowsFocusTarget(SECTIONS, null)).toBe(true)
  })

  it('переживает пустой и отсутствующий список разделов', () => {
    expect(knowsFocusTarget([], { sectionId: 1, materialId: 3 })).toBe(false)
    expect(knowsFocusTarget(undefined, { sectionId: 1, materialId: 3 })).toBe(false)
  })
})
