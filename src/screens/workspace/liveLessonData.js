// Загрузка расширенного JSON живого урока (новый admin-пайплайн «live lessons»).
// getLiveLesson() отдаёт метаданные урока (LiveLessonResponse), включая
// meta.jsonUrl — публичную files-api ссылку на сам контент (steps/blocks/
// questions + info/match/gap.open). jsonUrl не требует авторизации — грузим
// его обычным fetch, отдельно от authGet-эндпоинтов бэкенда.
import { getLiveLesson } from '../../api.js'

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
    const lesson = await res.json()
    cache.set(id, lesson)
    return lesson
  } catch {
    return null
  }
}
