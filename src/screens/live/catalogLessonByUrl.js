import { getCourseCatalog } from '../../api.js'

// Материал раздела ссылается на файл урока каталога, а не на сам урок: раздел
// хранит {title, fileUrl}, и id урока в нём нет. Чтобы показать урок разобранным
// на шаги — с настоящими заданиями, а не картинкой в iframe — этот id нужно
// сначала найти. Ищем по каталогу: файл у урока свой, и это единственное, что
// связывает две записи.
//
// Три режима одного урока делят файл и отличаются только `?mode=`, поэтому
// сравниваем ссылки целиком: L01.html?mode=self и L01.html?mode=group — разные
// уроки с разными формулировками, и подменить один другим нельзя.

/** Ссылка без хвостов, которые не меняют, какой это урок. */
function normalize(url) {
  if (!url) return ''
  return String(url).trim().replace(/#.*$/, '')
}

/** Плоский список уроков каталога — дерево уровень → юнит → урок. */
function flatten(levels) {
  const out = []
  for (const level of levels || []) {
    for (const unit of level.units || []) {
      for (const lesson of unit.lessons || []) out.push(lesson)
    }
  }
  return out
}

/**
 * id урока каталога по ссылке на его файл, или null — если такого урока в
 * каталоге нет (материал загружен преподавателем сам, а не выбран из каталога).
 */
export function findCatalogLessonId(levels, fileUrl) {
  const target = normalize(fileUrl)
  if (!target) return null

  const lessons = flatten(levels)
  const exact = lessons.find((l) => normalize(l.fileUrl) === target)
  if (exact) return exact.id

  // Ссылка могла прийти без режима (уровень залит до того, как режимы
  // появились) — тогда достаточно совпадения по самому файлу.
  const path = target.split('?')[0]
  const byFile = lessons.find((l) => normalize(l.fileUrl).split('?')[0] === path)
  return byFile ? byFile.id : null
}

/** То же, но с походом за каталогом. Каталог кэшируется на уровне api.js. */
export async function catalogLessonIdFor(fileUrl, token) {
  if (!fileUrl || !token) return null
  try {
    const levels = await getCourseCatalog(token)
    return findCatalogLessonId(levels, fileUrl)
  } catch {
    return null
  }
}
