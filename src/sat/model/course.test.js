import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { COURSE, clampPart, isDone, months, neighbours, partTitle, phaseOf, sectionOf, states, lessonByCode, withN } from './course.js'

describe('course model', () => {
  it('36 юнитов: 24 по темам и Challenge 1–12, номера подряд, три месяца', () => {
    expect(COURSE.lessons).toHaveLength(36)
    expect(COURSE.lessons.map((l) => l.n).sort((a, b) => a - b)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1))
    expect(COURSE.phases.map((p) => [p.from, p.to])).toEqual([[1, 12], [13, 24], [25, 36]])
    expect(COURSE.lessons.filter((l) => l.hard)).toHaveLength(12)
  })

  it('у каждого из U1–U24 есть письменный урок в public/sat/course', () => {
    for (let i = 1; i <= 24; i++) {
      const code = `U${i}`
      expect(COURSE.teach[code]?.parts, code).toBeGreaterThan(0)
      const file = path.resolve(__dirname, '../../../public/sat/course', `${code}.json`)
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'))
      expect(doc.parts).toHaveLength(COURSE.teach[code].parts)
      // текст курса — разметка без скриптов и обработчиков: её вставляет страница юнита
      expect(JSON.stringify(doc)).not.toMatch(/<script|\son[a-z]+=|javascript:/i)
    }
  })

  it('секция и месяц юнита', () => {
    expect(sectionOf(lessonByCode('U1'))).toBe('rw')
    expect(sectionOf(lessonByCode('U3'))).toBe('math')
    expect(sectionOf(lessonByCode('CH1'))).toBe('both')
    expect(phaseOf(13).id).toBe('month2')
  })

  it('соседи по порядку курса', () => {
    expect(neighbours('U1').prev).toBeNull()
    expect(neighbours('U1').next.code).toBe('U2')
    expect(neighbours('U24').next.code).toBe('CH1')
    expect(neighbours('CH12').next).toBeNull()
  })

  it('пройден — сданный набор; без набора — дочитанный урок; текущий — первый непройденный', () => {
    const progress = { U1: { questions: 10, finished: true }, U2: { questions: 10, finished: false } }
    expect(isDone(lessonByCode('U1'), progress)).toBe(true)
    // у U2 есть набор: дочитанного урока мало
    expect(isDone(lessonByCode('U2'), progress, new Set(['U2']))).toBe(false)
    // у U3 набора нет: дочитанный урок — пройден
    expect(isDone(lessonByCode('U3'), progress, new Set(['U3']))).toBe(true)
    const st = states(progress, new Set(['U3']))
    expect(st.U1).toBe('done')
    expect(st.U2).toBe('current')
    expect(st.U3).toBe('done')
    expect(st.U4).toBe('ahead')
  })

  it('месяцы с фильтром секции; Challenge — при любом фильтре', () => {
    const rw = months('rw')
    expect(rw[0].lessons.every((l) => sectionOf(l) === 'rw')).toBe(true)
    expect(rw[2].lessons).toHaveLength(12)
    expect(months('all')[0].lessons).toHaveLength(12)
    expect(months('all')[0].test.id).toBe('pt8')
  })

  it('мелочи', () => {
    expect(clampPart('7', 5)).toBe(4)
    expect(clampPart('x', 5)).toBe(0)
    expect(partTitle('Part 2 · The four-step method')).toBe('The four-step method')
    expect(withN('Word list #N', 7)).toBe('Word list #7')
  })
})
