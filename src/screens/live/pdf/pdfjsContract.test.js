// Настоящий pdf.js на настоящем PDF — та часть его API, на которой стоит
// просмотрщик: getDocument, numPages, getPage, getViewport, render и отказ на
// битом файле. Остальные тесты подменяют загрузчик, поэтому смена версии
// pdfjs-dist, сломавшая эти вызовы, всплыла бы только у ученика.
//
// Та же сборка legacy, что грузит pdfLoader.js; в Node воркер поднимается в
// том же процессе (fake worker) по пути из node_modules.
import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
let pdfjs

/** PDF 1.4 из одной страницы 300 × 200 pt с одной строкой текста. */
function tinyPdf() {
  const content = 'BT /F1 24 Tf 40 100 Td (JTS PDF test) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets = objects.map((body, i) => {
    const offset = out.length
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  out += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(out)
}

beforeAll(async () => {
  pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')).href
})

describe('pdf.js — контракт просмотрщика', () => {
  it('открывает документ, отдаёт страницу и её размеры', async () => {
    const task = pdfjs.getDocument({ data: tinyPdf(), disableAutoFetch: true, isEvalSupported: false })
    const doc = await task.promise
    try {
      expect(doc.numPages).toBe(1)
      const page = await doc.getPage(1)
      const base = page.getViewport({ scale: 1 })
      expect(base.width).toBe(300)
      expect(base.height).toBe(200)
      expect(page.getViewport({ scale: 2 }).width).toBe(600)
      expect(typeof page.render).toBe('function')
    } finally {
      await task.destroy()
    }
  })

  it('битый файл — отказ, а не зависание', async () => {
    const task = pdfjs.getDocument({ data: new TextEncoder().encode('not a pdf'), isEvalSupported: false })
    await expect(task.promise).rejects.toThrow()
    await task.destroy()
  })
})
