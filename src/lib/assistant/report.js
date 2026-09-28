// Метки поломки сайта: модель ставит [[REPORT_BUG]] в конце ответа, роут
// отрезает её от ученика и пишет отчёт в БД. Клиенту в конце стрима шлём
// другую метку — заголовки HTTP к этому моменту уже ушли.

export const REPORT_BUG_MARKER = '[[REPORT_BUG]]'

/** Служебный хвост стрима: «отчёт записан». Ученику не показываем. */
export const REPORTED_STREAM_MARKER = '[[ASST_REPORTED]]'

/**
 * Отделяет видимый ученику ответ от служебного отчёта после [[REPORT_BUG]].
 * Метки нет — весь текст видимый.
 */
export function splitReport(text) {
  const raw = String(text ?? '')
  const idx = raw.indexOf(REPORT_BUG_MARKER)
  if (idx < 0) return { visible: raw, report: null }
  return {
    visible: raw.slice(0, idx).trimEnd(),
    report: raw.slice(idx + REPORT_BUG_MARKER.length).trim(),
  }
}

function createHoldbackFilter(mark, onFound) {
  let hold = ''
  let capturing = false
  let visible = ''
  let after = ''
  return {
    push(chunk) {
      const piece = String(chunk ?? '')
      if (!piece) return ''
      if (capturing) {
        after += piece
        return ''
      }
      hold += piece
      const i = hold.indexOf(mark)
      if (i >= 0) {
        const out = hold.slice(0, i)
        capturing = true
        after = hold.slice(i + mark.length)
        hold = ''
        visible += out
        onFound?.()
        return out
      }
      const keep = mark.length - 1
      if (hold.length > keep) {
        const out = hold.slice(0, hold.length - keep)
        hold = hold.slice(-keep)
        visible += out
        return out
      }
      return ''
    },
    flush() {
      if (capturing) return ''
      const out = hold
      hold = ''
      visible += out
      return out
    },
    visible() {
      return visible.trimEnd()
    },
    after() {
      return capturing ? after.trim() : null
    },
    found() {
      return capturing
    },
  }
}

/**
 * Фильтр стрима модели: ученику не показываем метку и текст после неё, пока
 * копим отчёт для БД. Держит хвост короче метки, чтобы [[REP + ORT_BUG]] не
 * уехал в пузырь.
 */
export function createReportFilter() {
  const inner = createHoldbackFilter(REPORT_BUG_MARKER)
  return {
    push: inner.push,
    flush: inner.flush,
    visible: inner.visible,
    report: inner.after,
  }
}

/**
 * Фильтр стрима на клиенте: срезает [[ASST_REPORTED]] в конце ответа, чтобы
 * метка не попала ни на экран, ни в историю следующего вопроса.
 */
export function createReportedFlagFilter() {
  const inner = createHoldbackFilter(REPORTED_STREAM_MARKER)
  return {
    push: inner.push,
    flush: inner.flush,
    get reported() {
      return inner.found()
    },
  }
}
