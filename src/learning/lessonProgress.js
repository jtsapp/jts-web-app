// Прогресс уроков «Обучения»: источник истины — бэкенд (синхрон между
// устройствами и с мобилкой), локальный localStorage-ключ 'jts-<level>-done'
// сохраняем как офлайн-зеркало и для обратной совместимости (кольцо прогресса
// KingdomInteriorPage/LearningPage читало его же).
import { getLessonProgress, completeLesson } from '../api.js'

const localKey = (level) => 'jts-' + String(level || '').toLowerCase() + '-done'

function readLocal(level) {
  if (typeof window === 'undefined') return []
  try {
    const a = JSON.parse(window.localStorage.getItem(localKey(level)) || '[]')
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

function writeLocal(level, codes) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(localKey(level), JSON.stringify([...new Set(codes)]))
  } catch {
    /* приватный режим / переполнение — не критично */
  }
}

// Множество пройденных кодов уроков уровня. Берём бэкенд, объединяем с локальным
// (на случай прогресса, ещё не долетевшего на сервер); при недоступном бэкенде —
// только локальный кэш, чтобы тропа не сбрасывалась.
export async function loadDone(level, token, moduleId) {
  const local = new Set(readLocal(level))
  if (token && moduleId != null) {
    try {
      const res = await getLessonProgress(token, moduleId)
      for (const c of res.done || []) local.add(c)
      writeLocal(level, [...local]) // подтягиваем серверный прогресс в зеркало
    } catch {
      /* офлайн / эндпоинт ещё не задеплоен — остаёмся на локальном */
    }
  }
  return local
}

// Отметить урок пройденным: локально сразу (мгновенный UI), на бэкенд —
// best-effort (осечка не ломает поток; долетит при следующем complete/загрузке).
export async function markDone(level, token, moduleId, code, xp = 0) {
  const codes = new Set(readLocal(level))
  codes.add(code)
  writeLocal(level, [...codes])
  if (token && moduleId != null) {
    try {
      await completeLesson(token, moduleId, code, xp)
    } catch {
      /* синхронизируется позже */
    }
  }
  return codes
}
