// «Задания на сегодня» (ТЗ SAT 21.10, задача 11): три задания самостоятельной работы. Состояния — по фактам дня
// (сервер: /mobile/sat/today-tasks), поэтому выполненный блок не сбрасывается до следующего дня.

export const NONE = 'none'
export const PARTIAL = 'partial'
export const DONE = 'done'

// Оценки времени блоков; сумма в карточке не фиксирована и с 90 минутами занятия не связана
export const MINUTES = { words: 15, practice: 40, mock: 135, errors: 30, weak: 30 }

/** Занятие группы, к которому относятся задания: сегодняшнее, иначе ближайшее непроведённое. */
export function currentLesson(schedule, todayIso) {
  const lessons = schedule?.lessons || []
  const today = lessons.find((l) => String(l.startsAt).slice(0, 10) === todayIso)
  if (today) return today
  return lessons.find((l) => String(l.startsAt).slice(0, 10) > todayIso && l.status !== 'DONE') || null
}

/** День симуляции — сегодня по программе разбор полной симуляции (секция MIXED в фазе Challenge). */
export function isMockDay(lesson, todayIso) {
  return !!lesson && lesson.section === 'MIXED' && String(lesson.startsAt).slice(0, 10) === todayIso
}

/**
 * Три блока: слова (раздел «Словарь» вне SAT), практика по теме, третий — симуляция в её день, иначе работа над
 * ошибками, а без неразобранных ошибок — практика по слабому навыку (блок не остаётся пустым).
 */
export function buildBlocks({ lesson, today, wordsState = NONE, practiceSize, todayIso }) {
  const t = today || { practiceToday: 0, openErrors: 0, reviewedToday: 0, mock: null, weakSkill: null }
  const practiceState = t.practiceToday >= practiceSize ? DONE : t.practiceToday > 0 ? PARTIAL : NONE
  let third
  if (isMockDay(lesson, todayIso)) {
    third = { key: 'mock', state: t.mock === 'finished' ? DONE : t.mock === 'active' ? PARTIAL : NONE }
  } else if (t.openErrors > 0) {
    third = { key: 'errors', state: t.reviewedToday > 0 ? PARTIAL : NONE, open: t.openErrors }
  } else {
    third = { key: 'weak', state: NONE, skillId: t.weakSkill, noErrors: true }
  }
  return [
    { key: 'words', state: wordsState },
    { key: 'practice', state: practiceState, done: Math.min(t.practiceToday, practiceSize), size: practiceSize },
    third,
  ].map((b) => ({ ...b, minutes: MINUTES[b.key] }))
}

/** Кнопка ведёт в первый невыполненный блок, а не всегда в первый по порядку. */
export function firstOpen(blocks) {
  const i = blocks.findIndex((b) => b.state !== DONE)
  return i < 0 ? null : blocks[i]
}

// Слова учатся вне SAT, и сделанное там сюда не приходит: отметка дня хранится на устройстве (это удобство, не учёт)
export function wordsKey(todayIso) {
  return `jts_sat_words_${todayIso}`
}

export function readWords(todayIso) {
  try {
    return window.localStorage.getItem(wordsKey(todayIso)) || NONE
  } catch {
    return NONE
  }
}

export function writeWords(todayIso, state) {
  try {
    window.localStorage.setItem(wordsKey(todayIso), state)
  } catch {
    /* без хранилища отметка просто не запомнится */
  }
}
