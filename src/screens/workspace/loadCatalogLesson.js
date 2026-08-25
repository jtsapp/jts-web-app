// Загружает урок каталога для workspace. Структура разбирается один раз при
// регистрации уровня в админке и лежит на бэкенде — здесь её остаётся забрать и
// разрешить относительные медиа-URL относительно файла урока (E6).
//
// Раньше каждый учитель извлекал структуру у себя: fetch 11-мегабайтного HTML,
// рендер в скрытом iframe и до 4 с ожидания на каждое открытие, с результатом,
// зависящим от скорости машины. Теперь это стоит один GET.
import { getCourseCatalogLessonContent } from '../../api.js'
import { rewriteMediaUrls } from './extract/rewriteMediaUrls.js'
import { hoistSelectQuestions } from './hoistSelectQuestions.js'

// Кэш по id урока: содержимое не меняется до перерегистрации уровня.
const cache = new Map()

export async function loadCatalogLesson(id, token) {
  if (cache.has(id)) return cache.get(id)
  try {
    const stored = await getCourseCatalogLessonContent(id, token)
    if (!stored?.content) return null

    // Медиа внутри info-блоков лежит относительно файла урока, а не API.
    const lesson = hoistSelectQuestions(rewriteMediaUrls(stored.content, stored.fileUrl))
    if (!lesson.title && stored.title) lesson.title = stored.title

    cache.set(id, lesson)
    return lesson
  } catch {
    return null
  }
}
