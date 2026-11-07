// Строки профиля Луны из данных сайта (этап 1 ТЗ v2.0 «Луна-трекер», 07.11.2026): вся домашка
// со статусами, пакет уроков, токены, план дня General English и цель. Модуль чистый — данные
// собирает studentContext.js, здесь только текст, который увидит модель.
//
// Почему не «свой совет»: на «Главной» план дня уже считает бэкенд (/mobile/ge/plan), и Луна
// с отдельным правилом советовала другое, чем блок «Сегодня» (ТЗ 3: «один источник правды»).
// Домашка — тем же правилом статусов, что раздел (lib/homeworkList.js): Луна видела одну работу
// из трёх (аудит 06.11.2026, вопрос 6) — фильтр «срок ≤ 4 дней, не больше 5».

import { withStates } from '../homeworkList.js'
import { destinationName, destinationOf } from './destinations.js'

const DAY_MS = 24 * 60 * 60 * 1000
const isoDay = (t) => new Date(t).toISOString().slice(0, 10)
const dayOf = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}
const clip = (s, n = 80) => {
  const str = String(s ?? '').trim()
  return str.length > n ? `${str.slice(0, n - 1)}…` : str
}

/** Сколько дней до срока словами: модель сама путала «завтра» и «просрочено» (замер 15.10.2026). */
export function dueWords(iso, now) {
  const due = dayOf(iso)
  if (!due) return ''
  const days = Math.round((Date.parse(due) - Date.parse(isoDay(now))) / DAY_MS)
  if (days < 0) return `просрочено, срок был ${due}`
  if (days === 0) return `до ${due} (сегодня)`
  if (days === 1) return `до ${due} (завтра)`
  return `до ${due} (через ${days} дн.)`
}

const STATE_WORDS = {
  assigned: 'задано',
  overdue: 'просрочено',
  needsRevision: 'на доработку',
  submitted: 'на проверке',
  completed: 'проверено',
  closedNoSubmission: 'закрыто без сдачи',
  done: 'выполнено',
  closed: 'недоступно',
}
const OPEN = new Set(['overdue', 'needsRevision', 'assigned'])
const OPEN_ORDER = { overdue: 0, needsRevision: 1, assigned: 2 }
const MAX_OPEN = 8

// Сколько заданий в работе — для «76 заданий — давай по 15» (ТЗ 7.2а). Счёт — как у «Главной».
function taskCount(h) {
  if (Number.isFinite(h?.exerciseCount)) return h.exerciseCount
  if (h?.exercises == null && h?.materialParts == null) return null
  return (h.exercises?.length ?? 0) + (h.materialParts?.length ?? 0)
}

/**
 * Вся домашка со статусами раздела. cards = null — список не загрузился: так и пишем, чтобы
 * модель не сказала «домашки нет» (ТЗ: «нельзя говорить «всё сделано», если есть просрочка»).
 */
export function homeworkLine(cards, now = Date.now()) {
  if (!Array.isArray(cards)) return 'Домашку загрузить не удалось — не говори, что её нет; предложи открыть «Домашнюю работу».'
  if (!cards.length) return 'Домашка от преподавателя: работ нет.'
  const all = withStates(cards, new Date(now))
  const open = all
    .filter((h) => OPEN.has(h.state))
    .sort((a, b) => OPEN_ORDER[a.state] - OPEN_ORDER[b.state] || (Date.parse(a.dueDate) || Infinity) - (Date.parse(b.dueDate) || Infinity))
  const review = all.filter((h) => h.state === 'submitted').length
  const checked = all.filter((h) => h.state === 'completed' || h.state === 'done').length
  const tail = [review && `на проверке ${review}`, checked && `проверено ${checked}`].filter(Boolean).join(', ')
  if (!open.length) return `Домашка от преподавателя: открытых работ нет${tail ? ` (${tail})` : ''}.`
  const items = open.slice(0, MAX_OPEN).map((h) => {
    const n = taskCount(h)
    const due = h.dueDate ? dueWords(h.dueDate, now) : 'без срока'
    const state = h.state === 'overdue' ? due : `${STATE_WORDS[h.state]}, ${due}`
    return `«${clip(h.title || 'задание')}» — ${state}${n ? `, заданий ${n}` : ''}`
  })
  const more = open.length > MAX_OPEN ? `; и ещё ${open.length - MAX_OPEN}` : ''
  return `Домашка от преподавателя (все работы раздела «Домашняя работа»), открыто ${open.length}: ${items.join('; ')}${more}${tail ? `. Кроме того: ${tail}` : ''}.`
}

/** Пакет уроков с преподавателем (/admin/lessons/summary — то же, что итоги вкладки «Уроки»). */
export function lessonsPackageLine(summary) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null)
  const conducted = num(summary?.conducted)
  const remaining = num(summary?.remaining)
  if (conducted == null && remaining == null) return null
  if (!conducted && !remaining) return null
  const extra = [num(summary.cancelled) && `отменено ${num(summary.cancelled)}`, num(summary.rescheduled) && `перенесено ${num(summary.rescheduled)}`]
    .filter(Boolean)
    .join(', ')
  const ending = remaining != null && remaining <= 1
    ? ` Пакет заканчивается: продлить или записаться — через менеджера в общем чате WhatsApp.`
    : ''
  return `Уроки с преподавателем по пакету: проведено ${conducted ?? 0}, осталось ${remaining ?? 0}${extra ? ` (${extra})` : ''}.${ending}`
}

