import { describe, expect, it } from 'vitest'
import { DONE, NONE, PARTIAL, buildBlocks, ctaOf, currentLesson, examLeft, isMockDay, priorityRank, thirdVariant } from './todayTasks.js'
import { fmtMinutes, joinState, lessonClock, lessonDay, lessonStatus } from './lessonTime.js'
import { timingMode, timingSeenKey } from './timing.js'

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
    expect(ctaOf(b)).toMatchObject({ kind: 'continue', block: { key: 'errors' } })
    const half = buildBlocks({ lesson: null, today: { practiceToday: 5 }, practiceSize: 27, todayIso: TODAY })
    expect(half[1].state).toBe(PARTIAL)
    expect(ctaOf(half)).toMatchObject({ kind: 'continue', block: { key: 'words' } })
    expect(half[0].state).toBe(NONE)
  })

  it('кнопка: «Начать» до первого шага, «Всё сделано» — когда остался только слабый навык', () => {
    const fresh = buildBlocks({ lesson: lesson(2, TODAY), today: { practiceToday: 0, openErrors: 3 }, practiceSize: 27, todayIso: TODAY })
    expect(ctaOf(fresh)).toMatchObject({ kind: 'start', block: { key: 'words' } })
    const clean = buildBlocks({ lesson: lesson(2, TODAY), today: { practiceToday: 27, openErrors: 0, weakSkill: 'm.geo.circles' }, wordsState: DONE, practiceSize: 27, todayIso: TODAY })
    expect(ctaOf(clean)).toMatchObject({ kind: 'done', block: { key: 'weak', skillId: 'm.geo.circles' } })
    const noSkill = buildBlocks({ lesson: lesson(2, TODAY), today: { practiceToday: 27, openErrors: 0 }, wordsState: DONE, practiceSize: 27, todayIso: TODAY })
    expect(ctaOf(noSkill)).toEqual({ kind: 'done', block: null })
  })

  it('третий блок: вид и минуты по макету', () => {
    const [, , mock] = buildBlocks({ lesson: lesson(27, TODAY, 'MIXED'), today: {}, practiceSize: 22, todayIso: TODAY })
    const [, , errors] = buildBlocks({ lesson: lesson(2, TODAY), today: { openErrors: 2 }, practiceSize: 27, todayIso: TODAY })
    const [, , weak] = buildBlocks({ lesson: lesson(2, TODAY), today: { openErrors: 0 }, practiceSize: 27, todayIso: TODAY })
    expect([thirdVariant(mock), thirdVariant(errors), thirdVariant(weak)]).toEqual(['mock', 'errors', 'clear'])
    expect([errors.minutes, weak.minutes]).toEqual([15, 20])
  })

  it('приоритет домена — место в фокусе Bluebook', () => {
    expect(priorityRank('rw.eoi', ['rw.cas', 'rw.eoi'])).toBe(2)
    expect(priorityRank('rw.eoi', ['rw.cas'])).toBeNull()
    expect(priorityRank(null, null)).toBeNull()
  })

  it('до экзамена — неделями, последние две недели — днями', () => {
    expect(examLeft({ days: 45, weeks: 6 })).toEqual({ unit: 'weeks', n: 6 })
    expect(examLeft({ days: 9, weeks: 1 })).toEqual({ unit: 'days', n: 9 })
    expect(examLeft(null)).toBeNull()
  })
})

describe('блок занятия с преподавателем', () => {
  const at = (s) => Date.parse(s)
  const l = { startsAt: '2026-11-04T18:30:00+05:00', status: 'PLANNED' }

  it('день и часы — по Алматы, конец — через 90 минут', () => {
    expect(lessonDay(l.startsAt, TODAY)).toBe('today')
    expect(lessonDay(l.startsAt, '2026-11-03')).toBe('tomorrow')
    expect(lessonDay('2026-11-01T18:30:00+05:00', '2026-10-31')).toBe('tomorrow')
    expect(lessonDay(l.startsAt, '2026-11-01')).toBe('other')
    expect(lessonClock(l.startsAt)).toBe('18:30–20:00')
    expect(lessonClock('2026-11-04T23:00:00+05:00')).toBe('23:00–00:30')
  })

  it('до начала, идёт, прошло', () => {
    expect(lessonStatus(l.startsAt, at('2026-11-04T16:20:00+05:00'))).toEqual({ state: 'upcoming', minutesLeft: 130 })
    expect(lessonStatus(l.startsAt, at('2026-11-04T19:00:00+05:00')).state).toBe('live')
    expect(lessonStatus(l.startsAt, at('2026-11-04T20:00:00+05:00')).state).toBe('over')
  })

  it('«Подключиться»: ссылки на сервере пока нет — кнопка ждёт; со ссылкой открывается за 15 минут', () => {
    expect(joinState(l, at('2026-11-04T18:25:00+05:00'))).toBe('wait')
    const withUrl = { ...l, joinUrl: 'https://meet.example/x' }
    expect(joinState(withUrl, at('2026-11-04T18:00:00+05:00'))).toBe('wait')
    expect(joinState(withUrl, at('2026-11-04T18:15:00+05:00'))).toBe('open')
    expect(joinState(withUrl, at('2026-11-04T19:30:00+05:00'))).toBe('open')
    expect(joinState(withUrl, at('2026-11-04T20:01:00+05:00'))).toBe('hidden')
    expect(joinState({ ...l, status: 'DONE' }, at('2026-11-04T18:00:00+05:00'))).toBe('hidden')
  })

  it('минуты словами', () => {
    const t = (k, v) => `${k}:${JSON.stringify(v)}`
    expect(fmtMinutes(t, 130)).toBe('sat.tasks.hm:{"h":"2","m":"10"}')
    expect(fmtMinutes(t, 120)).toBe('sat.teach.h:{"h":"2"}')
    expect(fmtMinutes(t, 40)).toBe('sat.time.min:{"n":"40"}')
  })
})

describe('баннер сроков', () => {
  it('нехватка: первый раз полностью, потом одной строкой; впритык — плашка; хватает — ничего', () => {
    const short = { status: 'short', weeksLeft: 5, weeksNeeded: 8 }
    expect(timingMode(short, false)).toBe('full')
    expect(timingMode(short, true)).toBe('collapsed')
    expect(timingMode({ status: 'tight' }, true)).toBe('tight')
    expect(timingMode({ status: 'ok' }, false)).toBe('none')
    expect(timingMode(null, false)).toBe('none')
  })

  it('новая ситуация (другие цифры) — новый ключ: снова полностью', () => {
    expect(timingSeenKey({ status: 'short', weeksLeft: 5, weeksNeeded: 8 })).not.toBe(timingSeenKey({ status: 'short', weeksLeft: 4, weeksNeeded: 8 }))
  })
})

describe('время занятия', async () => {
  const { satLessonTime } = await import('./lessonTime.js')
  it('по Алматы и на языке интерфейса', () => {
    expect(satLessonTime('2026-10-05T19:00:00+05:00')).toBe('Пн 05.10 19:00')
    expect(satLessonTime('2026-10-10T18:30:00+05:00', 'en')).toBe('Sat 10.10 18:30')
  })
})
