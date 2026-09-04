import { describe, it, expect } from 'vitest'
import { groupLessonsByMode, lessonModeLabel, lessonModeOf, sourceCode } from './catalogLessonModes.js'

// Урок лежит в каталоге тремя записями, и клиент рисовал их подряд: одно и то же
// название три раза без признака, чем строки отличаются, и счётчик юнита 9
// вместо 3. Правило свёртки — то же, что у админки, иначе один уровень выглядел
// бы по-разному у преподавателя и у ученика.

const lesson = (id, code, mode, title = 'Two hellos') => ({ id, code, mode, title, type: 'LESSON' })

describe('свёртка режимов каталога', () => {
  it('три записи одного урока — одна строка', () => {
    const groups = groupLessonsByMode([
      lesson(1, 'L01-SELF', 'SELF_STUDY'),
      lesson(2, 'L01-1TO1', 'ONE_TO_ONE'),
      lesson(3, 'L01-GROUP', 'GROUP'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].code).toBe('L01')
    expect(groups[0].entries.map((e) => e.id)).toEqual([1, 2, 3])
  })

  it('режимы идут в одном порядке независимо от порядка ответа сервера', () => {
    const groups = groupLessonsByMode([
      lesson(3, 'L01-GROUP', 'GROUP'),
      lesson(1, 'L01-SELF', 'SELF_STUDY'),
      lesson(2, 'L01-1TO1', 'ONE_TO_ONE'),
    ])
    expect(groups[0].entries.map((e) => e.mode)).toEqual(['SELF_STUDY', 'ONE_TO_ONE', 'GROUP'])
  })

  it('разные уроки не слипаются, даже когда названия совпали', () => {
    // «Two hellos» встречается на разных уровнях: склеить их по названию значило
    // бы потерять урок из каталога.
    const groups = groupLessonsByMode([
      lesson(1, 'L01-SELF', 'SELF_STUDY'),
      lesson(2, 'L02-SELF', 'SELF_STUDY'),
    ])
    expect(groups).toHaveLength(2)
  })

  it('уровень до появления режимов остаётся 1-to-1 и своей строкой', () => {
    const old = { id: 9, code: 'L07', title: 'Old', type: 'LESSON' }
    expect(lessonModeOf(old)).toBe('ONE_TO_ONE')
    expect(sourceCode(old)).toBe('L07')
    expect(groupLessonsByMode([old])).toHaveLength(1)
  })

  it('урок без кода не слипается с другими такими же', () => {
    const groups = groupLessonsByMode([
      { id: 1, title: 'A', mode: 'SELF_STUDY' },
      { id: 2, title: 'B', mode: 'SELF_STUDY' },
    ])
    expect(groups).toHaveLength(2)
  })

  it('подписи режимов — те же, что в админке', () => {
    expect(lessonModeLabel('SELF_STUDY')).toBe('Self study')
    expect(lessonModeLabel('ONE_TO_ONE')).toBe('1 to 1')
    expect(lessonModeLabel('GROUP')).toBe('Group')
    expect(lessonModeLabel(undefined)).toBe('1 to 1')
  })
})
