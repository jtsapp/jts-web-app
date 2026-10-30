// Полоса фаз SAT (Figma «NEW 2», компонент 17:5293) — одна на «План» (размер L) и «Сегодня» (размер S). Фазы, их
// статусы и недели считает сервер (SatRoadmap); здесь только раскладка в точки полосы: тип точки, состояние,
// подписи (ключи i18n с подстановками — язык выбирает экран) и заполнение отрезков. Без React, чтобы проверить тестом.
import { phaseLessons } from './roadmap.js'

/** Вид фазы сервера → тип точки: контрольная точка, учебный отрезок, пунктир самоподготовки, финиш-экзамен. */
const TYPE = { test: 'cp', lessons: 'seg', self: 'self', exam: 'end' }

/** Отрезок текущей фазы не пустой, даже если ни одно занятие ещё не отмечено: видно, где вы (Figma, заглушка ~12%). */
export const MIN_FILL = 12

/**
 * Неделя контрольного теста — последняя неделя учебной фазы перед ним (Test 8 — после недели 4, Test 10 — после 8,
 * и с Challenge тоже). Тест недель не занимает, поэтому у сервера weekFrom у него null. null — учебной фазы перед ним
 * нет (диагностика).
 */
export function checkpointWeek(roadmap, n) {
  const before = (roadmap?.phases || []).filter((p) => p.kind === 'lessons' && p.n < n)
  return before.length ? before[before.length - 1].weekTo : null
}

/** Состояние точки: пройдена, текущая, будущая; тест, прошедший без баллов, — «warn» (жёлтая точка с «!»). */
function stateOf(p, active) {
  if (p.status === 'incomplete') return 'warn'
  if (p.status === 'done') return 'done'
  if (p.n === active || p.status === 'active') return 'current'
  return 'future'
}

/** Подпись под заголовком: [ключ, подстановки] или null (дату экзамена форматирует экран). */
function subOf(p, roadmap) {
  if (p.kind === 'test') {
    const week = checkpointWeek(roadmap, p.n)
    return week == null ? ['sat.strip.test', { n: String(p.bluebookTest) }] : ['sat.strip.testWeek', { n: String(week) }]
  }
  if (p.kind === 'lessons') {
    return p.weekFrom === p.weekTo ? ['sat.strip.week', { n: String(p.weekFrom) }] : ['sat.strip.weeks', { a: String(p.weekFrom), b: String(p.weekTo) }]
  }
  if (p.kind === 'self') return ['sat.strip.selfWeeks', { n: String(selfWeeks(p)) }]
  return null
}

/** Сколько недель самоподготовки до экзамена (недели курса включительно; минимум одна — иначе сервер фазу не даёт). */
function selfWeeks(p) {
  return p.weekFrom != null && p.weekTo != null ? Math.max(1, p.weekTo - p.weekFrom + 1) : 1
}

/**
 * Точки полосы в порядке фаз (1, 2, 3, 4, 5, [6], [7], 8). Поля точки:
 * type — 'cp' | 'seg' | 'self' | 'end'; state — 'done' | 'current' | 'future' | 'warn'; here — чип «Вы здесь»;
 * title — ключ заголовка; sub — [ключ, подстановки] | null; lessons — число занятий отрезка (третья строка размера L),
 * extra — отрезок доп. пакета; fill — заполнение отрезка в процентах; left / right — линии точки зелёные (пройдено).
 * Линии: слева зелёная, если пройдена предыдущая фаза (у первой — всегда), справа — если пройдена сама точка.
 */
export function phaseStrip(roadmap, schedule) {
  const phases = roadmap?.phases || []
  const active = roadmap?.active
  const points = phases.map((p) => {
    const type = TYPE[p.kind] || 'seg'
    const state = stateOf(p, active)
    let fill = 0
    if (type === 'seg') {
      if (state === 'done') fill = 100
      else if (state === 'current') {
        const l = phaseLessons(p, schedule)
        fill = l && l.total ? Math.min(100, Math.max(MIN_FILL, Math.round((l.done * 100) / l.total))) : MIN_FILL
      }
    }
    return {
      n: p.n,
      key: p.key,
      type,
      state,
      here: p.n === active,
      title: `sat.strip.${p.key}`,
      sub: subOf(p, roadmap),
      lessons: p.lessonFrom != null ? p.lessonTo - p.lessonFrom + 1 : null,
      extra: p.key === 'challenge',
      fill,
    }
  })
  // «пройдено» для линий: тест без баллов план не держит (сервер ведёт фазы дальше), линия за ним уже зелёная
  const passed = (pt) => pt.state === 'done' || pt.state === 'warn'
  points.forEach((pt, i) => {
    pt.left = i === 0 || passed(points[i - 1])
    pt.right = pt.type !== 'end' && passed(pt)
  })
  return points
}

/**
 * Ритм программы под заголовком карточки: виды фаз после диагностики (с неё план начинается, макет её не называет) —
 * «учёба → проверка → … → самостоятельная подготовка → экзамен». Экран переводит вид в слово.
 */
export function rhythm(roadmap) {
  return (roadmap?.phases || []).filter((p) => p.n > 1).map((p) => p.kind)
}
