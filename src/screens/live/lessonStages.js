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
export function parseStageMessage(data) {
  if (!data || data.source !== LESSON_SOURCE || data.type !== 'stage') return null
  const index = Number(data.index)
  if (!Number.isInteger(index) || index < 0) return null
  const total = Number(data.total)
  return { index, total: Number.isInteger(total) && total >= 0 ? total : null }
}

/** Просьба рамке перейти на стадию — её ждёт скрипт в файле. */
export function gotoStageMessage(index) {
  return { source: WORKSPACE_SOURCE, type: 'goto-stage', index }
}
