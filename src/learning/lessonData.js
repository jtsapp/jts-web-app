// Загрузчик нативных данных уроков «Обучения» (по образцу grammarData.js).
// Лёгкий каталог index.json и тяжёлые <level>.json грузятся по требованию и
// кэшируются в модуле — экраны обращаются через getLessonCatalog / loadLevel.
//
// Данные генерирует scripts/extract-kingdom-lessons.js → public/learning/.

const CATALOG_URL = '/learning/index.json'
const LEVEL_URL = (code) => `/learning/${code}.json`

let catalogPromise = null
const levelCache = new Map() // code -> Promise<{lessons:{}}>

/**
 * В источнике курса часть строк попала с литеральными JSON-эскейпами
 * (`caf\\u00e9`, `say \\u2192 said`) — после JSON.parse это всё ещё шесть
 * символов `\u00e9`, а не «é» / «→». Декодируем один раз при загрузке, чтобы
 * и экран, и ключи ответов совпадали с тем, что печатает ученик.
 */
export function decodeUnicodeEscapes(value) {
  if (typeof value !== 'string' || !value.includes('\\u')) return value
  return value.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  )
}

export function deepDecodeUnicodeEscapes(value) {
  if (typeof value === 'string') return decodeUnicodeEscapes(value)
  if (Array.isArray(value)) return value.map(deepDecodeUnicodeEscapes)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) {
      out[key] = deepDecodeUnicodeEscapes(value[key])
    }
    return out
  }
  return value
}

// Каталог всех уровней: { levels:[{code,label,lessonCount}], <code>:{lessons:[…]} }
export function getLessonCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`catalog ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        catalogPromise = null // дать повторную попытку при следующем заходе
        throw e
      })
  }
  return catalogPromise
}

// Список уроков уровня (в порядке тропы) — [{code,order,title,taskCount}].
export async function getLevelLessons(level) {
  const code = String(level || '').toLowerCase()
  const cat = await getLessonCatalog()
  return (cat[code] && cat[code].lessons) || []
}

// Тяжёлые данные уроков уровня: { lessons:{ "<code>":{code,title,tasks:[…]} } }.
export function loadLevel(level) {
  const code = String(level || '').toLowerCase()
  if (!levelCache.has(code)) {
    const p = fetch(LEVEL_URL(code))
      .then((r) => {
        if (!r.ok) throw new Error(`level ${code} ${r.status}`)
        return r.json()
      })
      .then((data) => deepDecodeUnicodeEscapes(data))
      .catch((e) => {
        levelCache.delete(code)
        throw e
      })
    levelCache.set(code, p)
  }
  return levelCache.get(code)
}

// Один урок уровня по коду — { code, title, tasks } | null.
export async function loadLesson(level, code) {
  const data = await loadLevel(level)
  return (data.lessons && data.lessons[code]) || null
}

/** Сброс кэша — для тестов. */
export function clearLessonDataCache() {
  catalogPromise = null
  levelCache.clear()
}
