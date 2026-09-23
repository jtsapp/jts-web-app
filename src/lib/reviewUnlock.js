// Открытие юнитов «Повторения» (бывшее «Обучение», см. kingdoms.js) по факту
// пройденного в каталоге — живым уроком с преподавателем ИЛИ самостоятельно в
// «Самостоятельно». Источник один: completedLessonIds из getCatalogProgress —
// его пополняет и ручная кнопка «Отметить пройденным», и (с бэкенд-моста
// LiveLessonCatalogProgressSync) завершённое живым уроком занятие.
//
// Правило простое и позиционное, без карты соответствий содержимого: юнит N
// курса каталога пройден целиком → юнит N «Повторения» этого же уровня открыт.
// Номер — это порядок в массиве course.units, не какое-то отдельное поле: тот
// же порядок, в котором юниты идут в «Самостоятельно» и на витрине курса.
//
// На уровне бывает несколько курсов каталога (общий и, например, «Business
// English» с тем же кодом уровня, separateAccess: true) — источником считаем
// только общий: у отдельного курса материалы другие, юнит 1 «Business» — не
// то же самое, что юнит 1 общего курса, и сравнивать их по номеру значило бы
// путать разные программы. Если общего курса на уровне нет вовсе — юниты
// «Повторения» этого уровня не открываются: угадывать источник неправильно,
// молчаливая ошибка обойдётся дороже честного «пока нечем открыть».
//
// Модуль чистый: без сети и без дат «сейчас» — то же свойство, что у
// band-tables.js и recommend.js, и по той же причине (тестируется без сети,
// не должно разъезжаться между клиентом и сервером).

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
 * Юниты общего курса, пройденные целиком — по порядку курса, не по номеру
 * юнита в «Повторении»: это одно и то же по правилу модуля, но явно решает
 * только эта функция, а не потребитель.
 *
 * Юнит без единого урока (в каталоге такое не встречается, но не должно
 * запирать соседей) считается пройденным: блокировать по пустому юниту
 * нечего.
 *
 * @param {{ units?: { lessons?: { id: number|string }[] }[] }} course
 * @param {Set<number>|number[]} completedLessonIds
 * @returns {boolean[]}
 */
export function catalogUnitsDone(course, completedLessonIds) {
  const done = completedLessonIds instanceof Set ? completedLessonIds : new Set(completedLessonIds || [])
  return (course?.units || []).map((unit) => {
    const lessons = unit.lessons || []
    return lessons.length === 0 || lessons.every((l) => done.has(Number(l.id)))
  })
}

/**
 * Открыт ли юнит «Повторения» с этим номером (`l.unit` из курса самого
 * раздела, как группирует KingdomInteriorPage).
 *
 * Финальный экзамен уровня (`unitNumber === 0`, `lesson.examUnit`) — не
 * позиция курса каталога: он открывается, когда пройдены ВСЕ юниты курса, а
 * не какой-то один под тем же номером. Юнит вне длины курса каталога (в
 * «Повторении» контента больше, чем в каталоге) — не открыт: сигнала для
 * него нет, и открывать наугад нельзя.
 *
 * @param {boolean[]} unitsDone  из catalogUnitsDone; пустой массив — источника
 *   нет вовсе (курса не нашли), тогда ничего не открыто, кроме случая ниже.
 * @param {number} unitNumber
 */
export function isReviewUnitUnlocked(unitsDone, unitNumber) {
  if (unitNumber === 0) return unitsDone.length > 0 && unitsDone.every(Boolean)
  const i = unitNumber - 1
  return i >= 0 && i < unitsDone.length && unitsDone[i]
}
