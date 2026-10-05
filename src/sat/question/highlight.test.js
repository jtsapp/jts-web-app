// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { apply, fromSelection, merge, removeAt, snap, textOf } from './highlight.js'

describe('SAT highlighter', () => {
  it('merge склеивает пересекающиеся и соприкасающиеся отрезки', () => {
    expect(merge([{ start: 5, end: 9 }, { start: 0, end: 3 }, { start: 3, end: 6 }, { start: 20, end: 20 }])).toEqual([
      { start: 0, end: 9 },
    ])
  })

  it('snap доводит до целых слов и срезает пробелы', () => {
    const t = 'the straightforward case'
    expect(snap(t, { start: 8, end: 12 })).toEqual({ start: 4, end: 19 })
    expect(snap(t, { start: 3, end: 5 })).toEqual({ start: 4, end: 19 })
    expect(snap(t, { start: 3, end: 4 })).toBe(null)
  })

  it('removeAt снимает отрезок под точкой', () => {
    expect(removeAt([{ start: 0, end: 4 }, { start: 6, end: 9 }], 7)).toEqual([{ start: 0, end: 4 }])
  })

  it('apply оборачивает текст через границы тегов, не меняя текст', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>Seawater <u>reacts with</u> lime.</p>'
    const before = textOf(root)
    apply(root, [{ start: 4, end: 15 }])
    expect(textOf(root)).toBe(before)
    const marks = [...root.querySelectorAll('mark.st-hl')]
    expect(marks.map((m) => m.textContent).join('|')).toBe('ater |reacts')
    expect(marks[0].dataset.at).toBe('4')
    expect(root.querySelector('u').textContent).toBe('reacts with')
  })

  it('fromSelection считает смещения по всему корню', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>One <b>two</b> three</p>'
    document.body.appendChild(root)
    const b = root.querySelector('b').firstChild
    const range = document.createRange()
    range.setStart(b, 1)
    range.setEnd(root.querySelector('p').lastChild, 3)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    expect(fromSelection(root, sel)).toEqual({ start: 5, end: 10 })
    root.remove()
  })
})
