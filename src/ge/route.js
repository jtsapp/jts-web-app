// Маршрут General English до цели: сколько уроков осталось, за сколько недель их закроет каждый формат и успевает ли
// он к сроку. Формула — ТЗ «Roadmap» (src/lib/roadmap.js: силлабус, K_eff формата, ускорение за домашку, буфер
// повторения); дизайн — docs/superpowers/specs/2026-10-12-ge-onboarding-roadmap-design.md, секция 2.
//
// Модуль чистый: «сегодня» приходит аргументом, иначе «успеваете / нет» нечем накрыть тестом.

import { SYLLABUS_LESSONS, estimateWeeks } from '../lib/roadmap.js'
import { pluralForm } from '../lib/plural.js'

// Вся лестница ученика: C2 бывает в профиле (тест, менеджер), но целью не бывает — курса после C1 нет.
export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
// Плитки цели — A0…C1 (решение владельца 12.10.2026).
export const TILE_LEVELS = LEVELS.slice(0, 6)
export const TOP_TARGET = 'C1'

export const ROUTES = ['self_study', 'group', 'individual']
// Формат карточки → формат калькулятора. Индивидуально — по 60 минут: так обещает карточка.
const FORMAT = { self_study: 'self_study', group: 'group', individual: 'individual_60' }
// Допущение спеки: и группа, и индивидуальные — 2 занятия в неделю.
export const SESSIONS_PER_WEEK = { group: 2, individual: 2 }

export const WEEKS_PER_MONTH = 4.345
// До полутора лет срок пишем месяцами, дальше — годами: «≈ 34 месяца» не читается.
export const LONG_MONTHS = 18
// «С запасом» — срок закрывается хотя бы за три недели до даты (как у IELTS).
export const SPARE_DAYS = 21
const WINDOW_MONTHS = { '1-3m': 3, '3-6m': 6, '6-12m': 12 }

export const rankOf = (level) => LEVELS.indexOf(String(level || '').toUpperCase())

/** Можно ли выбрать цель: уровень неизвестен или ниже C1. */
export const canSetGoal = (level) => level == null || (rankOf(level) >= 0 && rankOf(level) < rankOf(TOP_TARGET))

const pad = (n) => String(n).padStart(2, '0')
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Дни от сегодня до даты 'YYYY-MM-DD' (отрицательные — дата прошла). */
export function daysUntil(isoDate, today = new Date()) {
  if (!isoDate) return null
  return Math.round((new Date(`${isoDate}T00:00:00`) - dayStart(today)) / 86400000)
}

/** Окно срока в дату: сегодня + верхняя граница окна. У 'date' и 'none' — null. Бэкенд считает так же. */
export function windowDate(window, today = new Date()) {
  const months = WINDOW_MONTHS[window]
  if (!months) return null
  return isoDay(new Date(today.getFullYear(), today.getMonth() + months, today.getDate()))
}

/**
 * Сколько уроков осталось до цели: курсы силлабуса от текущего уровня до цели минус пройденная доля курса текущего.
 * percent — процент сервера (/mobile/level-progress) по текущему уровню; не пришёл — считаем от нуля.
 */
export function remainingLessons(level, target, percent = 0) {
  const from = rankOf(level)
  const to = rankOf(target)
  if (from < 0 || to <= from) return 0
  let sum = 0
  for (let i = from; i < to; i += 1) sum += SYLLABUS_LESSONS[LEVELS[i]] || 0
  const share = Math.min(100, Math.max(0, Number(percent) || 0)) / 100
  return Math.max(0, sum - Math.round(share * (SYLLABUS_LESSONS[LEVELS[from]] || 0)))
}

/** Срок формата: недели калькулятора и месяцы с шагом в полмесяца. */
export function termFor(route, lessons, dailyMinutes) {
  if (!lessons || lessons <= 0) return { weeks: 0, months: 0 }
  const { weeks } = estimateWeeks({
    totalLessons: lessons,
    learningFormat: FORMAT[route],
    sessionsPerWeek: SESSIONS_PER_WEEK[route] || 0,
    homeworkMinutesPerDay: dailyMinutes || 30,
  })
  return { weeks, months: Math.max(0.5, Math.round((weeks / WEEKS_PER_MONTH) * 2) / 2) }
}

/** Как писать срок: до полутора лет — месяцами, дальше — годами с шагом в полгода. */
export function termUnits(term) {
  if (term.months <= LONG_MONTHS) return { unit: 'months', n: term.months }
  return { unit: 'years', n: Math.round((term.months / 12) * 2) / 2 }
}

/** «≈ 7 месяцев» / «≈ 4,5 месяца» / «≈ 3 года»: у дробного числа форма «нескольких», как у IELTS. */
export function formatTerm(units, t, lang = 'ru') {
  const form = units.n % 1 !== 0 ? 'few' : pluralForm(units.n, lang)
  return t(`geTerm.${units.unit}.${form}`, { n: String(units.n).replace('.', lang === 'en' ? '.' : ',') })
}

/** Успевает ли срок к дате: 'spare' | 'fits' | 'late' | null (даты нет). */
export function fitsDeadline(term, deadlineIso, today = new Date()) {
  const days = daysUntil(deadlineIso, today)
  if (days == null) return null
  const need = term.weeks * 7
  if (need > days) return 'late'
  return days - need >= SPARE_DAYS ? 'spare' : 'fits'
}

/** Три карточки экрана маршрута. deadlineIso — profile.deadline.date (окно бэкенд уже перевёл в дату). */
export function routeOptions({ targetLevel, dailyMinutes, deadlineIso }, { level, percent }, today = new Date()) {
  const lessons = remainingLessons(level, targetLevel, percent)
  return ROUTES.map((id) => {
    const term = termFor(id, lessons, dailyMinutes)
    return { id, lessons, term, units: termUnits(term), fit: fitsDeadline(term, deadlineIso, today) }
  })
}

const OK = new Set(['fits', 'spare'])

/** Рекомендация (спека, секция 2): по сроку — самый дешёвый успевающий формат; без срока — по цели и разрыву. */
export function recommendRoute(options, { purpose, level, targetLevel }) {
  const by = Object.fromEntries(options.map((o) => [o.id, o]))
  const hasDeadline = options.some((o) => o.fit != null)
  if (hasDeadline && !OK.has(by.self_study?.fit)) {
    if (OK.has(by.group?.fit)) return { route: 'group', late: false }
    if (OK.has(by.individual?.fit)) return { route: 'individual', late: false }
    return { route: 'individual', late: true }
  }
  const gap = rankOf(targetLevel) - rankOf(level)
  if ((purpose === 'work' || purpose === 'study') && gap >= 2) return { route: 'group', late: false }
  return { route: 'self_study', late: false }
}

/** Формат, в котором ученик уже занимается: по последнему занятию расписания, кроме пробного. Пара — не один на один. */
export function currentFormat(occurrences) {
  const list = (Array.isArray(occurrences) ? occurrences : []).filter((o) => o?.lessonType && o.lessonType !== 'TRIAL')
  if (!list.length) return null
  const last = [...list].sort((a, b) => String(b.scheduledAt).localeCompare(String(a.scheduledAt)))[0]
  return String(last.lessonType).startsWith('INDIVIDUAL') ? 'individual' : 'group'
}
