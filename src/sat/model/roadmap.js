// Роудмап SAT по ТЗ 21.10.2026 (задача 1). Фазы, недели и счётчики считает сервер (SatRoadmap) — один источник для
// дашборда, вкладки «План» и плиток. Здесь только показ: подписи фаз, раскладка узлов по дороге и перевод занятий
// группы в форму недель, которую рисуют «Неделя» и «Месяц».

/** Статус занятия для студента (SatScheduleService) → статус клетки календаря. */
const LESSON_STATUS = { DONE: 'done', MISSED: 'skipped', MOVED: 'moved', PLANNED: 'planned' }

/** Фаза роудмапа по номеру. */
export function phaseByN(roadmap, n) {
  return roadmap?.phases?.find((p) => p.n === n) || null
}

/** Ключ фазы для подписей (sat.phase.<key>). */
export function phaseKeyOf(roadmap, n) {
  return phaseByN(roadmap, n)?.key || 'foundations1'
}

/** Фаза с занятиями, в которую попадает номер занятия программы. */
export function phaseOfLesson(roadmap, number) {
  return (roadmap?.phases || []).find((p) => p.lessonFrom != null && number >= p.lessonFrom && number <= p.lessonTo) || null
}

/** Сколько занятий фазы студент прошёл (по отметкам преподавателя, пропуски не считаются). */
export function phaseLessons(phase, schedule) {
  if (!phase || phase.lessonFrom == null) return null
  const own = (schedule?.lessons || []).filter((l) => l.number >= phase.lessonFrom && l.number <= phase.lessonTo)
  return { done: own.filter((l) => l.status === 'DONE').length, total: phase.lessonTo - phase.lessonFrom + 1 }
}

/** Дата «ГГГГ-ММ-ДД» по Алматы из ISO со смещением (startsAt занятия) — без пересчёта в пояс браузера. */
export function lessonDay(startsAt) {
  return String(startsAt).slice(0, 10)
}

function mondayIso(dayIso) {
  const [y, m, d] = dayIso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
  return t.toISOString().slice(0, 10)
}

/**
 * Занятия группы → { weeks, examDate } той же формы, что старый план: «Неделя» и «Месяц» рисуют их без своих правил.
 * Неделя курса — по календарю группы (week из программы), фаза недели — фаза её занятий.
 */
export function scheduleAsPlan(schedule, roadmap, examDate) {
  const byWeek = new Map()
  for (const l of schedule?.lessons || []) {
    const date = lessonDay(l.startsAt)
    const phase = phaseOfLesson(roadmap, l.number)
    const lesson = {
      id: String(l.id),
      number: l.number,
      date,
      time: String(l.startsAt).slice(11, 16),
      phase: phase?.n ?? null,
      section: l.section === 'MATH' ? 'math' : l.section === 'RW' ? 'rw' : 'mixed',
      topic: l.topic,
      skillIds: l.skillIds || [],
      actions: [],
      minutes: 90,
      status: LESSON_STATUS[l.status] || 'planned',
      next: !!l.next,
    }
    if (!byWeek.has(l.week)) byWeek.set(l.week, { index: l.week - 1, monday: mondayIso(date), phase: lesson.phase, lessons: [] })
    byWeek.get(l.week).lessons.push(lesson)
  }
  const weeks = [...byWeek.values()].sort((a, b) => a.index - b.index)
  weeks.forEach((w) => w.lessons.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)))
  return { weeks, examDate: examDate || null }
}

/** Следующее занятие группы (сервер помечает его next). */
export function nextGroupLesson(plan) {
  for (const w of plan?.weeks || []) for (const l of w.lessons) if (l.next) return l
  return null
}

// Дорога роудмапа (Figma 12): три ряда, повороты полуокружностью r = 60. Узлы раскладываются по её длине — фаз
// бывает от 3 до 8 (пакеты, дата экзамена), поэтому координаты не таблицей, а точкой на дороге.
const R = 60
const ARC = Math.PI * R
const ROW1 = { x0: 103, x1: 878, y: 310 }
const ROW2 = { x0: 878, x1: 208, y: 190 }
const ROW3 = { x0: 208, x1: 943, y: 70 }
const L1 = ROW1.x1 - ROW1.x0
const L2 = ROW2.x0 - ROW2.x1
const L3 = ROW3.x1 - ROW3.x0
export const ROAD_LENGTH = L1 + ARC + L2 + ARC + L3
export const ROAD = 'M103 310 H878 A60 60 0 0 0 878 190 H208 A60 60 0 0 1 208 70 H943'

/** Точка дороги на расстоянии s от старта. */
export function roadPoint(s) {
  let d = Math.max(0, Math.min(ROAD_LENGTH, s))
  if (d <= L1) return { x: ROW1.x0 + d, y: ROW1.y }
  d -= L1
  if (d <= ARC) {
    const a = d / R
    return { x: ROW1.x1 + R * Math.sin(a), y: ROW1.y - R + R * Math.cos(a) }
  }
  d -= ARC
  if (d <= L2) return { x: ROW2.x0 - d, y: ROW2.y }
  d -= L2
  if (d <= ARC) {
    const a = d / R
    return { x: ROW2.x1 - R * Math.sin(a), y: ROW2.y - R + R * Math.cos(a) }
  }
  d -= ARC
  return { x: ROW3.x0 + d, y: ROW3.y }
}

/** Расстояние узла i из count: первый — у старта, последний — на финише (там день экзамена). */
export function nodeAt(i, count) {
  return count <= 1 ? 0 : (ROAD_LENGTH * i) / (count - 1)
}
