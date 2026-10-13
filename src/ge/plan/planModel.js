// План по дням общего курса на экране (бэкенд /mobile/ge/plan, спека
// docs/superpowers/specs/2026-10-13-ge-plan-days-design.md, секция 4). Задачи приходят видом (course | practice | live |
// homework) и разделом практики; здесь им даются подписи, значок, «куда ведёт Начать» и раскладка по дням, неделям и
// месяцам. Статусы и выполнение считает бэкенд — экран их только показывает.
//
// Виды — по образцу IELTS (src/ielts/plan/planModel.js), но кодом своего раздела: IELTS не трогаем (решение владельца
// 12.10.2026). Недели здесь календарные пн–вс — учебные дни пн–пт, а не «семь дней от старта программы», как у IELTS.
//
// Часть 3 (спека 2026-10-13-ge-teacher-plan): в плане бывают задачи преподавателя (origin = teacher) — урок курса,
// практика, материал Практики (kind unit) и своё задание (kind custom). Подписи у них свои, из extra.

import { practiceNavTarget } from '../../lib/practiceTarget.js'

export const MODULES = ['ai_tutor', 'workbooks', 'shadowing', 'media_practice', 'vocabulary_sr']

// Раздел практики → экран. Шэдоуинг — секция Практики, медиа — вкладка «Чтение» (книги, тексты, комиксы). Воркбук без
// уровня в payload открывается на A0 (WorkbookPage), поэтому уровень ученика ему передаётся всегда.
const MODULE_ROUTE = {
  ai_tutor: { to: 'tutor' },
  shadowing: { to: 'practice', payload: { filter: 'shadowing' } },
  media_practice: { to: 'practice', payload: { skill: 'reading' } },
  vocabulary_sr: { to: 'vocab' },
}

/** Задача преподавателя (бэкенд V330, origin = teacher): синяя метка и комментарий; день выбрал он, ученик её не переносит. */
export function isTeacherTask(task) {
  return task?.origin === 'teacher'
}

/**
 * Куда ведёт «Начать»: ключ handleNav App и его payload; null — переходить некуда. Урок курса — в тропу уровня, который
 * ученик проходит.
 */
export function taskRoute(task, level) {
  switch (task?.kind) {
    case 'course':
      // урок, заданный преподавателем, — в тропу его уровня: ученик мог уже перейти на следующий
      return { to: 'course', payload: { level: (isTeacherTask(task) && task.extra?.level) || level || null } }
    case 'live':
      return { to: 'lessons' }
    case 'homework':
      return { to: 'homework' }
    case 'unit': {
      // адрес юнита — тот же, каким его выдают в домашке, и разбирает его тот же practiceNavTarget: неизвестный адрес не
      // превращается в переход (экран раздела молча открыл бы чужой юнит)
      const x = task.extra || {}
      const target = practiceNavTarget({
        practiceArea: x.area,
        practiceLevel: x.level,
        practiceUnitId: x.unitId ?? null,
        practiceUnitKey: x.unitKey ?? null,
      })
      return target ? { to: target.key, payload: target.payload } : null
    }
    case 'custom':
      return null
    default:
      if (task?.module === 'workbooks') return { to: 'workbook', payload: level ? { level: String(level).toLowerCase() } : null }
      return MODULE_ROUTE[task?.module] || { to: 'practice' }
  }
}

/**
 * Что делает кнопка задачи: переход ({ type: 'nav', to, payload }), отметка своего задания преподавателя ({ type: 'done' })
 * или ничего (null — кнопки нет). У выполненной задачи кнопки нет.
 */
export function taskAction(task, level) {
  if (!task || task.status === 'completed') return null
  if (task.kind === 'custom') return isTeacherTask(task) ? { type: 'done' } : null
  const r = taskRoute(task, level)
  return r ? { type: 'nav', ...r } : null
}

/** Ключ значка и цвета: раздел практики или вид задачи. */
export function plateOf(task) {
  if (task?.kind === 'practice') return MODULES.includes(task.module) ? task.module : 'media_practice'
  return task?.kind || 'course'
}

/** Подпись задачи. courseTitle — название шага тропы для урока курса (см. courseTitles). */
export function taskTitle(t, task, courseTitle) {
  if (isTeacherTask(task)) {
    const x = task.extra || {}
    if (x.title) return x.title
    if (task.kind === 'course') return x.lessonTitle ? t('gePlan.course.named', { title: x.lessonTitle }) : t('gePlan.course')
    if (task.kind === 'unit') return x.unitTitle || t('gePlan.unit')
  }
  switch (task?.kind) {
    case 'course':
      return courseTitle ? t('gePlan.course.named', { title: courseTitle }) : t('gePlan.course')
    case 'live':
      return t('gePlan.live')
    case 'homework':
      return task.title || t('gePlan.homework')
    default:
      return t(`gePlan.module.${plateOf(task)}`)
  }
}

/** Короткая подпись — для клетки месяца и карточки недели. */
export function taskShort(t, task) {
  return t(`gePlan.short.${plateOf(task)}`)
}

