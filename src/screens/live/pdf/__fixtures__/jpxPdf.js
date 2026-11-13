// Настоящий PDF с картинкой JPEG 2000 (фильтр JPXDecode) — так свёрстаны многие
// учебники, например «Skillful 4». Такую картинку pdf.js декодирует своим OpenJPEG
// на wasm и догружает его по `wasmUrl`: без него страница выходит пустой
// («JpxError: OpenJPEG failed to initialize»).
//
// Одна страница 300 × 400 pt, посередине плашка 200 × 100 pt (x 50…250, y 150…250
// от низа) — картинка plate.jp2, 32 × 16 px цвета JPX_PLATE_RGB. Получена так:
// PNG 32 × 16 этого цвета → `sips -s format jp2 plate.png --out plate.jp2` (macOS);
// sips кладёт в файл и профиль sRGB, как у настоящих учебников.
//
// Файл читает сам тест: Playwright собирает спеки в CommonJS, и import.meta здесь
// у него не работает.
export const PLATE_JP2 = 'src/screens/live/pdf/__fixtures__/plate.jp2'

export const JPX_PLATE_RGB = [220, 30, 30]

/** @param {Uint8Array} jp2 — байты plate.jp2 */
export function pdfWithJpxImage(jp2) {
  const text = (value) => new TextEncoder().encode(value)
  const content = 'q 200 0 0 100 50 150 cm /Im1 Do Q'
  const objects = [
    text('<< /Type /Catalog /Pages 2 0 R >>'),
    text('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    text('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>'),
    text(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
    concat([
      text(`<< /Type /XObject /Subtype /Image /Width 32 /Height 16 /Filter /JPXDecode /Length ${jp2.length} >>\nstream\n`),
      jp2,
      text('\nendstream'),
    ]),
  ]
  // Картинка — двоичные байты, поэтому смещения в xref считаются в байтах, а не в символах строки.
  const parts = [text('%PDF-1.5\n')]
  const offsets = []
  let size = parts[0].length
  objects.forEach((body, i) => {
    offsets.push(size)
    for (const part of [text(`${i + 1} 0 obj\n`), body, text('\nendobj\n')]) {
      parts.push(part)
      size += part.length
    }
  })
  let tail = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  tail += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  tail += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`
  parts.push(text(tail))
  return concat(parts)
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
