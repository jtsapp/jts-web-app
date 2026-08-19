// Контент урока Shadowing: public/shadowing/<id>.json. В индексе (lessons.js)
// лежат только метаданные, фразы приезжают отсюда по требованию.
//
// Кэш промисов на уровне модуля — по образцу src/learning/lessonData.js:
// переключение табов туда-сюда не должно бить в сеть, а параллельные вызовы
// (экран + пересчёт мастерства) должны схлопываться в один запрос. При ошибке
// запись из кэша убираем, чтобы следующий заход попробовал снова.

const FILE_URL = (id) => `/shadowing/${id}.json`

const cache = new Map() // id → Promise<файл урока>

// Файл урока целиком: { id, title, short, video, source, level, segments }.
// Урок-болванка (сгенерил scripts/extract-shadowing.js, сегменты ещё не
// нарезаны) отдаётся как есть — экран покажет пустой скрипт, но авторский
// режим ?dev=1 останется рабочим, из него урок и добивают.
export function loadLessonFile(id) {
  if (!cache.has(id)) {
    const p = fetch(FILE_URL(id))
      .then((r) => {
        if (!r.ok) throw new Error(`shadowing ${id} ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        cache.delete(id)
        throw e
      })
    cache.set(id, p)
  }
  return cache.get(id)
}
