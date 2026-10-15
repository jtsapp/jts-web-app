import { describe, expect, it } from 'vitest'
import { add, clear, emptyBoard, extend, paint, redo, toBoard, undo } from './board.js'

const dot = (x) => ({ t: 'stroke', tool: 'pen', c: '#000', s: 6, p: [x, x] })

describe('доска юнита', () => {
  it('отмена и возврат; новый штрих закрывает возврат', () => {
    let b = add(add(emptyBoard(), dot(1)), dot(2))
    b = undo(b)
    expect(b.items).toHaveLength(1)
    b = redo(b)
    expect(b.items.map((x) => x.p[0])).toEqual([1, 2])
    b = add(undo(b), dot(3))
    expect(b.redo).toHaveLength(0)
    expect(undo(emptyBoard())).toEqual(emptyBoard())
  })

  it('очистка отменяется пошагово до прежней доски', () => {
    let b = add(add(emptyBoard(), dot(1)), dot(2))
    b = clear(b)
    expect(b.items).toHaveLength(0)
    b = redo(redo(b))
    expect(b.items.map((x) => x.p[0])).toEqual([1, 2])
  })

  it('экран → поле 1600×900 и отсев дрожания', () => {
    expect(toBoard({ left: 100, top: 50, width: 800, height: 450 }, 500, 275)).toEqual([800, 450])
    const s = { p: [10, 10] }
    expect(extend(s, [10.5, 10.5])).toBe(s)
    expect(extend(s, [20, 10]).p).toEqual([10, 10, 20, 10])
  })

  it('касание рисуется точкой, ластик стирает, а не закрашивает', () => {
    const calls = []
    const ctx = new Proxy({}, {
      get: (o, k) => (k in o ? o[k] : (...a) => calls.push([k, ...a])),
      set: (o, k, v) => { o[k] = v; return true },
    })
    paint(ctx, dot(5))
    expect(calls.find((c) => c[0] === 'lineTo')).toEqual(['lineTo', 5.1, 5.1])
    paint(ctx, { t: 'stroke', tool: 'eraser', s: 6, p: [0, 0, 10, 10] })
    expect(ctx.globalCompositeOperation).toBe('destination-out')
  })
})
