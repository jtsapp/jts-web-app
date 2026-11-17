import { describe, it, expect } from 'vitest'
import { staticMirrorOf, isStaticMirror, pickSituationsLevels } from './backendMirrors.js'

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

describe('pickSituationsLevels — чьи сценарии статики показывать', () => {
  const CODES = ['a1', 'a2', 'b1', 'b2', 'c1']

  // До 18.11.2026 «Все» брала один уровень (сначала всегда A1, с 11.11 — первый
  // открытый), и из пятидесяти сценариев, заведённых в админке, на экране было
  // десять.
  it('«Все» без замков — все пять уровней по порядку', () => {
    expect(pickSituationsLevels(null, CODES, new Set())).toEqual(CODES)
  })

  it('«Все» с замками — только открытые (прод, test_student: тариф открывает один B1)', () => {
    expect(pickSituationsLevels(null, CODES, new Set(['a1', 'a2', 'b2', 'c1']))).toEqual(['b1'])
  })

  it('«Все» при всех закрытых — ничего', () => {
    expect(pickSituationsLevels(null, CODES, new Set(CODES))).toEqual([])
  })

  it('выбранный уровень — он один и не подменяется соседним, даже закрытый', () => {
    expect(pickSituationsLevels('A2', CODES, new Set(['a2']))).toEqual(['a2'])
    expect(pickSituationsLevels('B2', CODES, new Set())).toEqual(['b2'])
  })

  it('C2 — ближайший C1, как раньше', () => {
    expect(pickSituationsLevels('C2', CODES, new Set())).toEqual(['c1'])
  })
})
