// Сводка минут: границы недели и сведение сырых цифр. БД не трогаем — в
// loadEcosystemWeek подсовываем поддельный sql-тег.
import { describe, it, expect } from 'vitest'
import { weekBounds, buildWeeklySummary, loadEcosystemWeek, TRACKED } from './ecosystem.js'

describe('weekBounds', () => {
  it('среда отдаёт понедельник своей недели', () => {
    const b = weekBounds(new Date('2026-09-09T12:00:00Z')) // среда
    expect(b.weekStart).toBe('2026-09-07')
    expect(b.weekEndExclusive).toBe('2026-09-14')
  })

  it('воскресенье остаётся в своей неделе, а не уезжает в следующую', () => {
    // Классическая ошибка getDay()===0: воскресенье принимают за начало недели.
    const b = weekBounds(new Date('2026-09-13T23:59:00Z'))
    expect(b.weekStart).toBe('2026-09-07')
    expect(b.weekEndExclusive).toBe('2026-09-14')
  })

  it('понедельник — сам себе начало', () => {
    expect(weekBounds(new Date('2026-09-07T00:00:00Z')).weekStart).toBe('2026-09-07')
  })

  it('ключ недели совпадает с ключом бюджета шэдоуинга', () => {
    expect(weekBounds(new Date('2026-09-09T12:00:00Z')).weekKey).toMatch(/^\d{4}-W\d{2}$/)
  })
})

describe('buildWeeklySummary', () => {
  it('секунды разговора округляются в минуты', () => {
    const m = buildWeeklySummary({ voiceSeconds: 3630 })
    expect(m.ai_tutor.actualMinutes).toBe(61)
    expect(m.ai_tutor.tracked).toBe('measured')
  })

  it('кредиты шэдоуинга считаются по 30 секунд и помечены как оценка', () => {
    const m = buildWeeklySummary({ shadowingCredits: 4 }) // 4 × 30 с = 2 мин
    expect(m.shadowing.actualMinutes).toBe(2)
    expect(m.shadowing.tracked).toBe('estimated')
  })

  it('неизмеряемые модули отдают ноль и честный флаг', () => {
    const m = buildWeeklySummary({})
    for (const key of ['workbooks', 'media_practice', 'vocabulary_sr']) {
      expect(`${key}: ${m[key].actualMinutes} ${m[key].tracked}`).toBe(`${key}: 0 none`)
    }
  })

  it('без плана целей нет — дефицит показывать не от чего', () => {
    const m = buildWeeklySummary({ voiceSeconds: 600 })
    expect(m.ai_tutor.targetMinutes).toBeNull()
  })

  it('с планом цели совпадают с разбивкой калькулятора', () => {
    const m = buildWeeklySummary({ homeworkMinutesPerDay: 30 })
    expect(m.ai_tutor.targetMinutes).toBe(63)
    expect(m.workbooks.targetMinutes).toBe(53)
    expect(m.vocabulary_sr.targetMinutes).toBe(32)
  })

  it('в сводке ровно пять модулей ТЗ', () => {
    expect(Object.keys(buildWeeklySummary({}))).toEqual(Object.keys(TRACKED))
  })
})

describe('loadEcosystemWeek', () => {
  it('без базы отдаёт нули, а не падает', async () => {
    const week = await loadEcosystemWeek('user-1', new Date('2026-09-09T12:00:00Z'), null)
    expect(week.voiceSeconds).toBe(0)
    expect(week.shadowingCredits).toBe(0)
    expect(week.weekStart).toBe('2026-09-07')
  })

  it('собирает оба запроса в одну сводку', async () => {
    // Поддельный тег: отвечает по тексту запроса, чтобы не зависеть от порядка.
    const fakeSql = (strings) => {
      const q = strings.join(' ')
      if (q.includes('voice_usage')) return Promise.resolve([{ seconds: 1800 }])
      if (q.includes('shadowing_assess')) return Promise.resolve([{ used: 6 }])
      return Promise.resolve([])
    }
    const week = await loadEcosystemWeek('user-1', new Date('2026-09-09T12:00:00Z'), fakeSql)
    expect(week).toMatchObject({ voiceSeconds: 1800, shadowingCredits: 6 })

    const m = buildWeeklySummary({ ...week, homeworkMinutesPerDay: 30 })
    expect(m.ai_tutor.actualMinutes).toBe(30)
    expect(m.shadowing.actualMinutes).toBe(3)
  })

  // lesson_progress в нашей базе — это сценарии тьютора и старый «План уроков»,
  // а не силлабус «Обучения». Сводка не должна его читать: цифра выглядела бы
  // как completed_lessons из ТЗ, а считала бы другое.
  it('в базу за прогрессом уроков не ходит', async () => {
    const queries = []
    await loadEcosystemWeek('user-1', new Date('2026-09-09T12:00:00Z'), (strings) => {
      queries.push(strings.join(' '))
      return Promise.resolve([])
    })
    expect(queries.some((q) => q.includes('lesson_progress'))).toBe(false)
  })

  it('пустые строки в базе — тоже нули', async () => {
    const week = await loadEcosystemWeek('user-1', new Date('2026-09-09T12:00:00Z'), () =>
      Promise.resolve([]),
    )
    expect(week).toMatchObject({ voiceSeconds: 0, shadowingCredits: 0 })
  })
})
