import { describe, it, expect } from 'vitest'
import {
  BOARD_MAX_ZOOM, BOARD_MIN_ZOOM, boundsOfRects, clampView, clampZoom, fitView, scrollMetrics, viewFromThumb,
  wheelAction, zoomAround,
} from './boardViewport.js'

// Жалоба преподавателя: «уменьшил доску, дописал снизу надписи и фото, а ученик
// нижнюю часть не видит». Здесь держим то, на чём это стоит: всё, что лежит на
// доске, достижимо прокруткой в любую сторону, при любом масштабе. Те же числа, что
// в web-admin (board-viewport.spec.ts): доска одна, пределы обязаны совпадать.
const W = 1000
const H = 600
const home = { zoom: 1, tx: 0, ty: 0 }

describe('boundsOfRects', () => {
  it('пустая доска — границ нет', () => {
    expect(boundsOfRects([])).toBeNull()
  })

  it('собирает границы по всем объектам, в том числе с отрицательными координатами', () => {
    const bounds = boundsOfRects([
      { left: 10, top: 20, width: 100, height: 50 },
      { left: -300, top: 2500, width: 40, height: 40 },
    ])
    expect(bounds).toEqual({ minX: -300, minY: 20, maxX: 110, maxY: 2540 })
  })

  it('объект с нечисловыми размерами (ещё не загрузилась картинка) границы не ломает', () => {
    const bounds = boundsOfRects([
      { left: 0, top: 0, width: NaN, height: 10 },
      { left: 5, top: 5, width: 10, height: 10 },
    ])
    expect(bounds).toEqual({ minX: 5, minY: 5, maxX: 15, maxY: 15 })
  })
})

describe('clampView', () => {
  it('надпись далеко внизу: окно можно промотать так, чтобы она была на экране', () => {
    const bounds = boundsOfRects([{ left: 100, top: 4000, width: 300, height: 60 }])
    const view = clampView({ zoom: 1, tx: 0, ty: -100000 }, bounds, W, H)
    const top = -view.ty / view.zoom
    const bottom = top + H / view.zoom
    expect(top).toBeLessThan(4000)
    expect(bottom).toBeGreaterThan(4060)
  })

  it('вверх и влево можно уехать за начало координат, но не бесконечно', () => {
    const view = clampView({ zoom: 1, tx: 100000, ty: 100000 }, null, W, H)
    expect(-view.tx).toBeLessThan(0)
    expect(-view.ty).toBeLessThan(0)
    expect(-view.tx).toBeGreaterThan(-W)
    expect(-view.ty).toBeGreaterThan(-H)
  })

  it('исходный вид на пустой доске допустим — доска открывается там, где её открыли', () => {
    expect(clampView(home, null, W, H)).toEqual(home)
  })

  it('объект левее нуля достижим прокруткой влево', () => {
    const bounds = boundsOfRects([{ left: -2000, top: 0, width: 100, height: 50 }])
    const view = clampView({ zoom: 1, tx: 100000, ty: 0 }, bounds, W, H)
    expect(-view.tx).toBeLessThanOrEqual(-2000)
  })

  it('масштаб ограничен пределами 10–400%', () => {
    expect(clampView({ zoom: 0.01, tx: 0, ty: 0 }, null, W, H).zoom).toBe(BOARD_MIN_ZOOM)
    expect(clampView({ zoom: 50, tx: 0, ty: 0 }, null, W, H).zoom).toBe(BOARD_MAX_ZOOM)
    expect(clampZoom(NaN)).toBe(1)
  })

  it('вид внутри допустимого не трогается', () => {
    const bounds = boundsOfRects([{ left: 0, top: 0, width: 800, height: 3000 }])
    const view = { zoom: 1, tx: -50, ty: -700 }
    expect(clampView(view, bounds, W, H)).toEqual(view)
  })
})

describe('zoomAround', () => {
  it('точка под курсором остаётся на месте', () => {
    const before = { zoom: 1, tx: -120, ty: -340 }
    const after = zoomAround(before, 2, 400, 250)
    expect((400 - after.tx) / after.zoom).toBeCloseTo((400 - before.tx) / before.zoom, 6)
    expect((250 - after.ty) / after.zoom).toBeCloseTo((250 - before.ty) / before.zoom, 6)
  })
})

