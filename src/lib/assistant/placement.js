// Где стоят кнопка и окно Луны на компьютере (16.10.2026, комментарий
// руководства: «уменьшить, чтобы не мешал при работе с платформой; по команде —
// больше, размером как телефон на экране компьютера; окно можно перемещать»).
//
// Кнопка и окно — одно целое: окно открывается на месте кнопки и сворачивается
// обратно в неё, поэтому у них ОДНА позиция. Хранится она привязкой к ближним
// краям экрана («24 px от правого и нижнего»), а не координатами: кнопка,
// поставленная в угол, остаётся в углу, когда окно браузера меняет размер, и
// окно любого размера встаёт к тому же углу, вырастая к середине экрана.
//
// На телефоне всего этого нет: там окно — лист снизу во всю ширину (CSS), и
// двигать его некуда.

export const LAUNCHER_SIZE = 48
// Ближе к краю экрана не ставим: тень и скругление должны остаться видны.
export const EDGE = 12
// Сверху справа у кабинета висит группа «?, язык, колокольчик» (.learn__bell:
// top 16, высота 40, z-index 40 — выше помощника, как и положено окнам), и
// «телефон», доросший до верха, уходил под неё. Эту полосу окну не отдаём.
export const TOP_EDGE = 68
// Компактное окно — по умолчанию, всегда после перезагрузки; «телефон» —
// по кнопке «Развернуть» (пропорции iPhone 14: 390 × 844).
export const PANEL_SIZES = {
  compact: { w: 320, h: 480 },
  phone: { w: 390, h: 844 },
}
export const DEFAULT_PLACE = Object.freeze({ h: 'r', x: 24, v: 'b', y: 24 })

const STORE_KEY = 'jts_assistant_place'

/** Размер окна в режиме mode, не больше экрана. */
export function panelSize(mode, vp) {
  const s = PANEL_SIZES[mode] || PANEL_SIZES.compact
  return {
    w: Math.max(0, Math.min(s.w, vp.w - 2 * EDGE)),
    h: Math.max(0, Math.min(s.h, vp.h - TOP_EDGE - EDGE)),
  }
}

/** Левый верхний угол прямоугольника size, вписанный в экран. */
export function clampPos(pos, size, vp) {
  const maxX = Math.max(EDGE, vp.w - size.w - EDGE)
  const maxY = Math.max(TOP_EDGE, vp.h - size.h - EDGE)
  return {
    x: Math.round(Math.min(Math.max(pos.x, EDGE), maxX)),
    y: Math.round(Math.min(Math.max(pos.y, TOP_EDGE), maxY)),
  }
}

/** Координаты → привязка к краям, ближним к центру прямоугольника. */
export function toAnchor(pos, size, vp) {
  const right = pos.x + size.w / 2 > vp.w / 2
  const bottom = pos.y + size.h / 2 > vp.h / 2
  return {
    h: right ? 'r' : 'l',
    x: Math.max(0, Math.round(right ? vp.w - pos.x - size.w : pos.x)),
    v: bottom ? 'b' : 't',
    y: Math.max(0, Math.round(bottom ? vp.h - pos.y - size.h : pos.y)),
  }
}

/** Привязка → прямоугольник { x, y, w, h } для элемента размера size. */
export function placeRect(anchor, size, vp) {
  const a = validAnchor(anchor) || DEFAULT_PLACE
  const pos = clampPos(
    {
      x: a.h === 'r' ? vp.w - a.x - size.w : a.x,
      y: a.v === 'b' ? vp.h - a.y - size.h : a.y,
    },
    size,
    vp,
  )
  return { ...pos, w: size.w, h: size.h }
}

function validAnchor(a) {
  if (!a || typeof a !== 'object') return null
  if ((a.h !== 'l' && a.h !== 'r') || (a.v !== 't' && a.v !== 'b')) return null
  if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || a.x < 0 || a.y < 0) return null
  return { h: a.h, x: a.x, v: a.v, y: a.y }
}

// Хранилище может быть недоступно (приватный режим) или хранить мусор от
// прежней версии — тогда кнопка просто стоит в своём углу.
export function readPlace() {
  try {
    return validAnchor(JSON.parse(localStorage.getItem(STORE_KEY) || 'null')) || DEFAULT_PLACE
  } catch {
    return DEFAULT_PLACE
  }
}

export function writePlace(anchor) {
  try {
    const a = validAnchor(anchor)
    if (a) localStorage.setItem(STORE_KEY, JSON.stringify(a))
    else localStorage.removeItem(STORE_KEY)
  } catch {
    /* приватный режим — место проживёт до перезагрузки */
  }
}
