import { describe, it, expect } from 'vitest'
import { groupLessonsByMode, lessonMode, sourceCode } from './catalogModes.js'

const lesson = (id, code, mode, title = 'Two hellos') => ({ id, code, mode, title, type: 'LESSON' })

describe('catalogModes', () => {
  it('снимает суффикс режима с кода', () => {
    expect(sourceCode(lesson(1, 'L01-1TO1', 'ONE_TO_ONE'))).toBe('L01')
    expect(sourceCode(lesson(2, 'L01-GROUP', 'GROUP'))).toBe('L01')
    expect(sourceCode(lesson(3, 'L01', 'SELF_STUDY'))).toBe('L01')
  })

  it('уровень, залитый до появления режимов, считается 1-to-1', () => {
    expect(lessonMode({ code: 'L01' })).toBe('ONE_TO_ONE')
    expect(lessonMode({ code: 'L01', mode: 'SELF_STUDY' })).toBe('SELF_STUDY')
  })

  it('три записи одного урока становятся одной строкой', () => {
    const groups = groupLessonsByMode([
      lesson(1, 'L01', 'SELF_STUDY'),
      lesson(2, 'L01-1TO1', 'ONE_TO_ONE'),
      lesson(3, 'L01-GROUP', 'GROUP'),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe('Two hellos')
    expect(groups[0].entries.map((e) => e.id)).toEqual([1, 2, 3])
  })

  it('режимы идут в одном порядке независимо от порядка ответа сервера', () => {
    const groups = groupLessonsByMode([
      lesson(3, 'L01-GROUP', 'GROUP'),
      lesson(2, 'L01-1TO1', 'ONE_TO_ONE'),
      lesson(1, 'L01', 'SELF_STUDY'),
    ])

    expect(groups[0].entries.map((e) => e.mode)).toEqual(['SELF_STUDY', 'ONE_TO_ONE', 'GROUP'])
  })

  it('разные уроки не слипаются', () => {
    const groups = groupLessonsByMode([
      lesson(1, 'L01', 'SELF_STUDY', 'Two hellos'),
      lesson(2, 'L02', 'SELF_STUDY', 'PIN codes'),
    ])

    expect(groups.map((g) => g.title)).toEqual(['Two hellos', 'PIN codes'])
  })

  it('записи без кода остаются отдельными строками', () => {
    const groups = groupLessonsByMode([
      { id: 7, title: 'Старый урок' },
      { id: 8, title: 'Другой старый' },
    ])

    expect(groups).toHaveLength(2)
  })
})
