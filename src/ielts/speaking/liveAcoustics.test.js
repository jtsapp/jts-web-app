import { describe, it, expect } from 'vitest'
import { acousticStats, wordsPerMinute } from './liveAcoustics.js'

const run = (pattern) => [...pattern].map((c) => ({ voiced: c === 'x' }))

describe('живая акустика Speaking', () => {
  it('доля речи — от первого слова, тишина до него не в счёт', () => {
    // 10 кадров тишины, потом 6 речи и 4 тишины (кадр 100 мс)
    expect(acousticStats(run('..........xxxxxx....'))).toEqual({ speechShare: 60, longPauses: 0 })
    expect(acousticStats(run('......'))).toEqual({ speechShare: null, longPauses: 0 })
  })

  it('пауза — от 2 с тишины между словами, и в хвосте тоже', () => {
    const twoSec = '.'.repeat(20)
    expect(acousticStats(run(`xx${twoSec}xx${'.'.repeat(19)}xx`)).longPauses).toBe(1)
    expect(acousticStats(run(`xx${twoSec}`)).longPauses).toBe(1)
  })

  it('слов в минуту — только после 10 с речи', () => {
    expect(wordsPerMinute(20, 8)).toBeNull()
    expect(wordsPerMinute(0, 30)).toBeNull()
    expect(wordsPerMinute(59, 30)).toBe(118)
  })
})