describe('fitView', () => {
  it('пустая доска — исходный вид', () => {
    expect(fitView(null, W, H)).toEqual(home)
  })

  it('всё написанное целиком в окне, в том числе то, что лежит далеко внизу', () => {
    const bounds = boundsOfRects([
      { left: 0, top: 0, width: 400, height: 100 },
      { left: 200, top: 3000, width: 400, height: 100 },
    ])
    const view = fitView(bounds, W, H)
    expect(view.zoom).toBeLessThan(1)
    expect(bounds.minX * view.zoom + view.tx).toBeGreaterThanOrEqual(0)
    expect(bounds.maxX * view.zoom + view.tx).toBeLessThanOrEqual(W)
    expect(bounds.minY * view.zoom + view.ty).toBeGreaterThanOrEqual(0)
    expect(bounds.maxY * view.zoom + view.ty).toBeLessThanOrEqual(H)
  })

  it('маленькая надпись не раздувается больше 100%', () => {
    const bounds = boundsOfRects([{ left: 10, top: 10, width: 50, height: 20 }])
    expect(fitView(bounds, W, H).zoom).toBe(1)
  })

  it('очень длинная доска упирается в нижний предел масштаба, а не уходит в ноль', () => {
    const bounds = boundsOfRects([{ left: 0, top: 0, width: 100, height: 100000 }])
    expect(fitView(bounds, W, H).zoom).toBe(BOARD_MIN_ZOOM)
  })
})

describe('полосы прокрутки', () => {
  const bounds = boundsOfRects([{ left: 0, top: 0, width: 900, height: 4000 }])

  it('ползунок — доля дорожки, и чем длиннее доска, тем он короче', () => {
    const short = scrollMetrics(home, boundsOfRects([{ left: 0, top: 0, width: 900, height: 300 }]), W, H)
    const tall = scrollMetrics(home, bounds, W, H)
    expect(tall.vertical.size).toBeLessThan(short.vertical.size)
    expect(tall.vertical.size).toBeGreaterThan(0)
    expect(tall.vertical.start + tall.vertical.size).toBeLessThanOrEqual(1.000001)
  })

  it('перетаскивание ползунка до конца доводит окно до низа доски', () => {
    const metrics = scrollMetrics(home, bounds, W, H)
    const view = viewFromThumb('vertical', 1 - metrics.vertical.size, home, bounds, W, H)
    expect(-view.ty / view.zoom + H / view.zoom).toBeGreaterThan(4000)
  })

  it('ползунок и вид согласованы: поставили — прочитали то же положение', () => {
    const view = viewFromThumb('vertical', 0.4, home, bounds, W, H)
    expect(scrollMetrics(view, bounds, W, H).vertical.start).toBeCloseTo(0.4, 5)
    expect(view.tx).toBe(home.tx)
  })
})

describe('wheelAction', () => {
  it('колесо без модификаторов прокручивает: содержимое едет против прокрутки', () => {
    const action = wheelAction({ deltaX: 0, deltaY: 120 })
    expect(action.kind).toBe('pan')
    expect(action.dy).toBe(-120)
  })

  it('Shift + колесо мыши — вбок', () => {
    const action = wheelAction({ deltaX: 0, deltaY: 100, shiftKey: true })
    expect(action.dx).toBe(-100)
    expect(action.dy).toBe(0)
  })

  it('тачпад двигает по двум осям сразу', () => {
    const action = wheelAction({ deltaX: 30, deltaY: 40 })
    expect(action.dx).toBe(-30)
    expect(action.dy).toBe(-40)
  })

  it('Ctrl (и щипок тачпада) — масштаб: вниз уменьшает, вверх увеличивает', () => {
    const out = wheelAction({ deltaX: 0, deltaY: 100, ctrlKey: true })
    const into = wheelAction({ deltaX: 0, deltaY: -100, ctrlKey: true })
    expect(out.kind).toBe('zoom')
    expect(out.factor).toBeLessThan(1)
    expect(into.factor).toBeGreaterThan(1)
  })

  it('строки Firefox приводятся к пикселям', () => {
    expect(wheelAction({ deltaX: 0, deltaY: 3, deltaMode: 1 }).dy).toBe(-48)
  })
})
