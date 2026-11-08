import { useEffect, useState } from 'react'
import { getLessonModules, getLessonSections, getLessonsSummary } from '../../api.js'
import { pickLevelModule } from '../../learning/lessonModule.js'
import { loadDone } from '../../learning/lessonProgress.js'
import { courseTrail, getCourseIndex } from '../../learning/courseData.js'
import { lessonTopicFromSections } from '../schedule/lessonFormat.js'

// Данные новых блоков «Главной» (ТЗ v2.0, 5.1 и 5.4), которых экран раньше не грузил. Каждый запрос — украшение: сбой
// даёт null, и блок показывает то, что знает, а не падает. Вызовы — внутри цепочки промиса: в юнит-тестах «Главной»
// api.js подменён, и ручки, которой нет в моке, синхронно бросают — экран не должен из-за этого рушиться.
const call = (fn) => Promise.resolve().then(fn)

/**
 * Тропа уровня и пройденные коды — для «Сейчас · урок N из M» и ближайшего теста курса. Источники те же, что у тропы
 * «Обучения» и подписей плана (ge/plan/courseFrontier.js): каталог курса и модуль уровня. Модуля нет — null: без него
 * пройденное знает только зеркало устройства, и на чистом браузере двадцатый урок назвался бы первым.
 */
export async function loadCourseProgress(level, token) {
  if (!level || !token) return null
  try {
    const [index, mods] = await Promise.all([getCourseIndex(level), call(() => getLessonModules(token)).catch(() => [])])
    if (!index) return null
    const mod = pickLevelModule(mods, level)
    if (!mod) return null
    const trail = courseTrail(index)
    if (!trail.length) return null
    return { trail, done: await loadDone(level, token, mod.id) }
  } catch {
    return null
  }
}

// Ответ помнит, к какому запросу он: сменились уровень или аккаунт — старый ответ не показывается, пока не придёт новый.
export function useCourseProgress(level, token) {
  const key = level && token ? `${level}|${token}` : null
  const [state, setState] = useState({ key: null, value: null })
  useEffect(() => {
    if (!key) return undefined
    let alive = true
    loadCourseProgress(level, token).then((value) => {
      if (alive) setState({ key, value })
    })
    return () => {
      alive = false
    }
  }, [key, level, token])
  return state.key === key ? state.value : null
}

/** Итоги уроков ученика (/admin/lessons/summary — те же плитки, что на экране «Уроки»). enabled — только формату с преподавателем. */
export function useLessonsSummary(token, enabled) {
  const [summary, setSummary] = useState(null)
  useEffect(() => {
    if (!token || !enabled) return undefined
    let alive = true
    call(() => getLessonsSummary(token))
      .then((s) => {
        if (alive) setSummary(s && typeof s === 'object' ? s : null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token, enabled])
  return summary
}

/**
 * Тема урока — название материала первого раздела, как у карточки над календарём «Уроков» (useLessonTopic). Своя копия
 * только ради безопасного вызова: та зовёт ручку напрямую, а «Главную» рисуют тесты с урезанным моком api.js.
 */
export function useLessonTopic(token, lessonId) {
  const key = token && lessonId != null ? String(lessonId) : null
  const [state, setState] = useState({ key: null, topic: null })
  useEffect(() => {
    if (!key) return undefined
    let alive = true
    call(() => getLessonSections(token, lessonId))
      .then((sections) => {
        if (alive) setState({ key, topic: lessonTopicFromSections(sections) })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [key, token, lessonId])
  return state.key === key ? state.topic : null
}
