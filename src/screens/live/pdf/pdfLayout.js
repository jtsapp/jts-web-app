// Раскладка ленты страниц PDF — чистые функции: где какая страница, какая
// сейчас перед глазами и какие рисовать. Всё в CSS-пикселях ленты.
//
// Почему не IntersectionObserver: высоты страниц известны (ширина × пропорции
// страницы), и видимый диапазон считается из прокрутки той же арифметикой,
// которой лента расставлена. Так одно правило решает и «что рисовать», и «на
// какой странице ученик», и его можно проверить без браузера.

export const PAGE_GAP = 12
export const PAGE_PAD = 12
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 3
export const ZOOM_STEP = 0.25
// Канва в DPR 3 у страницы во всю ширину телефона — десятки мегабайт на лист, а
// рядом живут ещё две-три. Чётче, чем 2×, на телефоне глазом не видно.
export const MAX_DPR = 2
// Строка чтения: страница «текущая», когда пересекает линию на трети высоты
// окна, а не его верхний край, — иначе номер менялся бы, едва из-под верха
// показалась следующая.
const READING_LINE = 0.3

/** Шаг масштаба с упором в границы; 1 — «по ширине». */
export function stepZoom(zoom, direction) {
  const next = Math.round((zoom + direction * ZOOM_STEP) / ZOOM_STEP) * ZOOM_STEP
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
}

/**
 * Верх каждой страницы и полная высота ленты.
 * @param {number[]} aspects высота/ширина каждой страницы
 * @param {number} width CSS-ширина страницы
 */
export function pageTops(aspects, width) {
  const tops = []
  let y = PAGE_PAD
  for (const aspect of aspects) {
    tops.push(y)
    y += Math.round(width * aspect) + PAGE_GAP
  }
  return { tops, height: aspects.length ? y - PAGE_GAP + PAGE_PAD : 0 }
}

/** Индекс последней страницы, чей верх не ниже `y` (бинарный поиск). */
function pageAt(tops, y) {
  let lo = 0
  let hi = tops.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (tops[mid] <= y) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Страница перед глазами: та, что пересекает строку чтения. Лента, прокрученная
 * до упора вниз, стоит на последней: короткая последняя страница до строки
 * чтения не доезжает, и ученик, которого привели на неё, видел бы номер
 * предпоследней.
 * @param {number} [totalHeight] высота ленты; без неё упор не проверяется
 */
export function currentPage(tops, scrollTop, viewportHeight, totalHeight = 0) {
  if (!tops.length) return 0
  if (totalHeight > 0) {
    // Весь документ в окне — листать некуда, он на первой странице.
    if (totalHeight <= viewportHeight) return 0
    if (scrollTop + viewportHeight >= totalHeight - 1) return tops.length - 1
  }
  return pageAt(tops, scrollTop + viewportHeight * READING_LINE)
}

/**
 * Какие страницы рисовать: видимые плюс по одной сверху и снизу — чтобы
 * следующая уже была нарисована, когда до неё долистают.
 * @returns {{first: number, last: number}} включительно
 */
export function pagesToRender(tops, scrollTop, viewportHeight) {
  if (!tops.length) return { first: 0, last: -1 }
  const first = pageAt(tops, scrollTop)
  const last = pageAt(tops, scrollTop + Math.max(viewportHeight, 1))
  return { first: Math.max(0, first - 1), last: Math.min(tops.length - 1, last + 1) }
}

/** Номер страницы в границах документа; не число — null. */
export function clampPage(index, count) {
  if (!Number.isInteger(index) || count <= 0) return null
  return Math.min(count - 1, Math.max(0, index))
}
