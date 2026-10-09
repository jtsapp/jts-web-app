// Видимая область доски: масштаб, сдвиг и прокрутка по всем четырём сторонам.
//
// Холст равен окну, а «лист» бесконечный: смотрим на него через viewportTransform
// fabric'а ([zoom, 0, 0, zoom, tx, ty]). Раньше холст был ровно по размеру сцены и
// двигать его было нечем: преподаватель уменьшил масштаб, написал и вставил фото
// ниже и правее, а ученик видел только первый экран — остальное лежало за краем
// без прокрутки. Здесь всё считается в координатах сцены, поэтому у преподавателя
// и ученика одна и та же доска доступна целиком.
//
// Та же арифметика, что и в web-admin (lesson-workspace/board-viewport.ts), — доска
// одна на всех, и разойдись пределы прокрутки, у одного объект был бы достижим, а у
// другого нет. Только числа — без fabric и DOM, поэтому проверяется юнит-тестом.

export const BOARD_MIN_ZOOM = 0.1
export const BOARD_MAX_ZOOM = 4

// Сколько содержимого (доля от меньшего из «окно» и «весь лист») обязано оставаться
// в окне при самой дальней прокрутке. Остальное окно показывает пустую бумагу:
// преподаватель дописывает ниже последней строки, и там есть куда писать. Но не
// бесконечность — иначе колесо можно крутить в пустоту и потерять доску.
const KEEP_IN_VIEW = 0.3

export function clampZoom(zoom) {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(Math.max(zoom, BOARD_MIN_ZOOM), BOARD_MAX_ZOOM)
}

// Границы всех объектов в координатах сцены; null — на доске пусто.
export function boundsOfRects(rects) {
  let bounds = null
  for (const r of rects) {
    if (![r.left, r.top, r.width, r.height].every(Number.isFinite)) continue
    if (!bounds) {
      bounds = { minX: r.left, minY: r.top, maxX: r.left + r.width, maxY: r.top + r.height }
      continue
    }
    bounds.minX = Math.min(bounds.minX, r.left)
    bounds.minY = Math.min(bounds.minY, r.top)
    bounds.maxX = Math.max(bounds.maxX, r.left + r.width)
    bounds.maxY = Math.max(bounds.maxY, r.top + r.height)
  }
  return bounds
}

// Лист — это то, что написано, плюс «домашняя» бумага размером с окно при 100% от
// начала координат: доска всегда открывается там, и вернуться туда можно, даже когда
// всё написанное уехало далеко. Окно может уйти так, чтобы в нём осталась хотя бы
// часть листа (KEEP_IN_VIEW): дальше — только пустота. Условие по перекрытию, а не
// «от края до края», потому что при сильном уменьшении окно намного больше листа.
function axisRange(min, max, windowSize, zoom) {
  const view = windowSize / zoom
  const lo0 = Math.min(min ?? 0, 0)
  const hi0 = Math.max(max ?? 0, windowSize)
  const keep = KEEP_IN_VIEW * Math.min(view, Math.max(hi0 - lo0, 1))
  const lo = lo0 + keep - view
  const hi = hi0 - keep
  return { lo, hi, span: hi - lo + view, view }
}

function ranges(bounds, zoom, width, height) {
  return {
    x: axisRange(bounds?.minX, bounds?.maxX, width, zoom),
    y: axisRange(bounds?.minY, bounds?.maxY, height, zoom),
  }
}

// Возвращает вид в допустимые пределы: масштаб и сдвиг.
export function clampView(view, bounds, width, height) {
  const zoom = clampZoom(view.zoom)
  const { x, y } = ranges(bounds, zoom, width, height)
  const vx = Math.min(Math.max(-view.tx / zoom, x.lo), x.hi)
  const vy = Math.min(Math.max(-view.ty / zoom, y.lo), y.hi)
  return { zoom, tx: -vx * zoom, ty: -vy * zoom }
}

// Масштаб вокруг точки окна (px от левого верхнего угла): точка под курсором стоит на месте.
export function zoomAround(view, nextZoom, px, py) {
  const zoom = clampZoom(nextZoom)
  const sceneX = (px - view.tx) / view.zoom
  const sceneY = (py - view.ty) / view.zoom
  return { zoom, tx: px - sceneX * zoom, ty: py - sceneY * zoom }
}

// «Показать всё»: масштаб и сдвиг, при которых всё написанное целиком в окне. Не
// увеличивает сверх 100% — одна короткая надпись не должна раздуваться на всё окно.
// На пустой доске — исходный вид.
export function fitView(bounds, width, height, margin = 48) {
  if (!bounds || width <= 0 || height <= 0) return { zoom: 1, tx: 0, ty: 0 }
  const w = Math.max(bounds.maxX - bounds.minX, 1)
  const h = Math.max(bounds.maxY - bounds.minY, 1)
  const zoom = clampZoom(Math.min((width - 2 * margin) / w, (height - 2 * margin) / h, 1))
  return {
    zoom,
    tx: width / 2 - (zoom * (bounds.minX + bounds.maxX)) / 2,
    ty: height / 2 - (zoom * (bounds.minY + bounds.maxY)) / 2,
  }
}

// Ползунки двух полос прокрутки для текущего вида: доли длины дорожки, от 0 до 1.
export function scrollMetrics(view, bounds, width, height) {
  const { x, y } = ranges(bounds, view.zoom, width, height)
  const thumb = (range, origin) => {
    const start = Math.min(Math.max((origin - range.lo) / range.span, 0), 1)
    const size = Math.min(Math.max(range.view / range.span, 0.05), 1)
    return { start: Math.min(start, 1 - size), size }
  }
  return {
    horizontal: thumb(x, -view.tx / view.zoom),
    vertical: thumb(y, -view.ty / view.zoom),
  }
}

// Вид, в который перетаскивание ползунка (доля дорожки `start`) ставит окно.
export function viewFromThumb(axis, start, view, bounds, width, height) {
  const { x, y } = ranges(bounds, view.zoom, width, height)
  const range = axis === 'horizontal' ? x : y
  const origin = range.lo + start * range.span
  return clampView(
    axis === 'horizontal'
      ? { zoom: view.zoom, tx: -origin * view.zoom, ty: view.ty }
      : { zoom: view.zoom, tx: view.tx, ty: -origin * view.zoom },
    bounds,
    width,
    height,
  )
}

// Что делает колесо: с Ctrl (и щипок на тачпаде — он приходит как wheel с ctrlKey) —
// масштаб, без него — прокрутка. Shift с колесом мыши — вбок, как в браузере.
// `dx`/`dy` — на сколько сдвинуть vpt (содержимое едет против прокрутки).
export function wheelAction(e) {
  // deltaMode 1 — строки (Firefox), 2 — страницы: приводим к пикселям.
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
  const deltaX = e.deltaX * unit
  const deltaY = e.deltaY * unit
  if (e.ctrlKey || e.metaKey) {
    return { kind: 'zoom', factor: Math.exp(-deltaY * 0.002) }
  }
  if (e.shiftKey && deltaX === 0) {
    return { kind: 'pan', dx: -deltaY, dy: 0 }
  }
  return { kind: 'pan', dx: -deltaX, dy: -deltaY }
}
