// Настоящий pdf.js на настоящем PDF — та часть его API, на которой стоит
// просмотрщик: getDocument, numPages, getPage, getViewport, render и отказ на
// битом файле. Остальные тесты подменяют загрузчик, поэтому смена версии
// pdfjs-dist, сломавшая эти вызовы, всплыла бы только у ученика.
//
// Та же сборка legacy, что грузит pdfLoader.js; в Node воркер поднимается в
// том же процессе (fake worker) по пути из node_modules.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { JPX_PLATE_RGB, PLATE_JP2, pdfWithJpxImage } from './__fixtures__/jpxPdf.js'
import { pdfjsResources } from './pdfLoader.js'

const require = createRequire(import.meta.url)
let pdfjs

const PUBLIC = fileURLToPath(new URL('../../../../public', import.meta.url))

/**
 * Ресурсы по тем же адресам, что pdfLoader.js даёт pdf.js в браузере, только
 * папкой на диске: Next отдаёт /pdfjs/… из public/pdfjs/…. В Node pdf.js читает
 * их файлами, а не fetch'ем.
 */
function resourcesFromPublic() {
  const resources = pdfjsResources('https://app.test')
  const onDisk = (url) => path.join(PUBLIC, new URL(url).pathname) + path.sep
  return {
    wasmUrl: onDisk(resources.wasmUrl),
    standardFontDataUrl: onDisk(resources.standardFontDataUrl),
    cMapUrl: onDisk(resources.cMapUrl),
    cMapPacked: resources.cMapPacked,
    iccUrl: onDisk(resources.iccUrl),
  }
}

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

  it('картинка JPEG 2000 (JPXDecode) декодируется ресурсами приложения — без них страница учебника пустая', async () => {
    const pdf = pdfWithJpxImage(new Uint8Array(readFileSync(path.resolve(PLATE_JP2))))
    const task = pdfjs.getDocument({ data: pdf, isEvalSupported: false, ...resourcesFromPublic() })
    const doc = await task.promise
    try {
      const page = await doc.getPage(1)
      const ops = await page.getOperatorList()
      const at = ops.fnArray.indexOf(pdfjs.OPS.paintImageXObject)
      expect(at, 'на странице нет картинки').toBeGreaterThanOrEqual(0)
      // Не смог декодировать — pdf.js отдаёт вместо картинки null и рисует страницу без неё.
      const image = await new Promise((resolve) => page.objs.get(ops.argsArray[at][0], resolve))
      expect(image, 'картинку pdf.js не декодировал').not.toBeNull()
      expect(image.kind).toBe(pdfjs.ImageKind.RGBA_32BPP)
      expect([image.width, image.height]).toEqual([32, 16])
      // Пиксель середины плашки. JPEG 2000 сжимает с потерями, поэтому цвет — с допуском.
      const offset = (8 * image.width + 16) * 4
      const pixel = Array.from(image.data.slice(offset, offset + 4))
      expect(pixel[3]).toBe(255)
      JPX_PLATE_RGB.forEach((channel, i) => expect(Math.abs(pixel[i] - channel)).toBeLessThan(20))
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
