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
import { hoistOrderQuestions } from './hoistOrderQuestions.js'
import { hoistChoiceOptions } from './hoistChoiceOptions.js'
import { foldOrphanAudioSteps } from './foldOrphanAudioSteps.js'
import { hoistStepLeads } from './hoistStepLead.js'

// Кэш по id урока: содержимое не меняется до перерегистрации уровня.
const cache = new Map()

export async function loadCatalogLesson(id, token) {
  if (cache.has(id)) return cache.get(id)
  try {
    const stored = await getCourseCatalogLessonContent(id, token)
    if (!stored) return null

    // Разбор на шаги есть не у всех: из 215 самостоятельных уроков каталога он
    // сделан у 71, остальные 144 остаются файлом курса. Так и задумано — в DTO
    // ручки прямо написано «null when the lesson has no extracted structure;
    // the client falls back to fileUrl». Отдаём урок без шагов, но с файлом:
    // экран покажет материал, а не сделает вид, что урока нет.
    if (!stored.content) {
      if (!stored.fileUrl) return null
      const material = { id: stored.id ?? id, title: stored.title || '', fileUrl: stored.fileUrl, steps: [] }
      cache.set(id, material)
      return material
    }

    // Медиа внутри info-блоков лежит относительно файла урока, а не API.
    // Select / order, оставшиеся сырым HTML в старом content_json, поднимаем в
    // настоящие practice-вопросы — иначе чипы на экране не кликаются.
    const lesson = hoistChoiceOptions(
      hoistOrderQuestions(hoistSelectQuestions(rewriteMediaUrls(stored.content, stored.fileUrl))),
    )
    if (!lesson.title && stored.title) lesson.title = stored.title
    // Хвостовой «Audio» из старой конвертации — в Practice/Listening, не отдельным шагом.
    if (Array.isArray(lesson.steps)) {
      lesson.steps = hoistStepLeads(foldOrphanAudioSteps(lesson.steps))
    }

    cache.set(id, lesson)
    return lesson
  } catch {
    return null
  }
}