/** Минуты: начатая практика — «6 / 15 мин»; у ДЗ минут нет (их задаёт преподаватель, а не план). */
export function minutesLabel(t, task) {
  if (!task || task.kind === 'homework' || !task.minutes) return ''
  if (task.kind === 'practice' && task.got > 0 && task.status !== 'completed') {
    return t('gePlan.minOf', { got: String(task.got), n: String(task.minutes) })
  }
  return t('gePlan.min', { n: String(task.minutes) })
}

const byDateThenId = (a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.id).localeCompare(String(b.id), 'en', { numeric: true })

/**
 * Подписи уроков курса по тропе: k-я открытая задача курса ↔ k-й непройденный шаг тропы (урок или тест юнита). Номера
 * урока у задачи нет намеренно (бэкенд: «следующий шаг»), поэтому ушедший вперёд ученик не видит в плане уже пройденный
 * урок. Выполненные задачи подписи по тропе не получают — их шаг уже позади.
 * @returns {Record<string, string>} id задачи → название шага
 */
export function courseTitles(tasks, frontier) {
  const out = {}
  if (!Array.isArray(frontier) || !frontier.length) return out
  let k = 0
  // урок преподавателя — конкретный урок со своей подписью, а не «следующий шаг тропы»: его в счёт не берём
  for (const task of (tasks || []).filter((x) => x.kind === 'course' && !isTeacherTask(x)).sort(byDateThenId)) {
    if (task.status === 'completed') continue
    const node = frontier[k++]
    if (!node) break
    out[task.id] = node.title
  }
  return out
}

// ---- даты: календарные 'YYYY-MM-DD' без времени, считаем в UTC — переход на летнее время не сдвигает день ----

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function mondayOf(iso) {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(iso, -dow)
}

export function weekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Номер недели плана: неделя старта — первая. */
export function weekNumber(monday, planStart) {
  if (!planStart) return 1
  const days = (new Date(`${monday}T00:00:00Z`) - new Date(`${mondayOf(planStart)}T00:00:00Z`)) / 86400000
  return Math.max(1, Math.floor(days / 7) + 1)
}

/** Сетка месяца: 6 недель с понедельника, дни чужого месяца помечены. */
export function monthGrid(iso) {
  const first = `${iso.slice(0, 7)}-01`
  const start = mondayOf(first)
  const month = iso.slice(0, 7)
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i)
    return { date, inMonth: date.slice(0, 7) === month }
  })
}

export function shiftMonth(iso, n) {
  const [y, m] = iso.slice(0, 7).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10)
}

/** Задачи по датам 'YYYY-MM-DD'. */
export function byDate(tasks) {
  const map = {}
  for (const task of tasks || []) (map[task.date] = map[task.date] || []).push(task)
  return map
}

/** Состояние дня: rest (задач нет) / done / current (сегодня) / missed (прошёл, не всё) / started / planned. */
export function dayStatus(tasks, date, today) {
  const list = tasks || []
  if (!list.length) return 'rest'
  const done = list.filter((x) => x.status === 'completed').length
  if (done === list.length) return 'done'
  if (date === today) return 'current'
  if (date < today) return 'missed'
  if (done > 0 || list.some((x) => x.status === 'in_progress')) return 'started'
  return 'planned'
}

/** Минуты дня без выполненного, шагом 5 — подпись «2 задачи · около 45 мин». */
export function dayMinutes(tasks) {
  const sum = (tasks || []).filter((x) => x.status !== 'completed' && x.kind !== 'homework').reduce((s, x) => s + (x.minutes || 0), 0)
  return Math.round(sum / 5) * 5
}

/** Неделя для роадмапа: учебные дни с задачами по порядку («День 1…N») и «неделя сделана». */
export function roadWeek(tasks, monday, today) {
  const of = byDate(tasks)
  const days = weekDates(monday)
    .filter((d) => (of[d] || []).length)
    .map((date, i) => ({ n: i + 1, date, tasks: of[date], status: dayStatus(of[date], date, today) }))
  return { monday, days, done: days.length > 0 && days.every((d) => d.status === 'done') }
}

/**
 * «Сегодня» на «Главной»: просроченное этой недели (до трёх — после недели отпуска список не должен заваливать экран)
 * и задачи дня. Открытого нет (выходной, всё сделано) — ahead: две ближайшие следующие, чтобы «Сегодня» не врало
 * «пусто» посреди недели.
 */
export function todayView(plan, maxOverdue = 3) {
  const today = plan?.today
  if (!today) return { tasks: [], ahead: [] }
  const monday = mondayOf(today)
  // только по дате: sort стабилен, и порядок бэкенда внутри дня (занятие, ДЗ, урок, практика) сохраняется
  const tasks = [...(plan?.tasks || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const overdue = tasks.filter((x) => x.date < today && x.date >= monday && x.overdue && x.status !== 'completed').slice(0, maxOverdue)
  const list = [...overdue, ...tasks.filter((x) => x.date === today)]
  if (list.some((x) => x.status !== 'completed')) return { tasks: list, ahead: [] }
  return { tasks: list, ahead: tasks.filter((x) => x.date > today && x.status !== 'completed').slice(0, 2) }
}
