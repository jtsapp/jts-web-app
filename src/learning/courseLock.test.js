import { describe, it, expect } from 'vitest'
import { lessonUnlocked } from './courseLock.js'

const trail = ['L1', 'L2', 'L3', 'T1', 'L4'].map((code) => ({ code }))
const at = (i, extra = {}) => lessonUnlocked(i, { trail, done: new Set(), ...extra })

describe('замок урока на тропе', () => {
  it('первый открыт, следующий — только после пройденного предыдущего', () => {
    expect(at(0)).toBe(true)
    expect(at(1)).toBe(false)
    expect(at(1, { done: new Set(['L1']) })).toBe(true)
    // Тропа идёт подряд: пройденный L1 не открывает L3 через голову L2.
    expect(at(2, { done: new Set(['L1']) })).toBe(false)
  })

  it('модуль закрыт админом — закрыто всё, даже первый', () => {
    expect(at(0, { moduleLocked: true })).toBe(false)
  })

  it('квота закрывает новые узлы, но не пройденные', () => {
    const done = new Set(['L1', 'L2', 'L3'])
    expect(at(3, { done, moduleQuota: 3 })).toBe(false)
    expect(at(2, { done, moduleQuota: 1 })).toBe(true)
  })

  it('unlockAll снимает последовательность, но не квоту и не закрытый модуль', () => {
    expect(at(4, { unlockAll: true })).toBe(true)
    expect(at(4, { unlockAll: true, moduleQuota: 2 })).toBe(false)
    expect(at(4, { unlockAll: true, moduleLocked: true })).toBe(false)
  })
})
