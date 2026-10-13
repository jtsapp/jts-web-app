// Непройденные шаги тропы «Обучения» уровня — по ним план подписывает «урок курса» («Урок: Famous people») и тест юнита.
// Тропа та же, что рисует KingdomInteriorPage: курс нового поколения (public/course/<level>/index.json, courseTrail) и
// пройденные коды модуля уровня (бэкенд + локальное зеркало, loadDone). Подпись — украшение: любой сбой даёт пустой
// список, и задача остаётся просто «Урок курса».

import { getLessonModules } from '../../api.js'
import { pickLevelModule } from '../../learning/lessonModule.js'
import { loadDone } from '../../learning/lessonProgress.js'
import { courseTrail, getCourseIndex } from '../../learning/courseData.js'

/** Шаги тропы, которых нет среди пройденных, по порядку. done — массив или Set кодов. */
export function openNodes(trail, done) {
  const passed = done instanceof Set ? done : new Set(done || [])
  return (trail || []).filter((n) => !passed.has(n.code))
}

export async function loadCourseFrontier(level, token) {
  if (!level || !token) return []
  try {
    const [index, mods] = await Promise.all([getCourseIndex(level), getLessonModules(token).catch(() => [])])
    if (!index) return []
    const mod = pickLevelModule(mods, level)
    return openNodes(courseTrail(index), await loadDone(level, token, mod ? mod.id : null))
  } catch {
    return []
  }
}
