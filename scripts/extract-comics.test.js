import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildIndex, dictOf, refOf, numOf, arrayOf, collectPages, boundsOf, skipped } = require('./extract-comics.js')

// Синтетический PDF-огрызок: дерево страниц с /Kids как КОСВЕННОЙ ссылкой и
// первой страницей в объекте ПОКОЛЕНИЯ 1 — ровно та комбинация, на которой
// парсер, считавший поколение всегда нулевым, молча терял страницу.
const PDF = [
  '%PDF-1.4',
  '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj',
  '2 0 obj\n<</Type/Pages/Count 3/Kids 3 0 R>>\nendobj',
  '3 0 obj\n[ 4 1 R 5 0 R 6 0 R ]\nendobj',
  '4 1 obj\n<</Type/Page/Parent 2 0 R/Resources<</XObject<</X7 7 0 R>>>>>>\nendobj',
  '5 0 obj\n<</Type/Page/Parent 2 0 R/Resources 8 0 R>>\nendobj',
  '6 0 obj\n<</Type/Page/Parent 2 0 R>>\nendobj',
  'trailer\n<</Root 1 0 R/Size 9>>',
].join('\n')

describe('extract-comics — разбор PDF', () => {
  const offsets = buildIndex(PDF)

  it('индекс адресует объекты парой «номер поколение»', () => {
    expect(offsets.has('4 1')).toBe(true)
    expect(offsets.has('4 0')).toBe(false)
  })

  it('страница поколения 1 не теряется при обходе дерева', () => {
    const pages = collectPages(PDF, offsets, refOf(dictOf(PDF, offsets, '1 0'), 'Pages'))
    expect(pages.map((p) => p.key)).toEqual(['4 1', '5 0', '6 0'])
  })

  it('обход даёт столько же страниц, сколько обещает /Count', () => {
    const pagesDict = dictOf(PDF, offsets, '2 0')
    const pages = collectPages(PDF, offsets, '2 0')
    expect(pages.length).toBe(numOf(pagesDict, 'Count'))
  })

  it('/Kids читается и косвенной ссылкой, и встроенным массивом', () => {
    expect(arrayOf(PDF, offsets, dictOf(PDF, offsets, '2 0'), 'Kids')).toEqual(['4 1', '5 0', '6 0'])
    expect(arrayOf(PDF, offsets, '<</Kids [10 0 R 11 2 R]>>', 'Kids')).toEqual(['10 0', '11 2'])
  })

  it('numOf не принимает начало ссылки «N G R» за число', () => {
    expect(numOf('<</Length 512/Parent 2 0 R>>', 'Length')).toBe(512)
    expect(numOf('<</Parent 2 0 R>>', 'Parent')).toBe(null)
  })

  it('словарь берётся до парного >>, а не до первого', () => {
    expect(dictOf(PDF, offsets, '4 1')).toBe(
      '<</Type/Page/Parent 2 0 R/Resources<</XObject<</X7 7 0 R>>>>>>',
    )
  })
})

describe('extract-comics — обрезка белого поля', () => {
  // Холст 10×8: белый, с чёрным прямоугольником x 2..4, y 1..5.
  const W = 10
  const H = 8
  const canvas = () => new Uint8Array(W * H).fill(255)
  const withBox = () => {
    const g = canvas()
    for (let y = 1; y <= 5; y++) for (let x = 2; x <= 4; x++) g[y * W + x] = 0
    return g
  }

  it('рамка охватывает ровно непустую область', () => {
    expect(boundsOf(withBox(), W, H, 246)).toEqual({ left: 2, top: 1, width: 3, height: 5 })
  })

  it('целиком белый лист не даёт рамки — такую страницу пропускаем', () => {
    expect(boundsOf(canvas(), W, H, 246)).toBe(null)
  })

  it('пиксель светлее порога считается полем', () => {
    const g = canvas()
    g[0] = 250
    expect(boundsOf(g, W, H, 246)).toBe(null)
    g[0] = 245
    expect(boundsOf(g, W, H, 246)).toEqual({ left: 0, top: 0, width: 1, height: 1 })
  })
})

describe('extract-comics — пропуск страниц', () => {
  it('диапазон включает обе границы', () => {
    const ranges = [[2, 9]]
    expect(skipped(1, ranges)).toBe(false)
    expect(skipped(2, ranges)).toBe(true)
    expect(skipped(9, ranges)).toBe(true)
    expect(skipped(10, ranges)).toBe(false)
  })
})
