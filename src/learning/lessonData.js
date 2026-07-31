// Загрузчик нативных данных уроков «Обучения» (по образцу grammarData.js).
// Лёгкий каталог index.json и тяжёлые <level>.json грузятся по требованию и
// кэшируются в модуле — экраны обращаются через getLessonCatalog / loadLevel.
//
// Данные генерирует scripts/extract-kingdom-lessons.js → public/learning/.

const CATALOG_URL = '/learning/index.json'
const LEVEL_URL = (code) => `/learning/${code}.json`

let catalogPromise = null
const levelCache = new Map() // code -> Promise<{lessons:{}}>

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
