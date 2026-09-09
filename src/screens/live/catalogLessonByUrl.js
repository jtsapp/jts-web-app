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

/**
 * Самодостаточный урок (пробный урок, диагностика) — файл лежит рядом с
 * каталожными, но уроком каталога НЕ является: он ни в одном уровне и юните не
 * состоит, на шаги не разбирается и ведёт занятие сам.
 *
 * Узнаём его по пути и в каталог за ним не ходим вовсе. Иначе перед показом
 * файла качалось бы всё опубликованное дерево — только чтобы выяснить, что
 * такого урока там нет: на старте пробного занятия это лишняя пауза на ровном
 * месте, а результат известен заранее.
 */
export function isStandaloneLessonUrl(url) {
  return /\/course-catalog\/standalone\//i.test(String(url || ''))
}

/** Ссылка без якоря. */
function normalize(url) {
  if (!url) return ''
  return String(url).trim().replace(/#.*$/, '')
}

/**
 * Путь файла + `mode`. Подпись S3, cache-buster и прочий query не входят:
 * материал раздела часто приходит с `?mode=solo&X-Amz-…`, а в каталоге тот же
 * урок лежит как `?mode=solo`. Сравнивать строки целиком — значит не найти
 * разбор и показать ученику одну «Section 1» вместо шагов.
 */
function catalogFileKey(url) {
  const raw = normalize(url)
  if (!raw) return { path: '', mode: '' }
  try {
    const parsed = new URL(raw, 'https://jts.invalid')
    return { path: parsed.pathname, mode: parsed.searchParams.get('mode') || '' }
  } catch {
    const [path, query = ''] = raw.split('?')
    const mode = String(query)
      .split('&')
      .map((part) => part.split('='))
      .find(([key]) => key === 'mode')?.[1] || ''
    return { path, mode: decodeURIComponent(mode) }
  }
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

  const want = catalogFileKey(target)
  if (!want.path) return null

  const sameFile = lessons.filter((l) => catalogFileKey(l.fileUrl).path === want.path)
  if (!sameFile.length) return null

  if (want.mode) {
    const byMode = sameFile.find((l) => catalogFileKey(l.fileUrl).mode === want.mode)
    if (byMode) return byMode.id
  }

  // Уровень, залитый до появления режимов, ссылается на файл без ?mode=.
  return sameFile[0].id
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
