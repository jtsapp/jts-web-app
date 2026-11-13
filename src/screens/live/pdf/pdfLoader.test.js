// @vitest-environment jsdom
//
// Что загрузчик передаёт pdf.js. Ресурсы (wasm, шрифты, кодировки, профиль CMYK)
// pdf.js сам не найдёт: без адресов страницы с JPEG 2000 выходят пустыми, а часть
// текста пропадает. Что по этим адресам лежат рабочие файлы, проверяет
// pdfjsContract.test.js.
import { describe, it, expect, vi } from 'vitest'

const getDocument = vi.fn(() => ({ promise: Promise.resolve({ numPages: 1 }), destroy: vi.fn() }))

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {}, getDocument }))

const { openPdf } = await import('./pdfLoader.js')

describe('openPdf', () => {
  it('отдаёт pdf.js адреса его ресурсов — с этого же сайта, папками со слэшем на конце', async () => {
    const loading = openPdf('https://files.test/book.pdf')
    await loading.promise
    const origin = window.location.origin
    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://files.test/book.pdf',
      wasmUrl: `${origin}/pdfjs/wasm/`,
      standardFontDataUrl: `${origin}/pdfjs/standard_fonts/`,
      cMapUrl: `${origin}/pdfjs/cmaps/`,
      cMapPacked: true,
      iccUrl: `${origin}/pdfjs/iccs/`,
    }))
    loading.destroy()
  })
})
