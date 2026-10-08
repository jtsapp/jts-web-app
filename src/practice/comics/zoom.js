// Математика зума страницы комикса — без DOM, чтобы её можно было проверить
// юнит-тестами. Жесты, мышь и запись transform живут в usePinchZoom.js.
//
// Состояние зума — { s, x, y }: масштаб и сдвиг в CSS-пикселях. Применяется как
// `translate(x, y) scale(s)` с transform-origin по центру картинки, поэтому
// точка листа u (от центра, в несжатых пикселях) попадает на экран в
// `центр + сдвиг + s·u`.
//
// box — раскладочный (без transform) прямоугольник картинки: центр и размер.
// view — прямоугольник сцены, в которой картинку видно.

export const IDENTITY = Object.freeze({ s: 1, x: 0, y: 0 })

// Потолок ×4: страницы приходят около 1250 px в ширину, а на телефоне лист
// занимает ~350 px — дальше ×4 растр уже размазывается, мелкий текст в баллоне
// читается раньше.
export const MAX_ZOOM = 4

// Двойной тап увеличивает сразу до читаемого: ×2.5 хватает на баллон.
export const TAP_ZOOM = 2.5

// Шаг кнопок и клавиш +/−: от обычного размера до читаемого баллона — два
// нажатия.
export const STEP_ZOOM = 1.5

// Колесо с Ctrl. Щипок тачпада Хром и Firefox присылают тем же wheel с
// ctrlKey, и у Хрома масштаб щипка ровно exp(-deltaY/100) — с этим
// коэффициентом щипок ощущается как штатный. Щелчок колеса мыши приходит
// сразу ~100 px, а это ×2.7 за щелчок, поэтому шаг режем: щелчок — около
// ×1.35, мелкие дельты щипка в срез не попадают.
const WHEEL_K = 0.01
const WHEEL_CAP = 30
// Firefox меряет колесо строками (deltaMode 1), изредка страницами (2).
const LINE_PX = 16
const PAGE_PX = 800

export function wheelScale(s, deltaY, deltaMode = 0) {
  const px = deltaY * (deltaMode === 1 ? LINE_PX : deltaMode === 2 ? PAGE_PX : 1)
  const d = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, px))
  return s * Math.exp(-d * WHEEL_K)
}

// Масштаб s вокруг точки экрана (px, py): то, что было под пальцем, остаётся
// под ним — иначе увеличение «уплывает» в центр, и нужное место ищешь заново.
export function zoomAround(z, box, px, py, s) {
  const ux = (px - box.cx - z.x) / z.s
  const uy = (py - box.cy - z.y) / z.s
  return { s, x: px - box.cx - s * ux, y: py - box.cy - s * uy }
}

// Щипок: масштаб — во сколько раз разошлись пальцы, а точка листа под их
// серединой едет вместе с серединой (так щипком заодно и двигают лист).
export function pinchZoom(z0, box, m0, d0, m, d) {
  const s = (z0.s * d) / Math.max(d0, 1)
  const z = zoomAround(z0, box, m0.x, m0.y, s)
  return { s, x: z.x + (m.x - m0.x), y: z.y + (m.y - m0.y) }
}

// Держим масштаб в [1, MAX_ZOOM] и не даём листу уехать: крупнее сцены — края
// листа не отходят от краёв сцены (никаких пустых полос), мельче — лист не
// выходит за сцену. Центрировать узкую ось не стали: при увеличении у края
// лист тогда прыгал бы вбок из-под пальца.
export function clampZoom(z, box, view) {
  const s = Math.min(MAX_ZOOM, z.s)
  if (!(s > 1)) return IDENTITY
  return {
    s,
    x: clampAxis(z.x, box.cx, box.w * s, view.left, view.right),
    y: clampAxis(z.y, box.cy, box.h * s, view.top, view.bottom),
  }
}

// Сдвиг t по одной оси: лист размера size с центром c + t в окне [lo, hi].
function clampAxis(t, c, size, lo, hi) {
  const inside = size <= hi - lo
  const a = lo - c + size / 2
  const b = hi - c - size / 2
  const min = inside ? a : b
  const max = inside ? b : a
  return Math.min(max, Math.max(min, t))
}
