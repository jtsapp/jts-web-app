import { describe, expect, it } from 'vitest'
import { mergePunctuation, normalize } from './progress.js'

describe('прогресс Punctuation World', () => {
  it('normalize берёт только известную форму: страницы — числами, звёзды — 1–3, вид и приключение — не сюда', () => {
    expect(normalize(null)).toEqual({ read: {}, p: {}, fin: 0 })
    expect(
      normalize({
        read: { 1: 1, 7: true, junk: 1, 3: 0 },
        p: { 1: 2, 7: 5, 2: 0, x: 3, 4: 1.7 },
        fin: -1,
        tr: 'kk',
        mute: true,
        run: { 1: { s: 2, res: [1], marks: {} } },
      }),
    ).toEqual({ read: { 1: 1, 7: 1 }, p: { 1: 2, 7: 3, 4: 1 }, fin: 0 })
  })

  it('merge двух устройств: прочитанное объединяется, звёзды — лучшие', () => {
    const phone = { read: { 1: 1, 2: 1 }, p: { 1: 3, 2: 1 }, fin: 0 }
    const laptop = { read: { 7: 1 }, p: { 2: 2, 7: 1 }, fin: 1 }
    expect(mergePunctuation(phone, laptop)).toEqual({ read: { 1: 1, 2: 1, 7: 1 }, p: { 1: 3, 2: 2, 7: 1 }, fin: 1 })
    // порядок копий не важен
    expect(mergePunctuation(laptop, phone)).toEqual(mergePunctuation(phone, laptop))
  })
})