/** Токены и ближайший приз (/cabinet/my-tokens) — только где токены включены (areRewardsEnabled). */
export function tokensLine(data, now = Date.now()) {
  const p = data?.period
  if (!p) return null
  const balance = Math.max(0, Number(p.balance) || 0)
  const parts = [`баланс ${balance}`]
  if (p.endsOn) parts.push(`период до ${dayOf(p.endsOn) || p.endsOn}${Number.isFinite(Number(p.daysLeft)) ? ` (осталось ${Number(p.daysLeft)} дн.)` : ''}`)
  const next = (Array.isArray(data.prizes) ? data.prizes : [])
    .filter((x) => Number(x?.costTokens) > balance)
    .sort((a, b) => Number(a.costTokens) - Number(b.costTokens))[0]
  if (next) parts.push(`ближайший приз «${clip(next.name, 60)}» — ${Number(next.costTokens)} токенов, не хватает ${Number(next.costTokens) - balance}`)
  if (Number(p.idlePoints) > 0) {
    const weekday = ![0, 6].includes(new Date(now).getUTCDay())
    parts.push(`в будний день без активности ночью спишется ${Number(p.idlePoints)}${weekday ? ' — сегодня будний' : ''}`)
  }
  return `Токены: ${parts.join('; ')}.`
}

// Вид задачи плана → подпись и раздел для метки «Совета сайта». Названия — как в блоке «Сегодня» (gePlan.module.*).
const MODULE_WORDS = {
  ai_tutor: ['разговор со Speaking Buddy', 'tutor'],
  workbooks: ['воркбук', 'workbooks'],
  shadowing: ['шэдоуинг', 'shadowing'],
  media_practice: ['книги, тексты и аудио', 'practice-reading'],
  vocabulary_sr: ['слова в «Словаре»', 'vocab'],
}
const taskWords = (task) => (task.kind === 'course' ? ['урок курса', 'learning'] : MODULE_WORDS[task.module] || ['практика', 'practice'])
// Свои задачи плана — урок курса и практика. Занятия и домашка преподавателя в «Сегодня» не входят (ТЗ 9.1,
// решение владельца 07.11.2026): у них свои строки профиля.
const isOwn = (task) => (task?.kind === 'course' || task?.kind === 'practice') && task?.origin !== 'teacher'
const STALE_DAYS = 14

function taskState(task) {
  if (task.status === 'completed') return 'готово'
  if (task.kind === 'practice' && task.got > 0) return `начато, ${task.got} из ${task.minutes} мин`
  if (task.status === 'in_progress') return 'начато'
  return 'не начато'
}

/**
 * План дня General English — то же, что блок «Сегодня» на «Главной». Вернёт { lines, next }:
 * next — следующий шаг { id: раздел для метки, name, reason } или null (плана нет, всё сделано).
 */
export function gePlanToday(plan, now = Date.now()) {
  if (!plan || plan.state !== 'ready' || !Array.isArray(plan.tasks)) return { lines: [], next: null }
  const today = plan.today || isoDay(now)
  const own = plan.tasks.filter(isOwn)
  const todays = own.filter((x) => x.date === today)
  const moved = own
    .filter((x) => x.date < today && x.status !== 'completed')
    .filter((x) => (Date.parse(today) - Date.parse(x.date)) / DAY_MS <= STALE_DAYS)
  if (!todays.length && !moved.length) return { lines: ['План на сегодня: на сегодня своих задач в плане нет.'], next: null }
  const sum = (list) => list.reduce((s, x) => s + (Number(x.minutes) || 0), 0)
  const done = todays.filter((x) => x.status === 'completed')
  const doneMin = done.reduce((s, x) => s + (Number(x.minutes) || 0), 0) +
    todays.filter((x) => x.status !== 'completed').reduce((s, x) => s + Math.min(Number(x.got) || 0, Number(x.minutes) || 0), 0)
  const items = todays.map((x) => `${taskWords(x)[0]} — ${x.minutes || '?'} мин, ${taskState(x)}`)
  const lines = [
    `План на сегодня (тот же, что блок «Сегодня» на Главной; занятия и домашка преподавателя — не в нём): ${items.join('; ') || 'своих задач нет'}. Сделано ${doneMin} из ${sum(todays)} мин.`,
  ]
  if (moved.length) {
    lines.push(`Перенесено с прошлых дней (не «просрочено» — без упрёка): ${moved.map((x) => `${taskWords(x)[0]} (с ${x.date})`).join('; ')}.`)
  }
  // Следующий шаг: сначала перенесённое, затем сегодняшнее по порядку плана.
  const first = [...moved, ...todays].find((x) => x.status !== 'completed')
  if (!first) {
    lines.push('Все задачи плана на сегодня выполнены.')
    return { lines, next: null }
  }
  const [name, id] = taskWords(first)
  return {
    lines,
    next: destinationOf(id)
      ? { id, name: destinationName(id), reason: first.date < today ? `следующий шаг плана (${name}, перенесён с ${first.date})` : `следующий шаг плана на сегодня (${name})` }
      : null,
  }
}

/** Цель из профиля General English — та же, что на баннере «Главной» (ТЗ 3: одна цель везде). */
export function geGoalLine(profile) {
  const target = profile?.targetLevel
  if (!target) return null
  const date = profile?.deadline?.date ? dayOf(profile.deadline.date) : null
  return `Цель ученика (профиль General English, как на баннере Главной): ${target}${date ? `, срок ${date}` : ''}.`
}
