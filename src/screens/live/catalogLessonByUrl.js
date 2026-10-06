import { getCourseCatalog, getLevelTestByFile } from '../../api.js'

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

/**
 * Искать ли материал в каталоге, чтобы открыть его шагами.
 *
 * Раньше решал движок занятия: FILE сразу шёл во фрейм. Преподаватель с 23.09
 * ищет разбор всегда — на FILE по умолчанию ставят обычный урок каталога, и
 * без разбора ученик видел сырой файл и одну «Section 1», а преподаватель —
 * темы. Стороны обязаны открывать одно и то же. Нашёлся урок или нет, решает
 * {@link catalogLessonIdFor}; standalone в каталоге не ищем никогда.
 */
export function shouldResolveCatalogLesson(url, _lesson) {
  return Boolean(url) && !isStandaloneLessonUrl(url)
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
 * Индекс урока каталога (L05 → 5) — тот же разбор, что у бэкенда
 * (`LessonSectionService.parseCatalogLessonIndex`). Нужен, когда один HTML
 * держит весь уровень: без номера рамка открывает последний урок из
 * самоподготовки («сегодняшний») вместо того, что вели 21-го.
 */
export function matchesCatalogLessonIndex(lesson, focusLessonNo) {
  const n = Number(focusLessonNo)
  if (!Number.isInteger(n) || n < 1) return false
  const re = new RegExp(`(?:^|[/._-]|\\b)L0*${n}(?:\\b|\\.|$)`, 'i')
  return re.test(String(lesson?.code || '')) || re.test(String(lesson?.fileUrl || ''))
}

function pickByFocus(list, focusLessonNo) {
  if (focusLessonNo == null || !list.length) return null
  return list.find((l) => matchesCatalogLessonIndex(l, focusLessonNo)) || null
}

/**
 * id урока каталога по ссылке на его файл, или null — если такого урока в
 * каталоге нет (материал загружен преподавателем сам, а не выбран из каталога).
 *
 * @param {number|null|undefined} focusLessonNo указка занятия (L05 → 5). Когда
 *   один файл — весь уровень, без неё берётся первый совпавший урок.
 */
export function findCatalogLessonId(levels, fileUrl, focusLessonNo) {
  const target = normalize(fileUrl)
  if (!target) return null

  const lessons = flatten(levels)
  const exact = lessons.find((l) => normalize(l.fileUrl) === target)

  const want = catalogFileKey(target)
  const sameFile = want.path
    ? lessons.filter((l) => catalogFileKey(l.fileUrl).path === want.path)
    : []

  // Общий файл уровня: номер занятия важнее «первого совпадения по пути».
  if (sameFile.length > 1) {
    const pool = want.mode
      ? sameFile.filter((l) => catalogFileKey(l.fileUrl).mode === want.mode)
      : sameFile
    const focused = pickByFocus(pool.length ? pool : sameFile, focusLessonNo)
    if (focused) return focused.id
  }

  if (exact) return exact.id
  if (!sameFile.length) return null

  if (want.mode) {
    const byMode = sameFile.find((l) => catalogFileKey(l.fileUrl).mode === want.mode)
    if (byMode) return byMode.id
  }

  // Уровень, залитый до появления режимов, ссылается на файл без ?mode=.
  return sameFile[0].id
}

/**
 * Тест на определение уровня — урок каталога в своей папке (`course-catalog/exams/`).
 * В дерево ученика он не входит, поэтому урок за файлом ищется отдельно.
 */
export function isLevelTestUrl(url) {
  return /\/course-catalog\/exams\//i.test(String(url || ''))
}

/** То же, но с походом за каталогом. Каталог кэшируется на уровне api.js. */
export async function catalogLessonIdFor(fileUrl, token, focusLessonNo) {
  if (!fileUrl || !token) return null
  let found = null
  try {
    const levels = await getCourseCatalog(token)
    found = findCatalogLessonId(levels, fileUrl, focusLessonNo)
  } catch {
    found = null
  }
  if (found != null || !isLevelTestUrl(fileUrl)) return found
  // Тест дают только преподаватель: сервер отдаёт урок тому, кому его задали или
  // показали на занятии, — тогда ученик проходит его карточками, как тест курса.
  // Не дан или старая версия файла — 404, и тест открывается файлом, как раньше.
  try {
    const lesson = await getLevelTestByFile(fileUrl, token)
    return lesson?.id ?? null
  } catch {
    return null
  }
}
