// «Задания на сегодня» (ТЗ SAT 21.10, задача 11): три задания самостоятельной работы. Состояния — по фактам дня
// (сервер: /mobile/sat/today-tasks), поэтому выполненный блок не сбрасывается до следующего дня.

export const NONE = 'none'
export const PARTIAL = 'partial'
export const DONE = 'done'

// Оценки времени блоков (Figma «NEW 2», 17:6008); сумма в карточке не фиксирована и с 90 минутами занятия не связана
export const MINUTES = { words: 15, practice: 40, mock: 135, errors: 15, weak: 20 }

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

/**
 * Кнопка под заданиями (Figma 17:6008): «Начать: выучить слова», пока ничего не тронуто; «Продолжить: …» — первый
 * невыполненный блок; «Всё сделано на сегодня» — слова и практика выполнены, а третий блок — практика по слабому
 * навыку: она «вместо разбора», не обязанность дня. Кнопка и тогда остаётся и ведёт в эту практику (block), если навык
 * есть. kind — 'start' | 'continue' | 'done'.
 */
export function ctaOf(blocks) {
  const open = blocks.find((b) => b.key !== 'weak' && b.state !== DONE)
  if (!open) return { kind: 'done', block: blocks.find((b) => b.key === 'weak' && b.skillId) || null }
  return { kind: blocks.some((b) => b.state !== NONE) ? 'continue' : 'start', block: open }
}

/** Вид третьего блока: симуляция (тёмная рамка и предупреждение), работа над ошибками, «все ошибки разобраны». */
export function thirdVariant(block) {
  if (block?.key === 'mock') return 'mock'
  if (block?.key === 'errors') return 'errors'
  return 'clear'
}

/** «ваш приоритет №2» — место домена занятия в фокусе последнего Bluebook-теста; null — домен не в фокусе. */
export function priorityRank(domainId, focus) {
  const i = domainId && Array.isArray(focus) ? focus.indexOf(domainId) : -1
  return i < 0 ? null : i + 1
}

/** Чип «До экзамена · 6 недель»; за две недели и меньше счёт идёт днями («· 9 дней», Figma 17:7162). */
export function examLeft(exam) {
  if (!exam || exam.days == null) return null
  return exam.weeks >= 2 ? { unit: 'weeks', n: exam.weeks } : { unit: 'days', n: Math.max(0, exam.days) }
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
