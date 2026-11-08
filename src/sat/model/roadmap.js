// Роудмап SAT по ТЗ 21.10.2026 (задача 1). Фазы, недели и счётчики считает сервер (SatRoadmap) — один источник для
// дашборда, вкладки «План» и плиток. Здесь только показ: подписи фаз, дни Bluebook-тестов и перевод занятий
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

/**
 * Дни Bluebook-тестов для «Месяца»: { 'ГГГГ-ММ-ДД': номер теста }. Тест пишется в выходные перед следующей фазой
 * (ТЗ 21.10: «между неделями, занятия не прерываются»), а сервер ставит точке дату понедельника этой фазы — поэтому
 * в календаре чип стоит на воскресенье перед ним (Figma «NEW 2», Месяц: «Bluebook Test 8» в воскресенье недели 4).
 */
export function bluebookDays(roadmap) {
  const days = {}
  for (const p of roadmap?.phases || []) {
    if (p.kind !== 'test' || !p.start || p.bluebookTest == null) continue
    const [y, m, d] = p.start.split('-').map(Number)
    days[new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)] = p.bluebookTest
  }
  return days
}
