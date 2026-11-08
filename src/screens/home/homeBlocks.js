// Правила блоков новой «Главной» (ТЗ v2.0 «Луна-трекер», разделы 5.1 и 5.4): что показать в баннере цели, в «Уроках с
// преподавателем» и в «Ближайшем». Модуль чистый — без React и сети: экран отдаёт сюда уже загруженные данные, и
// правила проверяются юнит-тестами (homeBlocks.test.js). Данных нет — функция говорит «нечего показать» (null или
// пустой список), а не придумывает: аудит ТЗ поймал «Расписание: нет уроков» при девяти оставшихся занятиях.

import { learnerFormat } from '../../lib/assistant/format.js'
import { OPEN_STATES, openHomework, withStates } from '../../lib/homeworkList.js'
import { isOwnTask } from '../../ge/plan/ownTasks.js'
import { pickFeaturedOccurrence } from '../schedule/liveNow.js'

/**
 * Какой блок справа: 'teacher' — «Уроки с преподавателем», 'self' / 'demo' — «Ближайшее», null — ещё не ясно.
 * Формат — то же правило, что у меню и Луны (learnerFormat: /cabinet/my-sections и демо-признак): иначе меню прятало бы
 * «Уроки», а «Главная» звала бы на них. Абонемента нет или ответ не пришёл — решают сами данные: есть занятия или
 * домашка — значит, преподаватель есть; иначе «Ближайшее». Пока раздел меню ещё грузится — null: блок не мигает
 * «Ближайшим» у ученика с преподавателем.
 */
export function homeFormat({ demo = false, sections = null, occurrences = [], homework = [] } = {}) {
  const known = learnerFormat({ demo, sections })
  if (known === 'with_teacher') return 'teacher'
  if (known) return known === 'demo' ? 'demo' : 'self'
  if (sections?.status === 'loading') return null
  return (occurrences?.length || homework?.length) ? 'teacher' : 'self'
}

/** Локальная дата 'YYYY-MM-DD' — ключ дня в полосе недели. */
export function dayKeyOf(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/**
 * Полоса недели: семь дней от сегодняшнего, у каждого — занятия этого дня (отменённые не считаем: точка «есть урок»
 * над отменённым звала бы туда, где ничего не будет). Тот же отсчёт, что у прежнего расписания «Главной».
 */
export function weekDays(occurrences, now = new Date()) {
  const byDay = new Map()
  for (const o of occurrences || []) {
    if (!o || o.lessonStatus === 'CANCELLED') continue
    const d = new Date(o.scheduledAt)
    if (Number.isNaN(d.getTime())) continue
    const key = dayKeyOf(d)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(o)
  }
  const out = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const key = dayKeyOf(date)
    out.push({ date, key, today: i === 0, lessons: byDay.get(key) || [] })
  }
  return out
}

/** Следующий урок для карточки: идущий сейчас, иначе ближайший — тем же правилом, что карточка над календарём «Уроков». */
export function nextLesson(occurrences, now = new Date()) {
  return pickFeaturedOccurrence(occurrences, now)
}

// Цвет статуса строки домашки (ТЗ 5.4): просрочено — оранжевый, задано — фиолетовый, на проверке — серый, проверено
// — зелёный. «На доработку» — тоже ждёт ученика, поэтому цветом «задано».
const TONE = { overdue: 'late', assigned: 'todo', needsRevision: 'todo', submitted: 'check', completed: 'ok' }

// Свежее — первым: сданное по submittedAt, проверенное по reviewedAt (поля работы /admin/homework/my); без даты — в конце.
const newestBy = (field) => (a, b) => (Date.parse(b?.[field]) || 0) - (Date.parse(a?.[field]) || 0)

/**
 * «Домашка от преподавателя» — до трёх работ: сначала то, что ждёт ученика (просроченное и ближайший срок первыми —
 * openHomework, то же правило, что у раздела и Луны), потом сданное на проверку, потом проверенное — свежее первым.
 * Закрытые без сдачи и неизвестные статусы сюда не идут — им нечего сказать ученику на «Главной». canOpen — у ждущих
 * ученика: «Открыть».
 */
export function teacherHomework(cards, now = new Date(), max = 3) {
  const states = withStates(cards, now)
  const rows = [
    ...openHomework(cards, now),
    ...states.filter((h) => h.state === 'submitted').sort(newestBy('submittedAt')),
    ...states.filter((h) => h.state === 'completed').sort(newestBy('reviewedAt')),
  ]
  return rows.slice(0, max).map((h) => ({ ...h, tone: TONE[h.state], canOpen: OPEN_STATES.has(h.state) }))
}

/** Задачи плана, которые поставил преподаватель, на сегодня и ещё не сделанные (в «Сегодня» их нет — ТЗ 9.1). */
export function teacherPlanToday(plan) {
  if (!plan || plan.state !== 'ready' || !Array.isArray(plan.tasks) || !plan.today) return 0
  return plan.tasks.filter((x) => x?.origin === 'teacher' && x.date === plan.today && x.status !== 'completed').length
}

/**
 * Где ученик в курсе уровня — «урок N из M» вместо процента (ТЗ 5.1: «Сейчас · 1%» непонятно). N — первый непройденный
 * урок тропы по порядку (уроки идут по очереди — courseLock), M — все уроки уровня; тесты юнитов в счёт не входят.
 * Всё пройдено — allDone. Тропы нет (уровень не на новом курсе, сбой загрузки) — null: баннер оставит прежнюю метку.
 */
export function courseStep(trail, done) {
  const lessons = (trail || []).filter((n) => n?.kind === 'lesson')
  if (!lessons.length) return null
  const passed = done instanceof Set ? done : new Set(done || [])
  const at = lessons.findIndex((n) => !passed.has(n.code))
  if (at < 0) return { n: lessons.length, total: lessons.length, allDone: true }
  return { n: at + 1, total: lessons.length, allDone: false }
}

/**
 * Ближайший тест курса — первый непройденный тест тропы и после какого урока он стоит (порядковый номер урока на
 * тропе). ready — все уроки перед ним пройдены, тест можно проходить сейчас.
 */
export function nextCourseTest(trail, done) {
  const passed = done instanceof Set ? done : new Set(done || [])
  let lessonsBefore = 0
  let allBefore = true
  for (const node of trail || []) {
    if (node?.kind === 'lesson') {
      lessonsBefore++
      if (!passed.has(node.code)) allBefore = false
      continue
    }
    if (node?.kind === 'test' && !passed.has(node.code)) {
      return { node, afterLesson: lessonsBefore, ready: allBefore }
    }
  }
  return null
}

/**
 * Минуты дня по своим задачам плана — для облачка баннера (ТЗ 5.1: «облачко меняется от прогресса дня»). Тот же счёт,
 * что у блока «Сегодня» и профиля Луны: сделанные задачи целиком, начатая практика — набранными минутами.
 * null — плана на сегодня нет.
 */
export function dayProgress(plan) {
  if (!plan || plan.state !== 'ready' || !Array.isArray(plan.tasks) || !plan.today) return null
  const todays = plan.tasks.filter((x) => isOwnTask(x) && x.date === plan.today)
  if (!todays.length) return null
  const min = (x) => Number(x.minutes) || 0
  const total = todays.reduce((s, x) => s + min(x), 0)
  const done = todays.reduce((s, x) => s + (x.status === 'completed' ? min(x) : Math.min(Number(x.got) || 0, min(x))), 0)
  return { done, total, allDone: todays.every((x) => x.status === 'completed') }
}
