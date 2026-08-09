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

/** Бэкенд отказал по ограничению админки (блокировка модуля или исчерпанная
 *  квота «N из M»), а не из-за сети. Отдельный тип, потому что реакция
 *  противоположная: сетевую осечку мы проглатываем и синхронизируемся позже,
 *  а отказ обязаны показать студенту и НЕ засчитывать урок. */
export class ContentRestrictedError extends Error {
  constructor() {
    super('content restricted')
    this.name = 'ContentRestrictedError'
  }
}

// Отметить урок пройденным: на бэкенд — источник истины, локально — зеркало.
// Сетевая осечка не ломает поток (пишем локально, долетит при следующем
// complete/загрузке), а вот 403 засчитывать нельзя: раньше локальная запись
// шла ПЕРВОЙ и безусловно, поэтому заблокированный админом модуль всё равно
// «проходился» — тропа шла дальше по localStorage и больше не переспрашивала
// бэкенд. Теперь при отказе локальное зеркало остаётся нетронутым.
export async function markDone(level, token, moduleId, code, xp = 0) {
  const codes = new Set(readLocal(level))
  if (token && moduleId != null) {
    try {
      await completeLesson(token, moduleId, code, xp)
    } catch (e) {
      if (e?.status === 403) throw new ContentRestrictedError()
      /* офлайн/5xx — синхронизируется позже */
    }
  }
  codes.add(code)
  writeLocal(level, [...codes])
  return codes
}
