import { describe, it, expect } from 'vitest'
import { joinNumbers, localDeadline, nextSection, unansweredNumbers } from './mockSession.js'
import { criteriaLine, weakestSection } from './MockScreens.jsx'

describe('полный mock — правила экрана', () => {
  it('часы секции считаются от серверного «сейчас», а не от часов устройства', () => {
    // сервер: до конца 10 минут; часы ученика спешат на час — таймер всё равно 10 минут
    const s = { serverNow: '2026-10-08T12:00:00', sectionDeadline: '2026-10-08T12:10:00' }
    expect(localDeadline(s, 5_000_000)).toBe(5_000_000 + 600_000)
    expect(localDeadline({ serverNow: s.serverNow }, 1)).toBeNull()
  })

  it('следующая секция — первая без сданных попыток', () => {
    const sections = [
      { name: 'listening', attemptIds: [1] },
      { name: 'reading', attemptIds: [2] },
      { name: 'writing', attemptIds: [] },
      { name: 'speaking', attemptIds: [] },
    ]
    expect(nextSection({ sections })).toBe('writing')
    expect(nextSection({ sections: sections.map((x) => ({ ...x, attemptIds: [9] })) })).toBeNull()
  })

  it('номера без ответа — как в макете, длинный хвост сворачивается без двойной точки', () => {
    const items = [{ id: 'a', numbers: [28] }, { id: 'b', numbers: [34, 35] }, { id: 'c', numbers: [39] }]
    const nums = unansweredNumbers(items, { b: ['A', 'B'] }, (v) => v != null && v !== '')
    expect(joinNumbers(nums)).toBe('28 и 39')
    expect(joinNumbers([1, 2, 3, 4, 5, 6, 7, 8], 'и', 6, (k) => `ещё ${k}`)).toBe('1, 2, 3, 4, 5, 6 и ещё 2')
  })

  it('критерии Writing — по Task 2, Speaking — среднее частей', () => {
    const w = { name: 'writing', parts: [{ criteria: { taskResponse: 5 } }, { criteria: { taskResponse: 6, coherenceCohesion: 6.5 } }] }
    expect(criteriaLine(w)).toBe('TR 6.0 · CC 6.5')
    const s = { name: 'speaking', parts: [{ criteria: { fluencyCoherence: 6 } }, { criteria: { fluencyCoherence: 7 } }] }
    expect(criteriaLine(s)).toBe('Fluency 6.5')
  })

  it('рекомендация — слабейшая секция, только когда оценены все четыре', () => {
    const sections = [{ name: 'listening', band: 7 }, { name: 'reading', band: 6.5 }, { name: 'writing', band: 6 }, { name: 'speaking', band: 6.5 }]
    expect(weakestSection({ sections }).name).toBe('writing')
    expect(weakestSection({ sections: sections.slice(0, 3) })).toBeNull()
  })
})
