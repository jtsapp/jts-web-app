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
 * Один материал курса — три урока каталога (self / 1-to-1 / group) с одним файлом.
 * Фронтир и «юнит пройден» считаем по материалу, иначе L03 1-to-1 оказывается
 * восьмой строкой юнита, а в «Повторении» четвёртая печенька так и не откроется.
 */
function materialKey(lesson) {
  const raw = String(lesson?.fileUrl || lesson?.file_url || '').trim()
  if (raw) {
    const file = raw.split('?')[0].split('#')[0].toLowerCase()
    if (file) return `file:${file}`
  }
  const id = Number(lesson?.id)
  return Number.isFinite(id) ? `id:${id}` : null
}

function uniqueMaterials(unit) {
  const slots = []
  const index = new Map()
  for (const lesson of unit?.lessons || []) {
    const key = materialKey(lesson)
    if (!key) continue
    let slot = index.get(key)
    if (!slot) {
      slot = { ids: [] }
      index.set(key, slot)
      slots.push(slot)
    }
    const id = Number(lesson.id)
    if (Number.isFinite(id)) slot.ids.push(id)
  }
  return slots
}

function slotDone(slot, done) {
  return slot.ids.some((id) => done.has(id))
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
    const slots = uniqueMaterials(unit)
    return slots.length === 0 || slots.every((slot) => slotDone(slot, done))
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
    uniqueMaterials(unit).forEach((slot, li) => {
      if (!slotDone(slot, done)) return
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
 * Ученик, которому каталог не открывает на этом уровне НИЧЕГО.
 *
 * Раздел задуман как повторение пройденного, и источник у него один —
 * отметки в каталоге: живое занятие или «Самостоятельно». Но у того, кто не
 * отметил ещё ни одного материала этого уровня, «Повторение» превращается в
 * тупик: заперта вся тропа до первой печеньки, и открыть её изнутри раздела
 * нечем. Так и пришла жалоба — «мында жерде басылмайды», у ученика на одном
 * только самостоятельном тарифе занятий с преподавателем нет вовсе, а значит
 * и отметок взяться неоткуда.
 *
 * Тупик снимаем ровно для этого случая: тропа открывается по собственному
 * прохождению, по порядку с первого урока. Перепрыгнуть вперёд по-прежнему
 * нельзя, блокировка модуля админом и квота на модуль остаются в силе, а у
 * того, кому каталог что-то открывает (`frontier` есть), поведение прежнее.
 *
 * `catalogAnswered` обязателен: отказ сети и «ученик ничего не проходил»
 * снаружи выглядят одинаково (getCatalogProgress ловит ошибку в null), и
 * открывать тропу из-за упавшего запроса нельзя.
 *
 * @param {boolean} catalogAnswered  каталог прогресса ответил (а не упал)
 * @param {{ unit: number, lesson: number }|null} frontier  из catalogFrontier
 */
export function isReviewSelfPaced(catalogAnswered, frontier) {
  return Boolean(catalogAnswered) && !frontier
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
