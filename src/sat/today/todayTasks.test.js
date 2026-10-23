import { describe, expect, it } from 'vitest'
import { DONE, NONE, PARTIAL, buildBlocks, currentLesson, firstOpen, isMockDay } from './todayTasks.js'

const TODAY = '2026-11-04'
const lesson = (n, day, section = 'RW', status = 'PLANNED') => ({ number: n, startsAt: `${day}T19:00:00+05:00`, section, status })

/** «Задания на сегодня» (ТЗ SAT 21.10, задача 11). */
describe('задания на сегодня', () => {
  it('занятие — сегодняшнее, иначе ближайшее непроведённое', () => {
    const s = { lessons: [lesson(1, '2026-11-02', 'RW', 'DONE'), lesson(2, '2026-11-04'), lesson(3, '2026-11-06')] }
    expect(currentLesson(s, TODAY).number).toBe(2)
    expect(currentLesson(s, '2026-11-05').number).toBe(3)
    expect(currentLesson({ lessons: [] }, TODAY)).toBeNull()
  })

  it('симуляция — только в её день по программе', () => {
    expect(isMockDay(lesson(27, TODAY, 'MIXED'), TODAY)).toBe(true)
    expect(isMockDay(lesson(27, '2026-11-05', 'MIXED'), TODAY)).toBe(false)
    expect(isMockDay(lesson(2, TODAY), TODAY)).toBe(false)
  })

  it('обычный день: третий блок — ошибки; без ошибок — слабый навык, а не пусто', () => {
    const withErrors = buildBlocks({ lesson: lesson(2, TODAY), today: { practiceToday: 0, openErrors: 3, reviewedToday: 1 }, practiceSize: 27, todayIso: TODAY })
    expect(withErrors.map((b) => b.key)).toEqual(['words', 'practice', 'errors'])
    expect(withErrors[2].state).toBe(PARTIAL)
    const clean = buildBlocks({ lesson: lesson(2, TODAY), today: { practiceToday: 0, openErrors: 0, weakSkill: 'm.geo.circles' }, practiceSize: 22, todayIso: TODAY })
    expect(clean[2]).toMatchObject({ key: 'weak', skillId: 'm.geo.circles', noErrors: true })
  })

  it('в день симуляции третий блок — пробник с её состоянием', () => {
    const b = buildBlocks({ lesson: lesson(27, TODAY, 'MIXED'), today: { practiceToday: 0, openErrors: 2, mock: 'finished' }, practiceSize: 22, todayIso: TODAY })
    expect(b[2]).toMatchObject({ key: 'mock', state: DONE, minutes: 135 })
  })

  it('практика: частично и выполнено; кнопка — в первый невыполненный блок', () => {
    const b = buildBlocks({ lesson: lesson(2, TODAY), today: { practiceToday: 27, openErrors: 1 }, wordsState: DONE, practiceSize: 27, todayIso: TODAY })
    expect(b[1].state).toBe(DONE)
    expect(firstOpen(b).key).toBe('errors')
    const half = buildBlocks({ lesson: null, today: { practiceToday: 5 }, practiceSize: 27, todayIso: TODAY })
    expect(half[1].state).toBe(PARTIAL)
    expect(firstOpen(half).key).toBe('words')
    expect(half[0].state).toBe(NONE)
  })
})

describe('время занятия', async () => {
  const { satLessonTime } = await import('./lessonTime.js')
  it('по Алматы и на языке интерфейса', () => {
    expect(satLessonTime('2026-10-05T19:00:00+05:00')).toBe('Пн 05.10 19:00')
    expect(satLessonTime('2026-10-10T18:30:00+05:00', 'en')).toBe('Sat 10.10 18:30')
  })
})
