import { describe, expect, it } from 'vitest'
import { MIN_FILL, checkpointWeek, phaseStrip, rhythm } from './phaseStrip.js'
// снято с живого бэкенда (22.10.2026): базовый пакет, группа с 05.10, активна фаза 2, Test 6 и 8 введены
import live from '../plan/__fixtures__/roadmap-live.json'

const r = live.roadmap.roadmap

/** Фазы как у SatRoadmap: n, key, kind, status, недели и занятия — только то, что читает полоса. */
const phase = (n, key, kind, status, extra = {}) => ({ n, key, kind, status, weekFrom: null, weekTo: null, lessonFrom: null, lessonTo: null, bluebookTest: null, ...extra })

describe('полоса фаз SAT (Figma «NEW 2», 17:5293)', () => {
  it('типы точек по виду фазы: тесты — точки, учёба — отрезки, самоподготовка — пунктир, экзамен — финиш', () => {
    const pts = phaseStrip(r, live.schedule)
    expect(pts.map((p) => [p.n, p.type])).toEqual([[1, 'cp'], [2, 'seg'], [3, 'cp'], [4, 'seg'], [5, 'cp'], [7, 'self'], [8, 'end']])
    expect(pts.filter((p) => p.here).map((p) => p.n)).toEqual([2])
  })

  it('подписи: неделя теста — конец учебной фазы перед ним, а не таблица', () => {
    const pts = phaseStrip(r, live.schedule)
    const by = Object.fromEntries(pts.map((p) => [p.n, p]))
    expect(by[1].sub).toEqual(['sat.strip.test', { n: '6' }])
    expect(by[3].sub).toEqual(['sat.strip.testWeek', { n: '4' }])
    expect(by[5].sub).toEqual(['sat.strip.testWeek', { n: '8' }])
    expect(by[2].sub).toEqual(['sat.strip.weeks', { a: '1', b: '4' }])
    expect(by[2].lessons).toBe(12)
    expect(by[7].sub).toEqual(['sat.strip.selfWeeks', { n: '1' }])
    expect(by[8].sub).toBeNull()
    expect(by[2].title).toBe('sat.strip.foundations1')
  })

  it('с Challenge Test 10 остаётся «нед. 8», а отрезок 6 помечен доп. пакетом', () => {
    const rm = {
      active: 6,
      phases: [
        phase(1, 'diagnostic', 'test', 'done', { bluebookTest: 6 }),
        phase(2, 'foundations1', 'lessons', 'done', { weekFrom: 1, weekTo: 4, lessonFrom: 1, lessonTo: 12 }),
        phase(3, 'test8', 'test', 'done', { bluebookTest: 8 }),
        phase(4, 'foundations2', 'lessons', 'done', { weekFrom: 5, weekTo: 8, lessonFrom: 13, lessonTo: 24 }),
        phase(5, 'test10', 'test', 'done', { bluebookTest: 10 }),
        phase(6, 'challenge', 'lessons', 'active', { weekFrom: 9, weekTo: 12, lessonFrom: 25, lessonTo: 36 }),
        phase(7, 'self', 'self', 'upcoming', { weekFrom: 13, weekTo: 14 }),
        phase(8, 'exam', 'exam', 'upcoming'),
      ],
    }
    expect(checkpointWeek(rm, 5)).toBe(8)
    const pts = phaseStrip(rm, { lessons: [] })
    const ch = pts.find((p) => p.n === 6)
    expect(ch).toMatchObject({ state: 'current', here: true, extra: true, lessons: 12, fill: MIN_FILL })
    expect(pts.find((p) => p.n === 7).sub).toEqual(['sat.strip.selfWeeks', { n: '2' }])
    expect(rhythm(rm)).toEqual(['lessons', 'test', 'lessons', 'test', 'lessons', 'self', 'exam'])
  })

  it('заполнение отрезка: пройденный — целиком, текущий — по отметкам, но не меньше заглушки, будущий — пустой', () => {
    const pts = phaseStrip(r, live.schedule)
    expect(pts.find((p) => p.n === 2).fill).toBe(MIN_FILL) // одно занятие из 12 отмечено — 8%, видна заглушка
    expect(pts.find((p) => p.n === 4).fill).toBe(0)
    const done = Array.from({ length: 9 }, (_, i) => ({ number: i + 1, status: 'DONE' }))
    expect(phaseStrip(r, { lessons: done }).find((p) => p.n === 2).fill).toBe(75)
  })

  it('линии точек: слева зелёная за пройденной фазой (у первой всегда), справа — за пройденной точкой', () => {
    const pts = phaseStrip(r, live.schedule)
    const by = Object.fromEntries(pts.map((p) => [p.n, p]))
    expect([by[1].left, by[1].right]).toEqual([true, true])
    // Test 8 введён, но фаза 2 ещё идёт: слева серая, справа зелёная
    expect([by[3].left, by[3].right]).toEqual([false, true])
    expect([by[5].left, by[5].right]).toEqual([false, false])
    expect(by[8].right).toBe(false)
  })

  it('тест без баллов после своей даты — «warn», и линия за ним уже зелёная', () => {
    const rm = {
      active: 4,
      phases: [
        phase(1, 'diagnostic', 'test', 'done', { bluebookTest: 6 }),
        phase(2, 'foundations1', 'lessons', 'done', { weekFrom: 1, weekTo: 4, lessonFrom: 1, lessonTo: 12 }),
        phase(3, 'test8', 'test', 'incomplete', { bluebookTest: 8 }),
        phase(4, 'foundations2', 'lessons', 'active', { weekFrom: 5, weekTo: 8, lessonFrom: 13, lessonTo: 24 }),
        phase(8, 'exam', 'exam', 'upcoming'),
      ],
    }
    const t8 = phaseStrip(rm, null).find((p) => p.n === 3)
    expect(t8).toMatchObject({ state: 'warn', left: true, right: true })
  })

  it('ритм программы — виды фаз после диагностики', () => {
    expect(rhythm(r)).toEqual(['lessons', 'test', 'lessons', 'test', 'self', 'exam'])
  })
})
