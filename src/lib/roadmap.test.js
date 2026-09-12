// Приёмочные критерии ТЗ «Roadmap & AI Notification Engine» v2.0 (п.10) плюс
// граничные случаи, которые в ТЗ описаны словами, но вектора не имеют.
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  SYLLABUS_LESSONS,
  LEVELS,
  totalLessons,
  weeklyLessons,
  hwAccelerationFactor,
  estimateWeeks,
  splitEcosystemMinutes,
  addDays,
  generateRoadmap,
  RoadmapValidationError,
} from './roadmap.js'

describe('силлабус', () => {
  // Константа плана и реальный контент курса — два места, где живёт одно и то же
  // число уроков. Если методист добавит урок в public/course, дедлайн обязан
  // поехать вместе с ним, а не молча остаться прежним.
  it('совпадает с числом уроков в public/course', () => {
    const root = join(process.cwd(), 'public', 'course')
    for (const [level, expected] of Object.entries(SYLLABUS_LESSONS)) {
      const dir = join(root, level.toLowerCase())
      if (!existsSync(dir)) continue // уровень ещё не выгружен — не повод падать
      const lessons = readdirSync(dir).filter((f) => /^steps-\d+\.json$/.test(f))
      expect(`${level}: ${lessons.length}`).toBe(`${level}: ${expected}`)
    }
  })
})

describe('totalLessons', () => {
  it('суммирует курсы по ступеням', () => {
    expect(totalLessons('A0', 'A1')).toBe(24)
    expect(totalLessons('A1', 'A2')).toBe(32)
    expect(totalLessons('A0', 'C1')).toBe(176)
  })

  // Решено считать по таблице силлабуса п.4 (24+32+36), а не по QA №1 с его 56.
  // Тест стоит, чтобы цифру не «поправили» обратно по приёмочному критерию:
  // расхождение в самом ТЗ, решение принято на нашей стороне.
  it('A0 → B1 даёт 92 по таблице силлабуса (в ТЗ QA №1 стоит 56)', () => {
    expect(totalLessons('A0', 'B1')).toBe(92)
  })

  it('цель не выше текущего уровня — ошибка валидации', () => {
    expect(() => totalLessons('A2', 'A2')).toThrow(RoadmapValidationError)
    expect(() => totalLessons('B2', 'B1')).toThrow(/must be higher/)
    try {
      totalLessons('B2', 'B1')
    } catch (e) {
      expect(e.code).toBe('TARGET_NOT_ABOVE_CURRENT')
    }
  })

  it('неизвестный уровень — ошибка валидации', () => {
    expect(() => totalLessons('A0', 'C2')).toThrow(/Unknown level/)
  })

  it('регистр уровня не важен', () => {
    expect(totalLessons('a0', 'a1')).toBe(24)
  })
})

describe('пропускная способность и K_hw', () => {
  it('с преподавателем — это число сессий в неделю', () => {
    expect(weeklyLessons({ learningFormat: 'individual_60', sessionsPerWeek: 3 })).toBe(3)
  })

  it('self-study считает уроки по времени: 90 минут ≈ урок', () => {
    // 30 мин × 5 дней = 150 мин ≈ 1.67 урока в неделю
    expect(weeklyLessons({ learningFormat: 'self_study', homeworkMinutesPerDay: 30 })).toBeCloseTo(
      150 / 90,
      6,
    )
  })

  it('30 мин ДЗ/день дают фактор 0.9475 (в ответе ТЗ округлено до 0.947)', () => {
    expect(hwAccelerationFactor(30, 'individual_60')).toBeCloseTo(0.9475, 6)
  })

  it('ускорение упирается в потолок 20%', () => {
    // Потолок включается с 800 минут ДЗ в неделю (≈115 мин/день) и дальше не растёт.
    expect(hwAccelerationFactor(120, 'individual_60')).toBeCloseTo(0.8, 6)
    expect(hwAccelerationFactor(600, 'individual_60')).toBeCloseTo(0.8, 6)
    // А 90 мин/день до потолка не дотягивают — 630 мин/нед дают −15.75%.
    expect(hwAccelerationFactor(90, 'individual_60')).toBeCloseTo(0.8425, 6)
  })

  it('у self-study ДЗ не засчитывается второй раз', () => {
    expect(hwAccelerationFactor(30, 'self_study')).toBe(1)
  })

  it('нулевая пропускная способность — ошибка, а не бесконечный срок', () => {
    expect(() =>
      estimateWeeks({ totalLessons: 24, learningFormat: 'self_study', homeworkMinutesPerDay: 0 }),
    ).toThrow(/Weekly capacity is zero/)
  })
})

