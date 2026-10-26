import { describe, it, expect } from 'vitest'
import { PAGE_GAP, PAGE_PAD, ZOOM_MAX, ZOOM_MIN, clampPage, currentPage, pageTops, pagesToRender, stepZoom } from './pdfLayout.js'

// Лента из страниц 100 × 140 при ширине 100: верх каждой — 12 + n × (140 + 12).
const ASPECTS = [1.4, 1.4, 1.4, 1.4, 1.4]
const { tops, height } = pageTops(ASPECTS, 100)

describe('pdfLayout', () => {
  it('расставляет страницы с полями и зазорами', () => {
    expect(tops).toEqual([12, 164, 316, 468, 620])
    expect(height).toBe(620 + 140 + PAGE_PAD)
    expect(PAGE_GAP).toBe(12)
  })

  it('страница другой формы сдвигает только те, что ниже', () => {
    expect(pageTops([1.4, 0.5, 1.4], 100).tops).toEqual([12, 164, 226])
  })

  it('пустой документ — пустая лента', () => {
    expect(pageTops([], 100)).toEqual({ tops: [], height: 0 })
    expect(currentPage([], 0, 500)).toBe(0)
    expect(pagesToRender([], 0, 500)).toEqual({ first: 0, last: -1 })
  })

  it('текущая — та, что пересекает строку чтения на трети окна', () => {
    // Окно 300: строка чтения на 90 ниже верха прокрутки.
    expect(currentPage(tops, 0, 300)).toBe(0)
    // Верх второй страницы (164) уже в окне, но строка чтения (70 + 90 = 160) до него не дошла.
    expect(currentPage(tops, 70, 300)).toBe(0)
    expect(currentPage(tops, 80, 300)).toBe(1)
    expect(currentPage(tops, 10_000, 300)).toBe(4)
  })

  it('лента до упора вниз — последняя страница, даже если она не дошла до строки чтения', () => {
    // Окно 500 на ленту 772: упор — прокрутка 272, строка чтения (422) ещё на третьей.
    expect(currentPage(tops, 272, 500)).toBe(2)
    expect(currentPage(tops, 272, 500, height)).toBe(4)
    // Короткий документ целиком в окне — на первой, а не на последней.
    expect(currentPage(tops, 0, 2000, height)).toBe(0)
  })

  it('рисует видимые страницы и по одной соседней', () => {
    // Окно [320, 620]: видны третья и четвёртая, пятая начинается ровно на краю.
    expect(pagesToRender(tops, 320, 300)).toEqual({ first: 1, last: 4 })
    expect(pagesToRender(tops, 0, 100)).toEqual({ first: 0, last: 1 })
    // Окно без высоты (ещё не измерено) — хотя бы первая и следующая.
    expect(pagesToRender(tops, 0, 0)).toEqual({ first: 0, last: 1 })
  })

  it('масштаб шагает по четверти и упирается в границы', () => {
    expect(stepZoom(1, 1)).toBe(1.25)
    expect(stepZoom(1, -1)).toBe(0.75)
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX)
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN)
  })

  it('номер страницы держится в границах документа', () => {
    expect(clampPage(7, 5)).toBe(4)
    expect(clampPage(-1, 5)).toBe(0)
    expect(clampPage(2, 5)).toBe(2)
    expect(clampPage(null, 5)).toBeNull()
    expect(clampPage(1.5, 5)).toBeNull()
    expect(clampPage(0, 0)).toBeNull()
  })
})
