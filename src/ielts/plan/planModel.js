// План IELTS на экране (backend docs/ielts/PROGRAMMES.md): задачи приходят кодом программы прототипа (вид + подвид —
// type/tfng, t2/opinion, vocab/education), здесь им даются подписи, «куда ведёт Начать» и группировка по неделям и
// дням. Статусы и выполнение считает бэкенд — экран их только показывает.

import { typeLabel } from '../reading/meta.js'
import { parseMockKey } from '../writing/mockByType.js'

// Вид задачи → ключ подписи (ieltsPlan.item.<ключ>) и место в разделе. Подвид в подпись идёт как есть: это имя
// типа вопроса / жанра эссе / набора слов, и оно английское во всех языках (язык экзамена).
const ROUTES = {
  type: { tab: 'learn', view: 'types' },
  demo: { tab: 'learn', view: 'types' },
  mini: { tab: 'learn', view: 'types' },
  weak: { tab: 'learn', view: 'types' },
  drill: { tab: 'learn', view: 'drills' },
  pm: { tab: 'learn', view: 'texts' },
  // «полный Reading ×n» — полные тесты Reading в «Практике», а не полный mock всех четырёх секций
  full: { tab: 'learn', view: 'reading-full' },
  guide: { tab: 'learn', view: 'writing-guide' },
  // «Идеи для эссе» прототипа — короткое упражнение Task 2, а не глава гида: ведёт в короткие тренировки Writing
  ideas: { tab: 'learn', view: 'writing-drills' },
  t1: { tab: 'learn', view: 'writing-task1' },
  t2: { tab: 'learn', view: 'writing-task2' },
  pair: { tab: 'learn', view: 'writing-task2' },
  p1: { tab: 'learn', view: 'speaking-part1' },
  p2: { tab: 'learn', view: 'speaking-part2' },
  run: { tab: 'learn', view: 'speaking-part1' },
  sg: { tab: 'learn', view: 'speaking-guide' },
  sh: { tab: 'learn', view: 'speaking-shadowing' },
  dc: { tab: 'learn', view: 'listening-dictation' },
  spl: { tab: 'learn', view: 'listening-spelling' },
  listen: { tab: 'learn', view: 'listening-tasks' },
  fmt: { tab: 'info' },
  vocab: { screen: 'vocab' },
}

// Задача с подвидом ведёт глубже списка раздела (прототип core-plan.js, path): тип вопроса и дрилл — в выбор заданий
// своего набора, жанр эссе / вид графика / карточка Part 2 — в задания этого вида, гид — в свою главу, shadowing —
// в своё задание. Без этого «Reading · TFNG» открывал страницу всех типов Reading.
const listOf = (key) => ({ tab: 'learn', view: 'practice-list', list: key })
// «на время» (extra.timed, токен программы «t2:opinion:timed») — mock этого типа (writing/mockByType.js): часы, без
// подсказок, задание выбирается при старте. Тип не из трека ученика (график у General Training) — прежний список вида.
const writingOf = (kind, category, task, track) => {
  const key = `${kind}:${category}`
  return task.extra?.timed === true && parseMockKey(key, track) ? { tab: 'learn', view: 'writing-mock', list: key } : listOf(`writing:${key}`)
}
const SUB_ROUTES = {
  type: (sub) => listOf(`reading:types:${sub}`),
  demo: (sub) => listOf(`reading:types:${sub}`),
  mini: (sub) => listOf(`reading:types:${sub}`),
  drill: (sub) => listOf(`reading:drill:${sub}`),
  // Task 1 — по треку: у General Training это письмо (регистр в extra.gt), у Academic — график (sub)
  t1: (sub, task, track) => writingOf('task1', (track === 'general' ? task.extra?.gt : sub) || sub, task, track),
  t2: (sub, task, track) => writingOf('task2', sub, task, track),
  pair: (sub) => listOf(`writing:task2:${sub}`),
  p2: (sub) => listOf(`speaking:part2:${sub}`),
  guide: (sub) => ({ tab: 'learn', view: 'writing-guide', section: sub }),
  sg: (sub) => ({ tab: 'learn', view: 'speaking-guide', section: sub }),
  sh: (sub) => ({ tab: 'learn', view: 'speaking-shadowing', testId: sub }),
}

