// Что «Уроки» открывают в «Повторении» (бывшее «Обучение», см. kingdoms.js).
//
// Тропа «Повторения» идёт подряд сама: первый урок открыт, каждый следующий —
// после предыдущего, живые занятия для этого не нужны (KingdomInteriorPage).
// Каталог «Уроков» только добавляет открытое — двумя слоями, иначе ученик,
// пришедший в середине курса, начинал бы повторение с первого урока:
//
// 1. Уровень НИЖЕ своего CEFR — открыт целиком. Карта королевств уже пускает
//    туда (computeKingdoms / LevelAccessService: свой и всё, что ниже), и
//    B1-ученик повторяет A0–A2 в любом порядке.
//
// 2. СВОЙ уровень — по материалу урока/каталога: completedLessonIds из
//    getCatalogProgress (кнопка «Отметить пройденным» и
//    LiveLessonCatalogProgressSync после живого занятия). Позиция — самая
//    дальняя пройденная в общем курсе: «в занятии материал юнита 2, урока 3»
//    открывает всё до этой точки, а не только юнит, пройденный целиком.
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
 * Открывает ли каталог узел «Повторения» — СВЕРХ того, что тропа открывает
 * сама по порядку (KingdomInteriorPage): каталог только добавляет открытое и
 * ничего не запирает. `meta` — юнит узла (`l.unit` курса раздела) и его номер
 * в юните, оба с единицы; узел финального экзамена — юнит 0.
 *
 * До 06.10.2026 каталог был единственным источником, и у ученика без отметок
 * (тариф «Самостоятельно», живых занятий нет) тропа стояла запертой. 06.10
 * его убрали совсем (2f619fe0) — и у всех, кто учился в «Уроках», «Повторение»
 * выглядело сброшенным: открытые по занятиям узлы снова закрылись. Теперь оба
 * правила вместе: проходить можно без живых уроков, а пройденное в «Уроках»
 * остаётся открытым.
 *
 * `fullyOpen` — уровень ниже CEFR ученика: всё, включая экзамен.
 * `frontier` — на своём уровне юниты до самой дальней точки каталога; в юните
 * этой точки — уроки до неё, а если юнит пройден в каталоге целиком
 * (`unitsDone`), то весь: уроков в «Повторении» часто больше, чем материалов.
 * Экзамен — когда в каталоге пройдены ВСЕ юниты курса.
 *
 * @param {{ unit: number, lessonInUnit: number }} meta
 * @param {{ fullyOpen?: boolean, frontier?: { unit: number, lesson: number }|null, unitsDone?: boolean[] }} [opts]
 */
export function isOpenedByCatalog(meta, opts = {}) {
  if (opts.fullyOpen) return true
  const unitsDone = opts.unitsDone || []
  const { unit, lessonInUnit } = meta || {}
  if (unit === 0) return unitsDone.length > 0 && unitsDone.every(Boolean)
  const frontier = opts.frontier
  if (!frontier || !(unit >= 1)) return false
  if (unit < frontier.unit) return true
  if (unit > frontier.unit) return false
  return Boolean(unitsDone[unit - 1]) || (lessonInUnit >= 1 && lessonInUnit <= frontier.lesson)
}
