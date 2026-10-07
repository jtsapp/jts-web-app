import { describe, it, expect } from 'vitest'
import { IDENTITY, MAX_ZOOM, clampZoom, zoomAround, pinchZoom } from './zoom.js'

// Страница 200×300 с центром в (500, 400) — так её кладёт раскладка; сцена
// шире страницы (у комикса лист вписан по высоте).
const box = { cx: 500, cy: 400, w: 200, h: 300 }
const view = { left: 100, top: 240, right: 900, bottom: 560 }

// Где на экране окажется точка листа (u — от центра, в несжатых пикселях).
const screenOf = (z, ux, uy) => ({ x: box.cx + z.x + z.s * ux, y: box.cy + z.y + z.s * uy })

describe('zoom — увеличение вокруг точки', () => {
  it('точка под пальцем остаётся под пальцем', () => {
    const z = zoomAround(IDENTITY, box, 550, 450, 2.5)
    // До увеличения под (550, 450) лежала точка листа (50, 50).
    expect(screenOf(z, 50, 50)).toEqual({ x: 550, y: 450 })
    expect(z.s).toBe(2.5)
  })

  it('работает и от уже увеличенной страницы', () => {
    const z0 = { s: 2, x: -40, y: 30 }
    const z = zoomAround(z0, box, 600, 380, 3)
    const ux = (600 - box.cx - z0.x) / z0.s
    const uy = (380 - box.cy - z0.y) / z0.s
    const p = screenOf(z, ux, uy)
    expect(p.x).toBeCloseTo(600)
    expect(p.y).toBeCloseTo(380)
  })
})

describe('zoom — щипок', () => {
  it('масштаб растёт с расстоянием между пальцами, точка едет за серединой', () => {
    const m0 = { x: 520, y: 420 }
    const z = pinchZoom(IDENTITY, box, m0, 100, { x: 540, y: 410 }, 200)
    expect(z.s).toBe(2)
    // Точка листа, бывшая под серединой щипка, переехала вместе с ней.
    expect(screenOf(z, 20, 20)).toEqual({ x: 540, y: 410 })
  })

  it('нулевое стартовое расстояние не даёт бесконечности', () => {
    const z = pinchZoom(IDENTITY, box, { x: 500, y: 400 }, 0, { x: 500, y: 400 }, 50)
    expect(Number.isFinite(z.s)).toBe(true)
  })
})

describe('zoom — рамки', () => {
  it('меньше 1 не уменьшаем — сбрасываем в исходное', () => {
    expect(clampZoom({ s: 0.6, x: 30, y: -20 }, box, view)).toEqual(IDENTITY)
  })

  it('больше потолка не растим', () => {
    expect(clampZoom({ s: 9, x: 0, y: 0 }, box, view).s).toBe(MAX_ZOOM)
  })

  it('крупнее сцены — края листа не отходят от краёв сцены', () => {
    // По высоте ×2 = 600 > 320: тянем лист вниз до упора.
    const z = clampZoom({ s: 2, x: 0, y: 5000 }, box, view)
    const top = box.cy + z.y - (box.h * z.s) / 2
    expect(top).toBe(view.top)
    const z2 = clampZoom({ s: 2, x: 0, y: -5000 }, box, view)
    const bottom = box.cy + z2.y + (box.h * z2.s) / 2
    expect(bottom).toBe(view.bottom)
  })

  it('мельче сцены — лист не уходит за её край', () => {
    // По ширине ×2 = 400 < 800: двигать можно, но только внутри сцены.
    const z = clampZoom({ s: 2, x: 5000, y: 0 }, box, view)
    const right = box.cx + z.x + (box.w * z.s) / 2
    expect(right).toBe(view.right)
    const z2 = clampZoom({ s: 2, x: -5000, y: 0 }, box, view)
    const left = box.cx + z2.x - (box.w * z2.s) / 2
    expect(left).toBe(view.left)
  })

  it('сдвиг внутри рамок не трогает', () => {
    expect(clampZoom({ s: 2, x: 10, y: -20 }, box, view)).toEqual({ s: 2, x: 10, y: -20 })
  })
})
