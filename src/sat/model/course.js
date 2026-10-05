// Курс «36 юнитов» SAT (фаза 8): каркас из src/sat/data/course.json (его пишет scripts/sat/build-course.js из
// выгрузки прототипа) и правила показа — порядок, месяцы, соседи, состояние юнита. Чистые функции под тестами.
import COURSE from '../data/course.json'

export { COURSE }

export function lessonByCode(code, course = COURSE) {
  return course.lessons.find((l) => l.code === code) || null
}

export function unitOf(lesson, course = COURSE) {
  return lesson ? course.units.find((u) => u.id === lesson.unit) || null : null
}

/** Секция юнита — секция его домена; Challenge — обе (both). */
export function sectionOf(lesson, course = COURSE) {
  return unitOf(lesson, course)?.section || 'both'
}

/** Юниты в порядке курса (номер на расписании «три в неделю»). */
export function ordered(course = COURSE) {
  return course.lessons.slice().sort((a, b) => a.n - b.n)
}

/** Предыдущий и следующий юнит курса — навигация внизу страницы юнита. */
export function neighbours(code, course = COURSE) {
  const all = ordered(course)
  const i = all.findIndex((l) => l.code === code)
  return { prev: i > 0 ? all[i - 1] : null, next: i >= 0 && i < all.length - 1 ? all[i + 1] : null }
}

export function phaseOf(n, course = COURSE) {
  return course.phases.find((p) => n >= p.from && n <= p.to) || null
}

/**
 * Юнит пройден: набор практики сдан (сервер) или, у юнита без набора, урок дочитан до последней части (устройство).
 * Challenge без набора и без урока — пройден только сданным набором, когда он появится.
 * progress — units из GET /mobile/sat/course; read — коды юнитов, дочитанных до конца.
 */
export function isDone(lesson, progress = {}, read = new Set(), course = COURSE) {
  const p = progress[lesson.code]
  if (p?.finished) return true
  const hasSet = (p?.questions || 0) > 0
  return !hasSet && !!course.teach[lesson.code] && read.has(lesson.code)
}

/** done | current | ahead для каждого юнита: текущий — первый непройденный по порядку курса. */
export function states(progress = {}, read = new Set(), course = COURSE) {
  const out = {}
  let current = null
  for (const l of ordered(course)) {
    const done = isDone(l, progress, read, course)
    if (!done && !current) current = l.code
    out[l.code] = done ? 'done' : 'ahead'
  }
  if (current) out[current] = 'current'
  return out
}

/**
 * Месяцы курса для «Материалов»: юниты месяца по порядку (с фильтром секции: Challenge показывается при любом —
 * он про обе секции) и официальный тест Bluebook, который месяц закрывает.
 */
export function months(section = 'all', course = COURSE) {
  return course.phases.map((ph) => ({
    phase: ph,
    lessons: ordered(course).filter((l) => l.n >= ph.from && l.n <= ph.to && (section === 'all' || [section, 'both'].includes(sectionOf(l, course)))),
    test: course.officialTests.find((x) => x.after === ph.id) || null,
  }))
}

/** Диагностический тест перед юнитом 1 (Bluebook Practice Test 6). */
export function testBefore(course = COURSE) {
  return course.officialTests.find((x) => x.after == null) || null
}

/** Часть урока, на которой остановились: число в пределах [0, parts − 1]. */
export function clampPart(v, parts) {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n) || parts <= 0) return 0
  return Math.max(0, Math.min(parts - 1, n))
}

/** «Part 2 · The four-step method» → «The four-step method»: номер части и так стоит в шаге. */
export function partTitle(title) {
  return String(title || '').replace(/^Part \d+\s*·\s*/, '')
}

/** Подставить номер юнита в домашку («Word list #N» → «Word list #7»). */
export function withN(text, n) {
  return String(text || '').replace(/#N\b/g, `#${n}`)
}
