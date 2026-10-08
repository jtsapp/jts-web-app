import { describe, it, expect } from 'vitest'
import { addHighlight, segments, findQuote, overlapsHighlight, removeHighlight } from './highlights.js'

describe('маркер Reading', () => {
  it('новое выделение перекрывает старое только в пересечении', () => {
    let list = addHighlight([], { key: '0:0', start: 0, end: 10, color: 1 })
    list = addHighlight(list, { key: '0:0', start: 5, end: 15, color: 2 })
    expect(list).toEqual([
      { key: '0:0', start: 0, end: 5, color: 1 },
      { key: '0:0', start: 5, end: 15, color: 2 },
    ])
  })

  it('чужой абзац не трогается, пустое выделение игнорируется', () => {
    const list = addHighlight([{ key: '0:1', start: 0, end: 4, color: 3 }], { key: '0:0', start: 2, end: 2, color: 1 })
    expect(list).toHaveLength(1)
  })

  it('режет абзац на куски с цветом и подсветкой ответа', () => {
    const text = 'Cities have always kept careful records.'
    const segs = segments(text, [{ key: 'k', start: 0, end: 6, color: 1 }], { start: 12, end: 18 })
    expect(segs.map((s) => [s.text, s.color, s.mark])).toEqual([
      ['Cities', 1, null],
      [' have ', null, null],
      ['always', null, 'answer'],
      [' kept careful records.', null, null],
    ])
  })

  it('находит цитату и с многоточием', () => {
    const text = 'It is beaten in a machine for up to six hours, then dried.'
    expect(findQuote(text, 'beaten … for up to six hours')).toEqual({ start: 6, end: 45 })
    expect(findQuote(text, 'not here')).toBeNull()
  })
})

describe('removeHighlight', () => {
  it('убирает маркер с куска: середина делит выделение надвое, края обрезаются, чужой абзац не трогается', () => {
    const list = [{ key: '0:0', start: 0, end: 20, color: 1 }, { key: '0:1', start: 0, end: 5, color: 1 }]
    expect(removeHighlight(list, { key: '0:0', start: 5, end: 10 })).toEqual([
      { key: '0:0', start: 0, end: 5, color: 1 },
      { key: '0:0', start: 10, end: 20, color: 1 },
      { key: '0:1', start: 0, end: 5, color: 1 },
    ])
    expect(removeHighlight(list, { key: '0:0', start: 0, end: 30 })).toEqual([{ key: '0:1', start: 0, end: 5, color: 1 }])
  })
  it('видит пересечение с маркером только в своём абзаце', () => {
    const list = [{ key: '0:0', start: 4, end: 9, color: 1 }]
    expect(overlapsHighlight(list, { key: '0:0', start: 8, end: 12 })).toBe(true)
    expect(overlapsHighlight(list, { key: '0:0', start: 9, end: 12 })).toBe(false)
    expect(overlapsHighlight(list, { key: '0:1', start: 4, end: 9 })).toBe(false)
  })
})