/** Куда ведёт «Начать»: вкладка и список раздела, экран словаря или пробные тесты для контроля. */
// Задача преподавателя с выбранным заданием банка ведёт прямо в него: вид списка — по навыку и виду задания
const TEACHER_VIEW = {
  reading: (kind) => (kind === 'test' ? 'reading-full' : kind === 'types' ? 'types' : kind === 'drill' ? 'drills' : 'texts'),
  listening: (kind) => (kind === 'dictation' ? 'listening-dictation' : kind === 'spelling' ? 'listening-spelling' : 'listening-tasks'),
  writing: (kind) => (kind === 'task1' ? 'writing-task1' : kind === 'drill' ? 'writing-drills' : 'writing-task2'),
  speaking: (kind) => (kind === 'part2' || kind === 'part3' ? `speaking-${kind}` : 'speaking-part1'),
}

/**
 * Кто поставил задачу: homework — домашнее задание преподавателя (со сроком), teacher — задача преподавателя без срока
 * ДЗ, null — задача программы. Отличаются цветом во всех видах плана (тон 'homework' / 'teacher' в CSS).
 */
export function taskOrigin(task) {
  if (task?.origin !== 'teacher') return null
  return task.mode === 'homework' ? 'homework' : 'teacher'
}

/** Подпись происхождения: «Домашнее задание · 12 окт» или «Добавлено преподавателем». */
export function originLabel(t, task, fmtDate) {
  const o = taskOrigin(task)
  if (!o) return null
  if (o === 'homework') return t('ieltsPlan.origin.homework', { date: fmtDate(task.extra?.dueDate || task.date) })
  return t('ieltsPlan.origin.teacher')
}

// Советы бэкенда, когда открытых задач плана нет (IeltsPlanFallback): mock и полные тесты — всегда есть что делать
const RECOMMEND_ROUTE = {
  mock: { tab: 'mocks' },
  'reading-full': { tab: 'learn', view: 'reading-full' },
  'listening-full': { tab: 'learn', view: 'listening-full' },
  'writing-task2': { tab: 'learn', view: 'writing-task2' },
  'speaking-part2': { tab: 'learn', view: 'speaking-part2' },
}

/** Совет «что сделать дальше» как задача для startPlanTask: ведёт туда же, куда его ключ. */
export function recommendTask(r) {
  return { ...r, recommend: true }
}

/** track — трек ученика (academic | general): от него зависит, куда ведёт Task 1. */
export function taskRoute(task, track) {
  if (task.recommend) return RECOMMEND_ROUTE[task.key] || { tab: 'learn' }
  if (task.origin === 'teacher') {
    const ex = task.extra || {}
    // полный пробный экзамен — сразу его экран (описание и старт), набор слов — «Словарь»
    if (task.sec === 'mock' && ex.testId) return { screen: 'ielts-mock', payload: { mockId: ex.testId } }
    const view = ex.testId && TEACHER_VIEW[task.sec]?.(ex.testKind)
    if (view) return { tab: 'learn', view, testId: ex.testId }
    if (task.sec === 'vocab') return { screen: 'vocab' }
    return ROUTES[task.kind] || { tab: 'learn' }
  }
  if (task.origin === 'weekly_control' || task.kind === 'checkpoint') {
    // контроль недели без утверждённого состава — любая проверочная работа: текст на время; точки программы — пробники
    return task.control === 'weekly' ? { tab: 'learn', view: 'texts' } : task.control === 'writing' ? { tab: 'learn', view: 'writing-task2' }
      : task.control === 'speaking' ? { tab: 'learn', view: 'speaking-part2' } : { tab: 'mocks' }
  }
  if (task.sub && SUB_ROUTES[task.kind]) return SUB_ROUTES[task.kind](String(task.sub), task, track)
  return ROUTES[task.kind] || { tab: 'learn' }
}

