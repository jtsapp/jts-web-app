// Прогресс уроков «Обучения»: источник истины — бэкенд (синхрон между
// устройствами и с мобилкой), локальный localStorage-ключ 'jts-<level>-done'
// сохраняем как офлайн-зеркало и для обратной совместимости (кольцо прогресса
// KingdomInteriorPage/LearningPage читало его же).
import { getLessonProgress, completeLesson } from '../api.js'
import { userIdFromToken } from '../lib/jwt.js'

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

// Уроки, не дошедшие до сервера (офлайн/5xx на complete). Раньше markDone
// обещал «синхронизируется позже», а досылки не было: урок жил только в
// зеркале — без монет и XP, непройденным на мобилке и другом устройстве.
// Бэкенд засчитывает урок идемпотентно (монеты — только за первое
// прохождение), поэтому повторная отправка безопасна. В записи — userId:
// общий компьютер, и чужой урок под токеном следующего ученика уйти не должен.
const PENDING_KEY = 'jts_lesson_pending'
const pendingId = (e) => `${e.uid}|${e.moduleId}|${e.code}`

function readPending() {
  if (typeof window === 'undefined') return []
  try {
    const a = JSON.parse(window.localStorage.getItem(PENDING_KEY) || '[]')
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

function writePending(list) {
  if (typeof window === 'undefined') return
  try {
    if (list.length) window.localStorage.setItem(PENDING_KEY, JSON.stringify(list))
    else window.localStorage.removeItem(PENDING_KEY)
  } catch {
    /* приватный режим — досылки не будет, как и раньше */
  }
}

function queuePending(entry) {
  const id = pendingId(entry)
  writePending([...readPending().filter((e) => pendingId(e) !== id), entry])
}

// Досылаем свои недошедшие уроки модуля. Отказ 403 — урок не засчитан
// (квота/блокировка появилась, пока он ждал): убираем его и из очереди, и с
// тропы. Сеть снова молчит — оставляем до следующей загрузки.
async function resendPending(level, token, moduleId) {
  const uid = userIdFromToken(token)
  if (!uid) return
  const mine = readPending().filter((e) => e.uid === uid && e.moduleId === moduleId)
  if (!mine.length) return
  const settled = new Set()
  const refused = []
  for (const e of mine) {
    try {
      await completeLesson(token, moduleId, e.code, e.xp)
      settled.add(pendingId(e))
    } catch (err) {
      if (err?.status === 403) {
        settled.add(pendingId(e))
        refused.push(e.code)
      }
    }
  }
  // Перечитываем очередь: пока шли запросы, markDone мог добавить новое.
  writePending(readPending().filter((e) => !settled.has(pendingId(e))))
  if (refused.length) writeLocal(level, readLocal(level).filter((c) => !refused.includes(c)))
}

// Множество пройденных кодов уроков уровня. Берём бэкенд, объединяем с локальным
// (на случай прогресса, ещё не долетевшего на сервер); при недоступном бэкенде —
// только локальный кэш, чтобы тропа не сбрасывалась.
export async function loadDone(level, token, moduleId) {
  if (token && moduleId != null) await resendPending(level, token, moduleId)
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
      // Офлайн/5xx: урок засчитываем локально и ставим в очередь — loadDone
      // дошлёт его при следующем открытии тропы.
      const uid = userIdFromToken(token)
      if (uid) queuePending({ uid, moduleId, code, xp })
    }
  }
  codes.add(code)
  writeLocal(level, [...codes])
  return codes
}
