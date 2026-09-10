'use client'

// Загрузка данных раздела. Секция — 10–30 КБ, и грузится лениво: каталог
// показывает обложки по мете, а слова со слотами нужны только открытой сцене.
// Промис кэшируется на уровне модуля (паттерн fetchLevel из ReadingPage):
// возврат в каталог не перекачивает уже прочитанное.

const BASE = '/practice/words'

const sectionCache = new Map()
let metaPromise = null

function fetchJson(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`bad status ${r.status} for ${url}`)
    return r.json()
  })
}

/** Секции и сцены для каталога: имена, обложки, счётчики слов. */
export function loadMeta() {
  if (!metaPromise) {
    metaPromise = fetchJson(`${BASE}/meta.json`).catch((e) => {
      // Неудачную загрузку выкидываем из кэша, иначе ошибка «прилипает» до
      // перезагрузки страницы.
      metaPromise = null
      throw e
    })
  }
  return metaPromise
}

/** Слова секции, её сцены со слотами и список путаемых пар. */
export function loadSection(section) {
  if (!sectionCache.has(section)) {
    sectionCache.set(
      section,
      fetchJson(`${BASE}/${section}.json`).catch((e) => {
        sectionCache.delete(section)
        throw e
      }),
    )
  }
  return sectionCache.get(section)
}

/** Сброс кэшей — нужен тестам, в приложении не зовётся. */
export function resetCache() {
  sectionCache.clear()
  metaPromise = null
}
