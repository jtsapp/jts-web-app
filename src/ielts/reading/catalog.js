// Каталог Reading из GET /mobile/ielts/tests: раскладка по разделам «Обучения» и «Пробных тестов» и сводки
// прогресса для карточек. Чистые функции — экран только рисует.
import { DRILLS, READING_CATEGORIES } from './meta.js'

// Трек ученика: тесты своего трека плюс общие (module: both).
export function forTrack(items, track) {
  return (items || []).filter((t) => t.module === 'both' || t.module === track)
}

// Тренажёр по типам: на тип — демо, практика и мини-тест (rtRole банка).
export function typeTrainers(items, track) {
  const mine = forTrack(items, track).filter((t) => t.kind === 'types')
  return READING_CATEGORIES.map(({ id }) => {
    const tests = mine.filter((t) => t.category === id)
    return {
      id,
      demo: tests.find((t) => t.role === 'demo') || null,
      practice: tests.filter((t) => t.role === 'practice'),
      mini: tests.find((t) => t.role === 'mini') || null,
      tests,
      started: tests.some((t) => t.attemptCount > 0),
      done: tests.filter((t) => t.attemptCount > 0).length,
    }
  }).filter((x) => x.tests.length > 0)
}

export function drills(items, track) {
  const mine = forTrack(items, track).filter((t) => t.kind === 'drill')
  return DRILLS.map((id) => {
    const tests = mine.filter((t) => t.category === id)
    return { id, tests, started: tests.some((t) => t.attemptCount > 0), done: tests.filter((t) => t.attemptCount > 0).length }
  }).filter((x) => x.tests.length > 0)
}

// «Задания Reading» — один текст (Academic passage) или одна секция (GT) в трёх режимах.
export function singleTexts(items, track) {
  return forTrack(items, track).filter((t) => t.kind === 'passage' || t.kind === 'section')
}

// Полные тесты на 60 минут, по порядку номера («Test 1»…).
export function fullTests(items, track) {
  return forTrack(items, track).filter((t) => t.kind === 'test')
}

// RM-AC-F07 → 7: номер теста для таблицы «Пробных тестов».
export function testNumber(id) {
  const m = /F(\d+)$/.exec(id || '')
  return m ? Number(m[1]) : null
}

// Сводка раздела Reading для карточки «Обучения» (Figma: «начато 7 из 12», «сделано заданий: 4»).
export function readingSummary(items, track) {
  const trainers = typeTrainers(items, track)
  const dr = drills(items, track)
  const texts = singleTexts(items, track)
  return {
    types: { started: trainers.filter((x) => x.started).length, total: trainers.length },
    drills: { started: dr.filter((x) => x.started).length, total: dr.length },
    texts: { done: texts.filter((t) => t.attemptCount > 0).length, total: texts.length },
    full: { done: fullTests(items, track).filter((t) => t.attemptCount > 0).length, total: fullTests(items, track).length },
  }
}

// Точность Reading по всем последним попыткам — подпись «точность 71 %» в шапке карточки.
export function readingAccuracy(items) {
  let score = 0
  let max = 0
  for (const t of items || []) {
    if (!t.lastAttempt) continue
    score += t.lastAttempt.rawScore
    max += t.lastAttempt.maxScore
  }
  return max > 0 ? Math.round((score / max) * 100) : null
}
