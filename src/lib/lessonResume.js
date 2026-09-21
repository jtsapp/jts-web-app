// Где ученик остановился в уроке — чтобы перезагрузка страницы или случайно
// закрытая вкладка не отбрасывали его на первый шаг.
//
// Урок A2–B2 — это 40–90 экранов. Раньше позиция жила только в памяти плеера:
// обновил страницу на тридцатом шаге (или телефон выгрузил вкладку из памяти)
// — начинай заново. Здесь один незаконченный урок на ученика: пройти два урока
// параллельно на тропе всё равно нельзя.
//
// Ключ записи — id ученика из токена, а не общий: на общем компьютере чужая
// позиция не должна всплывать следующему. Запись сверяется с уроком по числу
// шагов — если урок в данных поменялся, старая позиция указывала бы не туда,
// и её молча забываем.
import { userIdFromToken } from './jwt.js'

const KEY = 'jts_lesson_resume'
// Недельная давность — разумный край: через месяц ученик урок уже не помнит,
// и «продолжить с 37-го шага» его скорее собьёт.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const owner = (token) => String(userIdFromToken(token) || 'anon')

function readAll() {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try {
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all))
    else localStorage.removeItem(KEY)
  } catch {
    /* приватный режим — позиция просто не переживёт перезагрузку */
  }
}

/** Сохранённая позиция урока или null, если её нет, она чужая или устарела. */
export function readResume(token, lessonKey, total, now = Date.now()) {
  const saved = readAll()[owner(token)]
  if (!saved || saved.lesson !== lessonKey || saved.total !== total) return null
  if (!(saved.idx > 0 && saved.idx < total)) return null
  if (!(now - saved.at < MAX_AGE_MS)) return null
  return { idx: saved.idx, correct: saved.correct || 0, wrong: saved.wrong || 0, points: saved.points || 0 }
}

export function saveResume(token, lessonKey, total, { idx, correct, wrong, points }, now = Date.now()) {
  const all = readAll()
  all[owner(token)] = { lesson: lessonKey, total, idx, correct, wrong, points, at: now }
  writeAll(all)
}

export function clearResume(token, lessonKey) {
  const all = readAll()
  const own = owner(token)
  if (all[own] && (!lessonKey || all[own].lesson === lessonKey)) {
    delete all[own]
    writeAll(all)
  }
}
