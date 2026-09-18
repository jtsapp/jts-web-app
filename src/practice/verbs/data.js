'use client'

// Данные раздела — один verbs.json (~50 КБ), его режет scripts/extract-verbs.js.
// Промис кэшируется на уровне модуля, как fetchLevel в ReadingPage: возврат на
// экран не перекачивает файл. Сбой сбрасывает кэш — следующий заход попробует
// снова, а не будет вечно отдавать тот же отказ.

let cache = null

export function loadVerbs() {
  if (!cache) {
    cache = fetch('/practice/verbs/verbs.json')
      .then((r) => {
        if (!r.ok) throw new Error(`verbs.json ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        cache = null
        throw e
      })
  }
  return cache
}
