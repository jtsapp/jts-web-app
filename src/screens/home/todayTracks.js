// «Задачи на сегодня» по направлениям (задача 218 доски, 17.11.2026). У ученика, который учится сразу по General
// English и IELTS (или SAT), задачи дня живут в трёх местах: «Сегодня» общего курса на «Главной», «Сегодня» раздела
// IELTS и «Сегодня» раздела SAT. Здесь — правила одной карточки на «Главной»: какие направления в ней есть, сколько у
// каждого задач, какое раскрыто сначала и какие строки видны до «+ ещё N». Сами задачи считают бэкенды направлений
// (план GE, программа IELTS, задания дня SAT), этот модуль их только раскладывает: своего учёта у карточки нет.

import { DONE, PARTIAL, buildBlocks, currentLesson } from '../../sat/today/todayTasks.js'
import { TODAY_SIZE } from '../../sat/model/practice.js'

/** Порядок секций — как в карточке задачи: IELTS, General English, SAT. */
export const TRACK_ORDER = ['ielts', 'ge', 'sat']

/** Строк в секции до «+ ещё N» (макет карточки: три задачи и «+ ещё 2 задания»). */
export const ROW_LIMIT = 3

/** Направления, по которым ученик учится, в порядке карточки; неизвестное и повторы отбрасываются. */
export function orderTracks(keys) {
  const set = new Set(keys || [])
  return TRACK_ORDER.filter((k) => set.has(k))
}

/**
 * Карточка по направлениям нужна, только когда направлений больше одного или единственное — не General English: у
 * ученика одного общего курса «Сегодня» остаётся прежним (минуты дня, «По навыкам», «Мало времени»), без лишней рамки.
 */
export function needsTracksCard(keys) {
  const list = orderTracks(keys)
  return list.length > 1 || (list.length === 1 && list[0] !== 'ge')
}

/** Сколько задач осталось: null — данные ещё в пути (счётчик тогда не рисуется, а не показывает ложный ноль). */
export function openCount(rows, isDone = (x) => !!x.done) {
  if (!Array.isArray(rows)) return null
  return rows.filter((x) => !x.optional && !isDone(x)).length
}

/** Общий счётчик шапки — сумма известных; пока ни одно направление не ответило — null. */
export function totalCount(counts) {
  const known = (counts || []).filter((n) => typeof n === 'number')
  return known.length ? known.reduce((s, n) => s + n, 0) : null
}

/**
 * Какая секция раскрыта, пока ученик сам ничего не трогал: первая по порядку, где ещё есть что делать; всё сделано —
 * первая. Секция, чьи задачи ещё в пути (null), считается занятой: раскрыта она с «Загружаем…», и когда задачи придут,
 * раскрытие не прыгает на соседнюю. Переходит дальше, только если ответ пустой.
 */
export function defaultOpen(sections) {
  const list = sections || []
  const busy = list.find((s) => s.count !== 0)
  return busy ? busy.key : list[0]?.key ?? null
}

/**
 * Строки секции до «+ ещё N»: сначала невыполненные (их и надо делать), выполненными добираем до limit; порядок
 * строк внутри — как пришёл. Раскрыто — все строки. hidden — сколько спрятано.
 */
export function visibleRows(items, { limit = ROW_LIMIT, expanded = false, isDone = (x) => !!x.done } = {}) {
  const list = items || []
  if (expanded || list.length <= limit) return { shown: list, hidden: 0 }
  const pick = new Set([...list.filter((x) => !isDone(x)), ...list.filter(isDone)].slice(0, limit))
  return { shown: list.filter((x) => pick.has(x)), hidden: list.length - limit }
}

/**
 * Секция IELTS: { rows, note }. rows — шаги старта (анкета, диагностика) или задачи программы дня из
 * /mobile/ielts/dashboard (programme.tasks); note — ключ подписи, когда задач нет. Те же правила, что у карточки IELTS
 * на «Главной» (IeltsHomeCard) и у «Сегодня» раздела: материалы закрыты до анкеты и диагностики, программа без
 * назначения — «пройдите диагностику / укажите цель», а не «всё сделано». null — данные в пути.
 */
export function ieltsSection(data) {
  if (!data) return null
  const { me, programme, failed } = data
  if (!me?.onboarded) return { rows: [{ id: 'ielts-start', step: 'onboarding' }], note: null }
  if (me.access === false) return { rows: [{ id: 'ielts-diagnostic', step: 'diagnostic' }], note: null }
  if (failed) return { rows: [], note: 'home.tracks.failed' }
  const e = programme?.enrollment
  if (!e || e.status === 'programme_pending') return { rows: [], note: `ieltsPlan.pending.${e?.pendingReason || 'no_diagnostic'}` }
  const rows = (programme.tasks || []).map((task) => ({ id: `ielts-${task.id}`, task, done: task.status === 'completed' }))
  return { rows, note: rows.length ? null : 'ieltsPlan.allDone' }
}

/**
 * Секция SAT: { rows, note } — то же, что «Задания на сегодня» вкладки «Сегодня» SAT (buildBlocks: слова, практика по
 * теме занятия, третье — симуляция, ошибки или слабый навык), а в фазе самоподготовки — её список дел (selfPrep из
 * /mobile/sat/roadmap). Практика по слабому навыку — «вместо разбора», не обязанность дня (ctaOf SAT), поэтому в счёт не
 * идёт (optional). До доступа от менеджера — один шаг «старт SAT». null — данные в пути.
 */
export function satSection(data) {
  if (!data) return null
  const { me, roadmap, schedule, tasks, words, todayIso, failed } = data
  if (!me?.access) return { rows: [{ id: 'sat-start', key: 'start' }], note: null }
  const r = roadmap?.roadmap
  const phase = r?.phases?.find((p) => p.n === r.active)
  if (phase?.kind === 'self') {
    const p = roadmap.selfPrep || {}
    const rows = [
      p.openErrors > 0 && { id: 'sat-self-errors', key: 'selfErrors', n: p.openErrors },
      (p.weakDomains || []).length > 0 && { id: 'sat-self-weak', key: 'selfWeak', n: p.weakDomains.length },
      p.bankLeft > 0 && { id: 'sat-self-bank', key: 'selfBank', n: p.bankLeft },
      (p.bluebookLeft || []).length > 0 && { id: 'sat-self-bluebook', key: 'selfBluebook', n: p.bluebookLeft.length },
    ].filter(Boolean)
    return { rows, note: rows.length ? null : 'sat.self7.empty' }
  }
  if (failed) return { rows: [], note: 'home.tracks.failed' }
  const lesson = currentLesson(schedule, todayIso)
  const blocks = buildBlocks({ lesson, today: tasks, wordsState: words, practiceSize: TODAY_SIZE, todayIso })
  const rows = blocks.map((b) => ({
    id: `sat-${b.key}`,
    key: b.key,
    minutes: b.minutes,
    done: b.state === DONE,
    started: b.state === PARTIAL,
    optional: b.key === 'weak',
    n: b.open ?? null,
    // «4 из 10» у практики — как в карточке SAT: сколько вопросов набора дня уже решено
    progress: b.key === 'practice' && b.done > 0 ? { d: b.done, n: b.size } : null,
  }))
  return { rows, note: null }
}
