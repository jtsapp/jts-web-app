// Тонкая обёртка над pdf.js: единственное место, где приложение его грузит.
// Отдельный модуль — чтобы тесты подменяли загрузку (vi.mock), не поднимая
// настоящий воркер.
//
// Сборка legacy: обычная требует свежих движков (Promise.withResolvers,
// Map.groupBy), а ученики сидят и на старых iPhone и Android. Библиотека — около
// 0,5 МБ и воркер — ещё 1,3 МБ, поэтому только динамическим import(): в бандл
// урока они не попадают и качаются при первом PDF.
//
// Воркер — из сборки самого приложения (new URL(..., import.meta.url) Next
// превращает в путь к файлу в /_next/static), без CDN: внешний скрипт в уроке
// — лишняя зависимость и лишний адрес, которому надо доверять.
let libraryPromise = null

/**
 * Ресурсы, которые pdf.js догружает по ходу документа. Тоже свои, не с CDN — по той
 * же причине, что и воркер: лежат в public/pdfjs (копия из pdfjs-dist,
 * scripts/copy-pdfjs-assets.js; тест рядом сверяет её с установленной версией).
 * - wasm — декодеры картинок: без него страницы с JPEG 2000 (так свёрстаны многие
 *   учебники) выходят пустыми;
 * - standard_fonts — стандартные шрифты PDF, которых нет в системе (Symbol,
 *   ZapfDingbats, замена Helvetica и Times на телефоне): без них пропадает часть текста;
 * - cmaps — кодировки CJK-шрифтов, iccs — профиль для картинок в CMYK.
 *
 * Адреса абсолютные: файлы качает воркер pdf.js, а относительный адрес он считал
 * бы от своего файла в /_next/static, не от страницы.
 */
export function pdfjsResources(origin) {
  const folder = (name) => new URL(`/pdfjs/${name}/`, origin).href
  return {
    wasmUrl: folder('wasm'),
    standardFontDataUrl: folder('standard_fonts'),
    cMapUrl: folder('cmaps'),
    cMapPacked: true,
    iccUrl: folder('iccs'),
  }
}

function loadLibrary() {
  if (!libraryPromise) {
    libraryPromise = import('pdfjs-dist/legacy/build/pdf.mjs')
      .then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
        return lib
      })
      .catch((error) => {
        // Сбой сети на загрузке чанка не должен навсегда закрыть PDF до перезагрузки страницы.
        libraryPromise = null
        throw error
      })
  }
  return libraryPromise
}

/**
 * Открыть PDF по адресу. Возвращает { promise, destroy }: promise — документ
 * pdf.js, destroy — отменить загрузку и освободить документ (вызывать всегда,
 * когда документ больше не нужен, в том числе до окончания загрузки).
 *
 * disableAutoFetch — не качать файл целиком в фоне: файловый сервер отдаёт
 * его кусками (Range), и pdf.js берёт только те, что нужны видимым страницам.
 * isEvalSupported: false — шрифты без eval: документ приходит от пользователя.
 */
export function openPdf(url) {
  let task = null
  let destroyed = false
  const promise = loadLibrary().then((lib) => {
    if (destroyed) throw new Error('PDF loading cancelled')
    task = lib.getDocument({ url, disableAutoFetch: true, isEvalSupported: false, ...pdfjsResources(window.location.origin) })
    return task.promise
  })
  return {
    promise,
    destroy() {
      destroyed = true
      task?.destroy()
    },
  }
}