describe('срок в неделях', () => {
  // ТЗ п.10, критерий №1 — формула целиком: 56 уроков, individual_60, 3 сессии в
  // неделю, 30 мин ДЗ/день → 17 недель. Уроки подставлены руками: цифру 56 мы не
  // используем (см. totalLessons), но сама математика ТЗ обязана сходиться.
  it('56 уроков, individual_60, 3 сессии, 30 мин ДЗ → 17 недель', () => {
    const r = estimateWeeks({
      totalLessons: 56,
      learningFormat: 'individual_60',
      sessionsPerWeek: 3,
      homeworkMinutesPerDay: 30,
    })
    expect(r.weeks).toBe(17)
    expect(r.kEff).toBe(0.8)
    expect(r.kHw).toBeCloseTo(0.9475, 6)
  })

  it('округляет вверх до целой недели', () => {
    // 24 урока / 3 в неделю × 1.0 × 1.0 × 1.15 = 9.2 → 10
    expect(
      estimateWeeks({ totalLessons: 24, learningFormat: 'group', sessionsPerWeek: 3 }).weeks,
    ).toBe(10)
  })
})

describe('splitEcosystemMinutes', () => {
  // ТЗ п.10, критерий №2.
  it('210 минут режутся ровно как в приёмочном векторе', () => {
    expect(splitEcosystemMinutes(210)).toEqual({
      ai_tutor: 63,
      workbooks: 53,
      shadowing: 31,
      media_practice: 31,
      vocabulary_sr: 32,
    })
  })

  it('сумма всегда равна фонду — без потерь и лишних минут', () => {
    for (let minutes = 0; minutes <= 700; minutes += 1) {
      const parts = splitEcosystemMinutes(minutes)
      const sum = Object.values(parts).reduce((a, b) => a + b, 0)
      expect(`${minutes} → ${sum}`).toBe(`${minutes} → ${minutes}`)
    }
  })

  it('нулевой фонд обнуляет все нормативы', () => {
    expect(splitEcosystemMinutes(0)).toEqual({
      ai_tutor: 0,
      workbooks: 0,
      shadowing: 0,
      media_practice: 0,
      vocabulary_sr: 0,
    })
  })
})

describe('addDays', () => {
  it('переносит через границу года', () => {
    expect(addDays('2026-09-15', 17 * 7)).toBe('2027-01-12')
  })

  it('учитывает високосный февраль', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('ругается на неверный формат', () => {
    expect(() => addDays('15.09.2026', 7)).toThrow(/YYYY-MM-DD/)
  })
})

describe('generateRoadmap', () => {
  it('собирает план целиком', () => {
    const plan = generateRoadmap({
      currentLevel: 'A0',
      targetLevel: 'B1',
      learningFormat: 'individual_60',
      sessionsPerWeek: 3,
      homeworkMinutesPerDay: 30,
      startDate: '2026-09-15',
    })
    expect(plan.calculationResults.totalLessonsRequired).toBe(92)
    expect(plan.calculationResults.estimatedWeeks).toBe(27)
    expect(plan.calculationResults.completionDate).toBe(
      addDays('2026-09-15', 27 * 7),
    )
    expect(plan.weeklyEcosystemGoalsMinutes).toEqual({
      totalWeeklyMinutes: 210,
      ai_tutor: 63,
      workbooks: 53,
      shadowing: 31,
      media_practice: 31,
      vocabulary_sr: 32,
    })
  })

  it('нулевое ДЗ: нормативы по нулям, срок только на уроках с преподавателем', () => {
    const plan = generateRoadmap({
      currentLevel: 'A0',
      targetLevel: 'A1',
      learningFormat: 'group',
      sessionsPerWeek: 2,
      homeworkMinutesPerDay: 0,
      startDate: '2026-09-15',
    })
    expect(plan.weeklyEcosystemGoalsMinutes.totalWeeklyMinutes).toBe(0)
    expect(plan.weeklyEcosystemGoalsMinutes.ai_tutor).toBe(0)
    // 24 / 2 × 1.0 × 1.0 × 1.15 = 13.8 → 14 недель
    expect(plan.calculationResults.estimatedWeeks).toBe(14)
  })

  it('план строится для каждой пары «текущий → следующий»', () => {
    for (let i = 0; i < LEVELS.length - 1; i += 1) {
      const plan = generateRoadmap({
        currentLevel: LEVELS[i],
        targetLevel: LEVELS[i + 1],
        learningFormat: 'self_study',
        homeworkMinutesPerDay: 40,
        startDate: '2026-09-15',
      })
      expect(plan.calculationResults.totalLessonsRequired).toBeGreaterThan(0)
      expect(plan.calculationResults.estimatedWeeks).toBeGreaterThan(0)
    }
  })
})
