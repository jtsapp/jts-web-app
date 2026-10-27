import { describe, it, expect } from 'vitest'
import { isPdfMaterial, isPdfUrl } from './isPdfMaterial.js'

describe('isPdfMaterial', () => {
  it('тип PDF — всегда PDF, даже без расширения в адресе', () => {
    expect(isPdfMaterial({ materialType: 'PDF', fileUrl: 'https://files/x/document' })).toBe(true)
  })

  it('ссылка или документ с адресом на .pdf — тоже PDF', () => {
    expect(isPdfMaterial({ materialType: 'LINK', fileUrl: 'https://files/a/Unit_1.pdf' })).toBe(true)
    expect(isPdfMaterial({ materialType: 'DOCUMENT', fileUrl: 'https://files/a/Unit_1.PDF' })).toBe(true)
  })

  it('запрос и якорь в путь не входят', () => {
    expect(isPdfUrl('https://files/a/book.pdf?v=2')).toBe(true)
    expect(isPdfUrl('https://files/a/book.pdf#page=3')).toBe(true)
    expect(isPdfUrl('https://files/a/book.html?file=x.pdf')).toBe(false)
  })

  it('видео, урок и пустой материал — не PDF', () => {
    expect(isPdfMaterial({ materialType: 'VIDEO', fileUrl: 'https://files/a/clip.mp4' })).toBe(false)
    expect(isPdfMaterial({ materialType: 'INTERACTIVE_HTML', fileUrl: 'https://files/a/L05.html' })).toBe(false)
    expect(isPdfMaterial({ materialType: 'LINK', fileUrl: 'https://files/a/pdf' })).toBe(false)
    expect(isPdfMaterial({ materialType: 'LINK', fileUrl: null })).toBe(false)
    expect(isPdfMaterial(null)).toBe(false)
  })
})
