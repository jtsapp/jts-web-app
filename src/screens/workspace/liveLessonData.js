// Загрузка расширенного JSON живого урока (новый admin-пайплайн «live lessons»).
// getLiveLesson() отдаёт метаданные урока (LiveLessonResponse), включая
// meta.jsonUrl — публичную files-api ссылку на сам контент (steps/blocks/
// questions + info/match/gap.open). jsonUrl не требует авторизации — грузим
// его обычным fetch, отдельно от authGet-эндпоинтов бэкенда.
import { getLiveLesson } from '../../api.js'
import { applyLessonHoists } from './lessonPipeline.js'

// Кэш по id урока: повторные открытия того же урока в рамках сессии не должны
// бить сеть заново (контент урока не меняется, пока учитель не пересоберёт его
// в админке — новая публикация придёт с новым id/jsonUrl).
const cache = new Map()

export async function loadLiveLesson(id, token) {
  if (cache.has(id)) return cache.get(id)
  try {
    const meta = await getLiveLesson(id, token)
    const jsonUrl = meta?.jsonUrl
    if (!jsonUrl) return null
    const res = await fetch(jsonUrl)
    if (!res.ok) return null
    const raw = await res.json()
    // Тот же конвейер, что у урока каталога (loadCatalogLesson) и у
    // преподавателя в админке (lesson-workspace.component: applyLessonHoists с
    // fileUrl материала). Живой урок его не проходил вовсе, и это стоило двух
    // вещей сразу:
    //
    //  * медиа в разметке лежит ОТНОСИТЕЛЬНО файла урока (`audio/…`), и без
    //    rewriteMediaUrls плеер просил несуществующий адрес — запись молчала.
    //    Ровно это и описали с урока: «в живом уроке аудио не воспроизводится,
    //    а в домашке та же карточка играет» (домашка идёт через каталог, то
    //    есть через конвейер);
    //  * id вопросов считаются по дереву ПОСЛЕ подъёмов, а живой урок сводит
    //    стороны именно по questionId. Преподаватель конвейер прогонял, ученик
    //    нет — значит совпадение id держалось на удаче.
    //
    // База — htmlUrl: медиа относительно файла урока, а не относительно
    // извлечённого JSON, который может лежать и в другом месте.
    const lesson = applyLessonHoists(raw, meta?.htmlUrl || jsonUrl)
    cache.set(id, lesson)
    return lesson
  } catch {
    return null
  }
}