const SEC_KEY = { reading: 'Reading', writing: 'Writing', speaking: 'Speaking', listening: 'Listening', mock: 'Mock' }

// Подвиды программы — коды прототипа (t1ac.map, t2Lex.hedging, ng, awl-3). В карточках недели они стояли как есть,
// и студент читал «гид: t1ac.map». Здесь — их имена; английские, как и названия типов: так они звучат на экзамене.
const GENRE = { opinion: 'Opinion', discussion: 'Discussion', problem_solution: 'Problem–solution', adv_disadv: 'Advantages & disadvantages', two_part: 'Two-part question' }
const CHART = { map: 'Map', multi: 'Mixed charts', process: 'Process', bar: 'Bar chart', line: 'Line graph', pie: 'Pie chart', table: 'Table' }
const LETTER = { formal: 'Formal letter', semi_formal: 'Semi-formal letter', informal: 'Informal letter' }
const GUIDE_PART = { t1ac: 'Task 1 Academic', t1gt: 'Task 1 GT', t2: 'Task 2', t2Lex: 'Task 2 language', linking: 'Linking' }

function words(code) {
  const s = String(code).replace(/[_-]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

/**
 * Имя подвида задачи плана для подписи; неизвестный код — словами, без подчёркиваний. track — трек ученика: Task 1
 * у General Training — письмо (регистр в extra.gt), а не график из sub (прототип core-plan.js, label).
 */
export function subLabel(t, task, track) {
  const sub = task?.sub
  if (sub == null || sub === '') return ''
  const s = String(sub)
  const gt = track === 'general'
  const ex = task.extra || {}
  switch (task.kind) {
    case 'type': case 'demo': case 'mini': case 'weak': case 'listen':
      return typeLabel(s)
    case 'drill': {
      const key = `ieltsReading.drill.${s}.name`
      const name = t(key)
      return name && name !== key ? name : words(s)
    }
    case 't2':
      return GENRE[s] || words(s)
    case 'pair': {
      // эссе + Task 1 своего трека: «Opinion · Bar chart» или «Opinion · Formal letter»
      const t1 = gt ? ex.gt : ex.ac
      return [GENRE[s] || words(s), t1 ? CHART[t1] || LETTER[t1] || words(t1) : ''].filter(Boolean).join(' · ')
    }
    case 't1':
      if (gt && ex.gt) return LETTER[ex.gt] || words(ex.gt)
      return s.split('/').map((x) => CHART[x] || LETTER[x] || words(x)).join(' · ')
    case 'guide': {
      const [part, topic] = s.split('.')
      const name = GENRE[topic] || CHART[topic] || LETTER[topic] || words(topic || '')
      return [GUIDE_PART[part] || words(part), name].filter(Boolean).join(' · ')
    }
    case 'vocab':
      return /^awl-\d+$/i.test(s) ? `AWL ${s.slice(4)}` : words(s)
    default:
      return words(s)
  }
}

/** Подпись задачи: «Reading · tfng ×2», «Writing · эссе: opinion», «Контроль недели». track — трек ученика. */
export function taskLabel(t, task, track) {
  if (task.origin === 'weekly_control' || task.kind === 'checkpoint') return t(`ieltsPlan.control.${task.control || 'weekly'}`)
  // задача преподавателя — его формулировкой: «Reading · Test 3 на время», «Выучить слова темы Work»
  if (task.origin === 'teacher') {
    const title = task.extra?.title || t('ieltsPlan.origin.teacher')
    const secName = task.sec === 'vocab' ? t('ieltsPlan.sec.vocab') : SEC_KEY[task.sec]
    return secName ? `${secName} · ${title}` : title
  }
  const sub = subLabel(t, task, track)
  // у General Training текст на время — секция (прототип pr.item.pmGt)
  const key = task.kind === 'pm' && track === 'general' ? 'pmGt' : task.kind
  const body = t(`ieltsPlan.item.${key}`, { sub, n: String(task.n) })
  const sec = task.sec === 'vocab' ? t('ieltsPlan.sec.vocab') : SEC_KEY[task.sec] || task.sec
  return `${sec} · ${body}`
}

/** Задачи по неделям плана (7 дней от старта), в порядке дат; контроль недели — отдельным полем недели. */
export function groupWeeks(tasks) {
  const map = new Map()
  for (const task of tasks || []) {
    const w = map.get(task.calendarWeek) || { n: task.calendarWeek, from: task.date, to: task.date, tasks: [], control: null, done: 0, total: 0 }
    if (task.origin === 'weekly_control') w.control = task
    else {
      w.tasks.push(task)
      w.total++
      if (task.status === 'completed') w.done++
    }
    if (task.date < w.from) w.from = task.date
    if (task.date > w.to) w.to = task.date
    map.set(task.calendarWeek, w)
  }
  return [...map.values()].sort((a, b) => a.n - b.n)
}

/** Задачи по датам 'YYYY-MM-DD'. */
export function byDate(tasks) {
  const map = {}
  for (const task of tasks || []) (map[task.date] = map[task.date] || []).push(task)
  return map
}

// Даты плана — календарные 'YYYY-MM-DD' без времени: считаем в UTC, иначе переход на летнее время сдвигал бы день
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Сетка месяца: 6 недель с понедельника, дни чужого месяца помечены. */
export function monthGrid(iso) {
  const first = `${iso.slice(0, 7)}-01`
  const dow = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const start = addDays(first, -dow)
  const month = iso.slice(0, 7)
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i)
    return { date, inMonth: date.slice(0, 7) === month }
  })
}

