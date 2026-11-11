import { describe, it, expect } from 'vitest'
import { staticMirrorOf, isStaticMirror, pickSituationsLevel } from './backendMirrors.js'

// Ответ /mobile/situativki прода на 11.11.2026 (test_student) в нужной тесту
// части: те же 50 сценариев, что лежат статикой, slug situ-<уровень>-<NN>.
const mirror = (code, n, extra = {}) => ({
  id: n,
  slug: `situ-${code}-${String(n).padStart(2, '0')}`,
  level: code.toUpperCase(),
  title: 'Scenario',
  ...extra,
})

describe('staticMirrorOf — ситуативка бэкенда, повторяющая сценарий статики', () => {
  it('slug situ-b1-01 → первый сценарий B1', () => {
    expect(staticMirrorOf(mirror('b1', 1))).toEqual({ level: 'b1', id: 1 })
    expect(staticMirrorOf(mirror('c1', 10))).toEqual({ level: 'c1', id: 10 })
  })

  it('регистр и пробелы slug не мешают', () => {
    expect(staticMirrorOf({ slug: ' SITU-A2-03 ' })).toEqual({ level: 'a2', id: 3 })
  })

  it('своя ситуативка методиста — не зеркало', () => {
    expect(isStaticMirror({ slug: 'airport-checkin', level: 'B1' })).toBe(false)
    expect(isStaticMirror({ slug: null, level: 'B1' })).toBe(false)
    expect(isStaticMirror({})).toBe(false)
    expect(isStaticMirror(null)).toBe(false)
  })

  it('номера, которого в статике нет, и уровня без программы — не зеркало', () => {
    expect(isStaticMirror({ slug: 'situ-b1-00' })).toBe(false)
    expect(isStaticMirror({ slug: 'situ-b1-11' })).toBe(false)
    expect(isStaticMirror({ slug: 'situ-c2-01' })).toBe(false)
    expect(isStaticMirror({ slug: 'situ-a0-01' })).toBe(false)
  })
})

describe('pickSituationsLevel — чьи сценарии статики показывать', () => {
  const CODES = ['a1', 'a2', 'b1', 'b2', 'c1']

  it('«Все» без замков — A1, как и раньше', () => {
    expect(pickSituationsLevel(null, CODES, new Set())).toBe('a1')
  })

  it('«Все» при закрытом A1 — первый открытый уровень (прод, test_student)', () => {
    expect(pickSituationsLevel(null, CODES, new Set(['a1', 'a2', 'b2', 'c1']))).toBe('b1')
  })

  it('«Все» при всех закрытых — ничего', () => {
    expect(pickSituationsLevel(null, CODES, new Set(CODES))).toBeNull()
  })

  it('выбранный уровень не подменяется соседним, даже закрытый', () => {
    expect(pickSituationsLevel('A2', CODES, new Set(['a2']))).toBe('a2')
    expect(pickSituationsLevel('B2', CODES, new Set())).toBe('b2')
  })

  it('C2 — ближайший C1, как раньше', () => {
    expect(pickSituationsLevel('C2', CODES, new Set())).toBe('c1')
  })
})
