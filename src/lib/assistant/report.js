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

/** Чип «На сайте ошибка» на языках интерфейса. С него начинается чат для команды. */
export const BUG_CHIP_TEXTS = [
  'На сайте ошибка',
  'The site has an error',
  'Сайтта қате бар',
]

/** Сколько чата с момента чипа кладём в user_message. */
export const USER_THREAD_MAX = 8000

function normChip(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const CHIP_SET = new Set(BUG_CHIP_TEXTS.map(normChip))

export function isBugChipText(content) {
  return CHIP_SET.has(normChip(content))
}

function lastIndexWhere(list, pred) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (pred(list[i], i)) return i
  }
  return -1
}

function formatErrorThread(msgs, maxChars) {
  const line = (m, assistantLimit) => {
    const who = m.role === 'user' ? 'Ученик' : 'Помощник'
    let body = String(m.content || '').trim()
    if (m.role === 'assistant' && body.length > assistantLimit) {
      body = `${body.slice(0, assistantLimit)}…`
    }
    return `${who}: ${body}`
  }
  let assistantLimit = 400
  let out = msgs.map((m) => line(m, assistantLimit)).join('\n\n')
  while (out.length > maxChars && assistantLimit > 80) {
    assistantLimit = Math.max(80, Math.floor(assistantLimit / 2))
    const next = msgs.map((m) => line(m, assistantLimit)).join('\n\n')
    if (next.length >= out.length) break
    out = next
  }
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1)}…`
  return out
}

/**
 * Чат для вкладки админки: с последнего чипа «На сайте ошибка», а не только
 * последняя реплика («ты сам передашь?»). Чипа нет — последнее сообщение ученика.
 */
export function errorThreadFromMessages(messages, maxChars = USER_THREAD_MAX) {
  const list = (Array.isArray(messages) ? messages : []).filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim(),
  )
  if (!list.length) return ''
  const chipAt = lastIndexWhere(list, (m) => m.role === 'user' && isBugChipText(m.content))
  const start = chipAt >= 0 ? chipAt : lastIndexWhere(list, (m) => m.role === 'user')
  if (start < 0) return ''
  return formatErrorThread(list.slice(start), maxChars)
}

const THANKS_RE = /^(спасибо|рахмет|рақмет|ок+|ok|хорошо|ладно|понял[а]?|thanks|thank you)[.!?…]*$/i

/**
 * Чип «ошибка» плюс хотя бы одно следующее сообщение ученика с описанием —
 * этого достаточно, чтобы записать отчёт, даже если модель не поставила метку.
 * Просить «передай команде» ученику больше не нужно.
 */
export function shouldAutoReportBug(messages) {
  const list = (Array.isArray(messages) ? messages : []).filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim(),
  )
  const chipAt = lastIndexWhere(list, (m) => m.role === 'user' && isBugChipText(m.content))
  if (chipAt < 0) return false
  return list.slice(chipAt + 1).some((m) => {
    if (m.role !== 'user') return false
    const t = String(m.content).trim()
    return t.length >= 16 && !isBugChipText(t) && !THANKS_RE.test(t)
  })
}

export function fallbackBugSummary({ screenName, pageUrl, lastUserText } = {}) {
  const lines = ['Автоматически: ученик описал поломку.']
  if (screenName) lines.push(`Раздел: ${screenName}`)
  if (pageUrl) lines.push(`Адрес: ${pageUrl}`)
  if (lastUserText) lines.push(`Что произошло: ${lastUserText}`)
  return lines.join('\n')
}