export function shiftMonth(iso, n) {
  const [y, m] = iso.slice(0, 7).split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 10)
}

/** Тон чипа статуса — общий Chip раздела. */
export function statusTone(status, overdue) {
  if (status === 'completed') return 'green'
  if (overdue || status === 'missed') return 'orange'
  if (status === 'available' || status === 'in_progress') return 'violet'
  return 'muted'
}

// ---- дизайн «IELTS new» (раздел 2 «План»): дни недели плана и их состояния ----

/** Состояние дня по его задачам: done / current (сегодня) / started / missed (прошёл, не всё сделано) / planned. */
export function dayStatus(tasks, date, today) {
  const work = (tasks || []).filter((x) => x.origin !== 'weekly_control')
  if (!work.length) return 'rest'
  const done = work.filter((x) => x.status === 'completed').length
  if (done === work.length) return 'done'
  if (date === today) return 'current'
  if (date < today) return 'missed'
  if (done > 0 || work.some((x) => x.status === 'in_progress')) return 'started'
  return 'planned'
}

/**
 * Неделя плана для роадмапа: учебные дни (даты с заданиями, по порядку — «День 1…N») и контроль недели.
 * Неделя плана — семь дней от старта программы (бэкенд, IeltsPlanBuilder), а не календарная пн–вс.
 */
export function planWeek(tasks, n, today) {
  const mine = (tasks || []).filter((x) => x.calendarWeek === n)
  const control = mine.find((x) => x.origin === 'weekly_control') || null
  const dates = [...new Set(mine.filter((x) => x.origin !== 'weekly_control').map((x) => x.date))].sort()
  const days = dates.map((date, i) => {
    const list = mine.filter((x) => x.date === date)
    return { n: i + 1, date, tasks: list, status: dayStatus(list, date, today) }
  })
  const programmeWeek = mine.length ? Math.min(...mine.map((x) => x.programmeWeek)) : null
  const allDone = days.length > 0 && days.every((d) => d.status === 'done') && (!control || control.status === 'completed')
  return { n, days, control, programmeWeek, done: allDone }
}

/** Минуты дня — подпись «2 задания · около 45 мин»; выполненное не считается. */
export function dayMinutes(tasks) {
  return Math.round((tasks || []).filter((x) => x.status !== 'completed').reduce((s, x) => s + (x.minutes || 0), 0) / 5) * 5
}

/** Задачи недели по семи датам от её первого дня (у недели плана старт — дата старта программы + 7 × (n − 1)). */
export function weekDates(startDate, n) {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, (n - 1) * 7 + i))
}
