/* Клиентская сторона проверки текста — порт runCheck из data/jtswriting.html
   (11978–12044), очищенный от DOM: кнопки и экраны остаются в WritingPad,
   здесь только сеть и фолбэк. Правило прототипа сохранено дословно: ЛЮБОЙ
   сбой (нет сети, не-2xx, битый JSON, не прошло validateAssessment, таймаут)
   молча уводит в офлайн-проверку по правилам — ученик всегда получает
   результат, а не ошибку. Модуль чистый (без React), гоняется в vitest. */

import { localAssess } from './localCheck.js'
import { validateAssessment } from './assessContract.js'

// 20 секунд — из прототипа: дольше ждать бессмысленно, офлайн-проверка
// мгновенная и даёт тот же формат ответа.
const DEFAULT_TIMEOUT_MS = 20000

function offline(payload, ctx) {
  // localAssess сам ставит mode:'offline', но перекладываем явно: это
  // контракт для UI («оффлайн-проверка по правилам» в шапке разбора).
  return { assessment: { ...localAssess(payload, ctx), mode: 'offline' }, mode: 'offline' }
}

/* payload = {level, genre, targetWords, task, text} — см. checkPayload
   прототипа; ctx = {wordlist?, checklist?, myWords?, rules?} — контекст
   офлайн-проверки (localAssess). Возвращает {assessment, mode} и НИКОГДА
   не бросает: фолбэк — часть контракта. */
export async function runCheck(payload, { token, endpoint = '/api/writing/check', timeoutMs = DEFAULT_TIMEOUT_MS, ctx } = {}) {
  // Без токена на сервер не ходим вовсе: роут ответил бы 401, а ученик
  // прождал бы таймаут ради того же офлайн-результата.
  if (!token) return offline(payload, ctx)
  try {
    // Гонка fetch/таймер вместо AbortController: прототип жил на setTimeout,
    // и нам важен только «не ждать дольше N», а не отмена самого запроса.
    const res = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload),
      }).then(
        (r) => {
          clearTimeout(timer)
          resolve(r)
        },
        (e) => {
          clearTimeout(timer)
          reject(e)
        },
      )
    })
    if (!res.ok) throw new Error('http ' + res.status)
    const data = await res.json()
    // Роут может отдать {assessment}, {result} (как сервер прототипа) или
    // голый объект оценки — принимаем все три формы.
    const raw = data && typeof data === 'object' ? (data.assessment ?? data.result ?? data) : null
    const normed = validateAssessment(raw, payload.text)
    if (!normed) throw new Error('bad shape')
    return { assessment: { ...normed, mode: 'live' }, mode: 'live' }
  } catch {
    return offline(payload, ctx)
  }
}
