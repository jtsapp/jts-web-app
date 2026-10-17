// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PLACE,
  EDGE,
  TOP_EDGE,
  LAUNCHER_SIZE,
  PANEL_SIZES,
  clampPos,
  panelSize,
  placeRect,
  readPlace,
  toAnchor,
  writePlace,
} from './placement.js'

const VP = { w: 1440, h: 900 }
const BTN = { w: LAUNCHER_SIZE, h: LAUNCHER_SIZE }

describe('placement', () => {
  afterEach(() => localStorage.clear())

  it('по умолчанию кнопка и окно — в правом нижнем углу, окно растёт к середине', () => {
    const btn = placeRect(DEFAULT_PLACE, BTN, VP)
    expect(btn).toEqual({ x: 1440 - 24 - 48, y: 900 - 24 - 48, w: 48, h: 48 })
    const panel = placeRect(DEFAULT_PLACE, panelSize('compact', VP), VP)
    // Правый нижний угол окна совпадает с углом кнопки — окно «вырастает» из неё.
    expect(panel.x + panel.w).toBe(btn.x + btn.w)
    expect(panel.y + panel.h).toBe(btn.y + btn.h)
  })

  it('«телефон» больше компактного и не выше экрана', () => {
    const small = panelSize('compact', VP)
    const phone = panelSize('phone', VP)
    expect(phone.w).toBeGreaterThan(small.w)
    expect(phone.h).toBeGreaterThan(small.h)
    // Ноутбук 1366 × 768: «телефон» во всю высоту экрана с отступами.
    expect(panelSize('phone', { w: 1366, h: 768 }).h).toBe(768 - TOP_EDGE - EDGE)
    expect(panelSize('phone', { w: 1920, h: 1080 })).toEqual(PANEL_SIZES.phone)
  })

  it('прямоугольник не выходит за экран и не заходит в верхнюю полосу кабинета', () => {
    expect(clampPos({ x: -50, y: 5000 }, { w: 320, h: 480 }, VP)).toEqual({ x: EDGE, y: 900 - 480 - EDGE })
    expect(clampPos({ x: 100, y: 0 }, { w: 320, h: 480 }, VP)).toEqual({ x: 100, y: TOP_EDGE })
  })

  it('привязка — к ближним краям и переживает смену размера экрана', () => {
    const size = panelSize('compact', VP)
    const a = toAnchor({ x: 100, y: 80 }, size, VP)
    expect(a).toEqual({ h: 'l', x: 100, v: 't', y: 80 })
    expect(placeRect(a, size, VP)).toMatchObject({ x: 100, y: 80 })
    const b = toAnchor({ x: 1000, y: 380 }, size, VP)
    expect(b).toEqual({ h: 'r', x: 1440 - 1000 - 320, v: 'b', y: 900 - 380 - 480 })
    // Экран стал уже — окно у правого края так и стоит у правого края.
    const narrow = { w: 1100, h: 900 }
    const r = placeRect(b, size, narrow)
    expect(1100 - r.x - r.w).toBe(b.x)
  })

  it('туда-обратно без сдвига', () => {
    const size = panelSize('compact', VP)
    const pos = { x: 700, y: 70 }
    expect(placeRect(toAnchor(pos, size, VP), size, VP)).toMatchObject(pos)
  })

  it('хранилище: мусор и пустота — угол по умолчанию', () => {
    expect(readPlace()).toEqual(DEFAULT_PLACE)
    localStorage.setItem('jts_assistant_place', '{"h":"x","x":1,"v":"b","y":2}')
    expect(readPlace()).toEqual(DEFAULT_PLACE)
    localStorage.setItem('jts_assistant_place', 'не json')
    expect(readPlace()).toEqual(DEFAULT_PLACE)
    writePlace({ h: 'l', x: 40, v: 't', y: 60 })
    expect(readPlace()).toEqual({ h: 'l', x: 40, v: 't', y: 60 })
    writePlace(null)
    expect(localStorage.getItem('jts_assistant_place')).toBeNull()
  })
})
