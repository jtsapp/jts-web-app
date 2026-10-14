import { describe, it, expect } from 'vitest'
import { accuracy, domainRows, fmtMinutes, heatCells, practiceSummary, sortBadges, tone, windowTotals } from './stats.js'

const t = (k, v = {}) => `${k}:${Object.values(v).join('/')}`

describe('статистика дашборда', () => {
  it('точность без попыток — null, а не 0 %', () => {
    expect(accuracy(0, 0)).toBeNull()
    expect(accuracy(2, 3)).toBe(67)
  })

  it('тон полосы — пороги прототипа 80 / 50', () => {
    expect(tone(80)).toBe('ok')
    expect(tone(79)).toBe('mid')
    expect(tone(50)).toBe('mid')
    expect(tone(49)).toBe('low')
    expect(tone(null)).toBe('none')
  })

  it('домены: без пустых, R&W первыми, порядок таксономии', () => {
    const rows = domainRows(
      [
        { domain: 'm.alg', section: 'math', correct: 8, total: 10 },
        { domain: 'rw.eoi', section: 'rw', correct: 1, total: 4 },
        { domain: 'rw.cs', section: 'rw', correct: 3, total: 4 },
        { domain: 'm.adv', section: 'math', correct: 0, total: 0 },
      ],
      ['rw.cs', 'rw.eoi', 'm.alg', 'm.adv'],
    )
    expect(rows.map((r) => [r.domain, r.pct, r.tone])).toEqual([['rw.cs', 75, 'mid'], ['rw.eoi', 25, 'low'], ['m.alg', 80, 'ok']])
  })

  it('время: часы и минуты', () => {
    expect(fmtMinutes(45, t)).toBe('sat.prog.m:45')
    expect(fmtMinutes(135, t)).toBe('sat.prog.hm:2/15')
    expect(fmtMinutes(null, t)).toBe('sat.prog.m:0')
  })

  it('90 дней: недели столбцами с понедельника, уровни 0–4, хвост до окна — пустой', () => {
    const today = new Date(Date.UTC(2026, 9, 14)) // среда
    const cells = heatCells([{ date: '2026-10-14', solved: 8, correct: 6 }, { date: '2026-10-13', solved: 2, correct: 1 }], today)
    expect(cells[cells.length - 1]).toMatchObject({ date: '2026-10-14', solved: 8, lvl: 4, pad: false })
    expect(cells[cells.length - 2]).toMatchObject({ date: '2026-10-13', lvl: 1 })
    // первая клетка — понедельник
    expect(new Date(`${cells[0].date}T00:00:00Z`).getUTCDay()).toBe(1)
    const real = cells.filter((c) => !c.pad)
    expect(real).toHaveLength(90)
    expect(real[0].date).toBe('2026-07-17')
  })

  it('итог окна: активные дни и решено', () => {
    expect(windowTotals([{ solved: 3 }, { solved: 0 }, { solved: 5 }])).toEqual({ active: 2, solved: 8 })
  })

  it('бейджи: полученные первыми, новые выше', () => {
    const b = sortBadges([
      { id: 'streak7', earned: false },
      { id: 'firstMastered', earned: true, earnedAt: '2026-10-01' },
      { id: 'indep100', earned: true, earnedAt: '2026-10-10' },
    ])
    expect(b.map((x) => x.id)).toEqual(['indep100', 'firstMastered', 'streak7'])
  })
})

describe('итог набора «Практики»', () => {
  it('accuracy — целый процент от сервера; навыки слабые первыми', () => {
    const s = practiceSummary({
      correct: 7, total: 10, accuracy: 70, durationSeconds: 600,
      bySkill: [{ skillId: 'a', correct: 4, total: 4 }, { skillId: 'b', correct: 3, total: 6 }, { skillId: 'c', correct: 0, total: 0 }],
      masteredNow: ['a'],
    })
    expect(s.pct).toBe(70)
    expect(s.perQ).toBe(60)
    expect(s.skills.map((x) => [x.skillId, x.pct])).toEqual([['b', 50], ['a', 100]])
    expect(s.masteredNow).toEqual(['a'])
  })

  it('1 % — это 1 %, а не 100 %', () => {
    expect(practiceSummary({ correct: 0, total: 100, accuracy: 1 }).pct).toBe(1)
  })

  it('без accuracy считает сам, без итога — null', () => {
    expect(practiceSummary({ correct: 1, total: 4 }).pct).toBe(25)
    expect(practiceSummary(null)).toBeNull()
  })
})
