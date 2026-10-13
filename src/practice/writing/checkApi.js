/* Клиентская сторона проверки текста — порт runCheck из data/jtswriting.html
   (11978–12044), очищенный от DOM: кнопки и экраны остаются в WritingPad,
   здесь только сеть и фолбэк. Правило прототипа сохранено дословно: ЛЮБОЙ
   сбой (нет сети, не-2xx, битый JSON, не прошло validateAssessment, таймаут)
   молча уводит в офлайн-проверку по правилам — ученик всегда получает
   результат, а не ошибку. Модуль чистый (без React), гоняется в vitest. */

import { localAssess } from './localCheck.js'
import { CHECK_CLIENT_TIMEOUT_MS, validateAssessment } from './assessContract.js'

// В прототипе ждали 20 с: «офлайн-проверка мгновенная». Но AI-проверка идёт
// 11–15 с, а на длинном тексте и под нагрузкой дольше — и на 20-й секунде
// клиент уводил в офлайн, хотя сервер продолжал, списывал кредит и писал
// разбор в журнал. Теперь ждём дольше, чем роут может работать вообще
// (CHECK_DEADLINE_MS < CHECK_CLIENT_TIMEOUT_MS, оба в assessContract.js), и
// офлайн остаётся для настоящих сбоев: нет сети, 5xx, кривой ответ.
const DEFAULT_TIMEOUT_MS = CHECK_CLIENT_TIMEOUT_MS

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
    // Брошенный запрос ещё и закрываем (AbortController) — в прототипе он
    // висел до ответа сервера. Но ждём всё равно гонкой с таймером: вернуться
    // к ученику вовремя нельзя доверять тому, как fetch отработает abort.
    // Таймер живёт и на чтении тела — ответ мог встать посреди потока.
    const controller = new AbortController()
    let timer
    const expired = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('timeout'))
      }, timeoutMs)
    })
    expired.catch(() => {})
    let data
    try {
      const res = await Promise.race([
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }),
        expired,
      ])
      if (!res.ok) throw new Error('http ' + res.status)
      data = await Promise.race([res.json(), expired])
    } finally {
      clearTimeout(timer)
    }
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
