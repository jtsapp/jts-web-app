// След одной оценки Speaking (банк, mock, диагностика): короткий id запроса, время этапов, разбор ответов и попыток
// модели. Зачем: жалоба «ИИ не оценил» раньше доходила одной фразой, а лог стенда — строкой без связи с учеником.
// Теперь id видит ученик (под ошибкой, его можно прислать в поддержку), он же — в строке лога `ielts_speaking_assess`,
// в заголовке ответа и в failReason работы на бэкенде. По нему находится, на каком этапе и почему всё сломалось.

import { randomUUID } from 'node:crypto'

export function createAssessTrace(route) {
  const startedAt = Date.now()
  const id = randomUUID().replace(/-/g, '').slice(0, 10)
  const stages = {}
  let last = startedAt
  const info = { route, debugId: id }

  const trace = {
    id,
    startedAt,
    /** Этап закончился — его длительность в мс (от конца прошлого этапа). */
    mark(stage) {
      const now = Date.now()
      stages[stage] = now - last
      last = now
    },
    set(key, value) {
      info[key] = value
    },
    /** Строка для failReason бэкенда (там не больше 200 символов): код, id запроса и коротко — что случилось. */
    reason(code, detail) {
      return `${code} · ${id}${detail ? ` · ${String(detail).slice(0, 150)}` : ''}`
    },
    /** JSON-ответ с id запроса; у ошибки — ещё и разбор (этапы, ответы, попытки модели) для консоли и поддержки. */
    respond(body, status = 200) {
      const ok = status < 400
      trace.log(ok ? null : body?.error, status)
      const out = ok ? { ...body, debugId: id } : { ...body, debugId: id, debug: { stage: info.stage || null, stages, answers: info.answers, model: info.model } }
      return Response.json(out, { status, headers: { 'x-ielts-debug-id': id } })
    },
    log(error, status) {
      const line = { kind: 'ielts_speaking_assess', ...info, ok: !error, error: error || undefined, status, ms: Date.now() - startedAt, stages }
      try {
        ;(error ? console.error : console.log)(JSON.stringify(line))
      } catch {
        /* лог не должен ронять ответ ученику */
      }
    },
  }
  return trace
}
