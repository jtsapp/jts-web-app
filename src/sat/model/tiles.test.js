import { describe, expect, it } from 'vitest'
import { lastScore, lessonsTile, percent, scoreTile } from './tiles.js'

/** Плитки «Прогресса» (ТЗ SAT 21.10, задача 10). */
describe('плитки SAT', () => {
  it('примерный балл — последний результат по дате, из любого источника', () => {
    expect(lastScore([])).toBeNull()
    expect(lastScore([
      { takenOn: '2026-10-03', total: 1160, source: 'BLUEBOOK' },
      { takenOn: '2026-10-31', total: 1250, source: 'SIMULATION', delta: 90 },
      { takenOn: '2026-10-20', total: 1200, source: 'PAPER' },
    ])).toMatchObject({ total: 1250, source: 'SIMULATION', delta: 90 })
  })

  it('отклонённый куратором не в счёт: плитка — прошлый засчитанный серым и чип «отклонён» (17:8454)', () => {
    const official = { takenOn: '2026-06-08', total: 1120, source: 'OFFICIAL' }
    const rejected = { takenOn: '2026-08-24', total: 1180, source: 'BLUEBOOK', reviewStatus: 'REJECTED' }
    expect(lastScore([official, rejected])).toBe(official)
    expect(scoreTile([official, rejected])).toEqual({ entry: official, rejected })
    const pending = { ...rejected, reviewStatus: 'PENDING' }
    expect(scoreTile([official, pending])).toEqual({ entry: pending, rejected: null })
    // отклонённый, но после него есть новый результат — о нём плитка уже не говорит
    const later = { takenOn: '2026-09-01', total: 1150, source: 'PAPER' }
    expect(scoreTile([official, rejected, later])).toEqual({ entry: later, rejected: null })
    expect(scoreTile([])).toEqual({ entry: null, rejected: null })
  })

  it('процент верных: без ответов — «нет данных», а не ноль', () => {
    expect(percent(0, 0)).toBeNull()
    expect(percent(7, 40)).toBe(18)
  })

  it('пройдено занятий: пакет и доля, до первого занятия — только пакет (17:10026)', () => {
    expect(lessonsTile(null)).toBeNull()
    expect(lessonsTile({ attended: 5, lessonCount: 24, packages: { base: true, extra: false } })).toEqual({ attended: 5, total: 24, pkg: 'base', pct: 21 })
    expect(lessonsTile({ attended: 5, lessonCount: 36, packages: { base: true, extra: true } })).toEqual({ attended: 5, total: 36, pkg: 'extra', pct: 14 })
    expect(lessonsTile({ attended: 0, lessonCount: 24 })).toEqual({ attended: 0, total: 24, pkg: 'base', pct: null })
  })
})
