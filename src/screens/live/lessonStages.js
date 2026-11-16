// Стадии файлового урока в «Темах» живого урока.
//
// У FILE-занятия (движок занятия — per-lesson поле, см. lessonExtractor.js, а не
// глобальный рубильник) разбора на шаги нет, и список тем справа падал на
// разделы занятия — а у занятия с одним материалом это одна строка «Материал
// урока», по которой некуда идти. Преподавателю в админке темы вернули из
// самого файла: стадии `section.stage` сервер снимает при импорте ключей и
// отдаёт ручкой …/lesson-view/stages. Здесь — то же самое тем же контрактом:
//
//   сервер → страница:  GET …/lesson-view/stages → [{index, title, taskCount}]
//   рамка  → страница:  {source:'jts-lesson',    type:'stage',      index, total}
//   страница → рамка:   {source:'jts-workspace', type:'goto-stage', index}
//
// Контракт общий с web-admin (lesson-workspace) и со скриптом, который бэкенд
// вшивает в файл (MaterialBridgeScriptInjector.injectStageBridge): менять одну
// сторону без остальных нельзя.
export const LESSON_SOURCE = 'jts-lesson'
export const WORKSPACE_SOURCE = 'jts-workspace'

/**
 * Стадии → строки маршрута (контракт LessonTopics/StepNav: {id, order, title}).
 * id — индекс стадии строкой: им же рамка называет позицию, им же мы просим
 * переход. Стадия без названия подписывается «Stage N», как и на сервере.
 */
export function stageSteps(stages) {
  return (stages || []).map((stage, i) => {
    const index = Number.isInteger(stage?.index) ? stage.index : i
    return { id: String(index), order: i + 1, title: stage?.title || `Stage ${i + 1}` }
  })
}

/** Статусы строк по позиции рамки: до текущей — пройдено, дальше — впереди. */
export function stageStatusById(stages, currentIndex) {
  const map = {}
  stageSteps(stages).forEach((step, i) => {
    map[step.id] = i === currentIndex ? 'current' : i < currentIndex ? 'done' : 'upcoming'
  })
  return map
}

/**
 * Сообщение рамки о смене стадии → {index, total}, иначе null. Индекс обязан
 * быть целым и неотрицательным: им адресуется строка списка. `total` рамка
 * может не прислать — позиция от этого не теряется.
 */
/** Названия разделов, которые рамка прочитала из открытого урока. */
export function parseStageListMessage(data) {
  if (!data || data.source !== LESSON_SOURCE || data.type !== 'stage-list') return null
  if (!Array.isArray(data.titles)) return null
  const titles = data.titles.filter((title) => typeof title === 'string' && title.trim())
  return titles.length ? titles : null
}

export function parseStageMessage(data) {
  if (!data || data.source !== LESSON_SOURCE || data.type !== 'stage') return null
  const index = Number(data.index)
  if (!Number.isInteger(index) || index < 0) return null
  const total = Number(data.total)
  return { index, total: Number.isInteger(total) && total >= 0 ? total : null }
}

/**
 * Просьба рамке перейти на стадию — её ждёт скрипт в файле. silent — переход не по своему
 * выбору (стадия класса, доводка): мост не пишет его в ответы ученика и не шлёт
 * преподавателю его кликом, который уносил рамку преподавателя наверх (стенд 01.11.2026).
 */
export function gotoStageMessage(index, { silent = false } = {}) {
  return silent
    ? { source: WORKSPACE_SOURCE, type: 'goto-stage', index, silent: true }
    : { source: WORKSPACE_SOURCE, type: 'goto-stage', index }
}

/**
 * Просьба рамке открыть конкретный урок файла (L05 → index 5).
 * Тот же кадр, что шлёт web-admin после загрузки iframe: без него файл
 * вспоминает последний урок самоподготовки — «сегодняшний» вместо 21-го.
 */
export const GOTO_LESSON_MS = 600

export function gotoLessonMessage(index, review = false) {
  return { source: WORKSPACE_SOURCE, type: 'goto-lesson', index, review: Boolean(review) }
}

/**
 * Ключ урока плитки для сервера: «4» — урок, «R2» — тест юнита; плитка файла целиком — null.
 * Один файл бывает на занятии в нескольких разделах с разными уроками (прод 16.11.2026, занятие 48594:
 * урок 4 и урок 5), и без этого ключа в адресе сервер открывал в каждой плитке урок, выбранный последним.
 */
export function fileLessonKey(material) {
  const no = material?.focusLessonNo
  if (no == null) return null
  return material.focusReview ? `R${no}` : String(no)
}

/**
 * Открытая плитка раздела. Плитку называет строка раздела (id ссылки), материал — только вместе с ней: у двух
 * уроков одного файла в одном разделе материал один (прод 16.11.2026, 100 занятий до правила сервера от 12.11), и
 * выбор по материалу всегда находил первую из них. Плитка не из этого раздела или другого материала не считается —
 * тогда, как и раньше, первая плитка материала, а без материала — первая в разделе.
 */
export function activeTileOf(tiles, materialId, tileId) {
  const list = tiles || []
  const own = tileId == null ? null : list.find((m) => m.id === tileId && m.materialId === materialId)
  return own || list.find((m) => m.materialId === materialId) || list[0] || null
}

/**
 * Подпись урока плитки к названию вкладки — только когда файл стоит в разделе не одной плиткой: у таких вкладок
 * одно название файла, и без урока их не различить. {key, n} для t() или null.
 */
export function repeatedFileTileLesson(material, tiles) {
  if (material?.focusLessonNo == null) return null
  const repeats = (tiles || []).filter((m) => m.materialId === material.materialId).length > 1
  if (!repeats) return null
  return { key: material.focusReview ? 'live.tileUnitTest' : 'live.tileLesson', n: material.focusLessonNo }
}
