// Открытие «Повторения» (бывшее «Обучение», см. kingdoms.js).
//
// Два слоя, иначе ученик, пришедший в середине курса, видит пустые замки:
//
// 1. Уровень НИЖЕ своего CEFR — открыт целиком. Карта королевств уже пускает
//    туда (computeKingdoms / LevelAccessService: свой и всё, что ниже). Без
//    этого слоя тропа внутри всё равно ждала каталог, и B1-ученик до первого
//    занятия не мог повторить A0–A2.
//
// 2. СВОЙ уровень — по материалу урока/каталога. Источник тот же:
//    completedLessonIds из getCatalogProgress (кнопка «Отметить пройденным» и
//    LiveLessonCatalogProgressSync после живого занятия). Позиция — самая
//    дальняя пройденная в общем курсе: «в занятии материал юнита 2, урока 3»
//    открывает всё до этой точки, а не только юнит, пройденный целиком.
//    Пока материала нет — уровень на карте открыт, внутри заблокирован.
//
// На уровне бывает несколько курсов (общий и, например, «Business English»
// с тем же кодом, separateAccess: true) — источником считаем только общий.
// Нет общего курса — своего уровня открывать нечем; уровни ниже это не режет.
//
// Модуль чистый: без сети и без дат «сейчас».

import { levelIndex } from '../kingdoms.js'

/**
 * Общий курс уровня — источник для позиционного открытия. `null`, если такого
 * нет вовсе (уровень весь состоит из курсов с отдельным доступом).
 *
 * @param {{ code: string, separateAccess?: boolean }[]} courses  из getCourseCatalog
 * @param {string} levelCode  CEFR-код уровня («A0», «B1», …) — как в kingdoms.js
 */
export function pickGeneralCourse(courses, levelCode) {
  const code = String(levelCode || '').toUpperCase()
  return (
    (courses || []).find((c) => String(c.code || '').toUpperCase() === code && !c.separateAccess) ?? null
  )
}

/**
 * Уровень «Повторения» ниже CEFR ученика — тропа открыта без каталога.
 * Свой и выше — нет: свой ждёт материал, выше карта и так не пускает.
 */
export function isReviewLevelFullyOpen(viewingLevel, userLevel) {
  return levelIndex(viewingLevel) < levelIndex(userLevel)
}

function completedSet(completedLessonIds) {
  return completedLessonIds instanceof Set ? completedLessonIds : new Set(completedLessonIds || [])
}

/**
 * Юниты общего курса, пройденные целиком — по порядку курса.
 * Нужны экзамену уровня: он открывается, когда пройден весь курс, а не
 * когда ученик дошёл до середины последнего юнита.
 *
 * Юнит без единого урока считается пройденным: блокировать по пустому нечего.
 *
 * @param {{ units?: { lessons?: { id: number|string }[] }[] }} course
 * @param {Set<number>|number[]} completedLessonIds
 * @returns {boolean[]}
 */
export function catalogUnitsDone(course, completedLessonIds) {
  const done = completedSet(completedLessonIds)
  return (course?.units || []).map((unit) => {
    const lessons = unit.lessons || []
    return lessons.length === 0 || lessons.every((l) => done.has(Number(l.id)))
  })
}

/**
 * Самая дальняя пройденная позиция в общем курсе: `{ unit, lesson }` —
 * оба с единицы, как номера юнита и урока в «Повторении».
 * `null`, если в этом курсе ещё ничего не отмечали.
 *
 * Берём максимум, а не «все подряд»: ученик приходит с середины уровня,
 * и в занятии сразу стоит юнит 2 / урок 3 — до этой точки должно быть открыто,
 * даже если юнит 1 в каталоге не отмечен поурочно.
 */
export function catalogFrontier(course, completedLessonIds) {
  const done = completedSet(completedLessonIds)
  let frontier = null
  ;(course?.units || []).forEach((unit, ui) => {
    ;(unit.lessons || []).forEach((lesson, li) => {
      if (!done.has(Number(lesson.id))) return
      const pos = { unit: ui + 1, lesson: li + 1 }
      if (
        !frontier
        || pos.unit > frontier.unit
        || (pos.unit === frontier.unit && pos.lesson > frontier.lesson)
      ) {
        frontier = pos
      }
    })
  })
  return frontier
}

/**
 * Открыт ли юнит «Повторения» с этим номером (`l.unit` из курса самого
 * раздела, как группирует KingdomInteriorPage).
 *
 * `fullyOpen` — уровень ниже CEFR ученика: все юниты и экзамен.
 * `frontier` — на своём уровне открыты юниты до самой дальней точки включительно.
 * Без фронтира остаётся старое правило «юнит N целиком».
 *
 * Финальный экзамен (`unitNumber === 0`) — когда пройдены ВСЕ юниты курса,
 * либо уровень открыт целиком. Середина последнего юнита экзамен не открывает.
 *
 * @param {boolean[]} unitsDone  из catalogUnitsDone
 * @param {number} unitNumber
 * @param {{ fullyOpen?: boolean, frontier?: { unit: number, lesson: number }|null }} [opts]
 */
export function isReviewUnitUnlocked(unitsDone, unitNumber, opts = {}) {
  if (opts.fullyOpen) return unitNumber === 0 || unitNumber >= 1
  if (unitNumber === 0) return unitsDone.length > 0 && unitsDone.every(Boolean)
  if (opts.frontier) return unitNumber >= 1 && unitNumber <= opts.frontier.unit
  const i = unitNumber - 1
  return i >= 0 && i < unitsDone.length && unitsDone[i]
}

/**
 * Урок внутри уже открытого юнита. Юнит целиком пройден в каталоге — не
 * режем: в «Повторении» уроков часто больше, чем материалов в каталоге.
 * Режем только юнит, до которого дошли посередине (`frontier`), и только
 * уроки после этой точки. `lessonNumber` — с единицы.
 */
export function isReviewLessonUnlocked(unitNumber, lessonNumber, opts = {}) {
  if (opts.fullyOpen) return true
  const frontier = opts.frontier
  if (!frontier) return true
  if (unitNumber < frontier.unit) return true
  if (unitNumber > frontier.unit) return false
  if (opts.unitsDone?.[unitNumber - 1]) return true
  return lessonNumber >= 1 && lessonNumber <= frontier.lesson
}
