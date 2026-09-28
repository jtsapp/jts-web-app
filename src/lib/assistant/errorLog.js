// Кольцо последних сбоев вкладки: помощник видит, ЧТО сломалось и ГДЕ,
// даже если ученик напишет только «ошибка». Не шлём на сервер сами — только
// вместе с вопросом в чат, и только последние несколько штук.
//
// Ловим window.error и unhandledrejection. Сетевые 4xx/5xx сюда не пишем:
// их слишком много (отменённый fetch, 401 на протухшем токене), и они
// забили бы кольцо настоящей поломкой рендера.

export const MAX_ERRORS = 8
export const MAX_MESSAGE = 400
export const MAX_STACK = 1200

let buf = []
let installed = false

function clip(s, n) {
  const str = String(s ?? '').trim()
  if (!str) return ''
  return str.length > n ? `${str.slice(0, n)}…` : str
}

/** @param {{ message?: string, source?: string, url?: string, stack?: string, at?: number }} entry */
export function recordError(entry) {
  const message = clip(entry?.message, MAX_MESSAGE)
  if (!message) return
  buf.push({
    at: Number(entry?.at) || Date.now(),
    message,
    source: clip(entry?.source, 200),
    url: clip(entry?.url, 400),
    stack: clip(entry?.stack, MAX_STACK),
  })
  if (buf.length > MAX_ERRORS) buf = buf.slice(-MAX_ERRORS)
}

export function recentErrors() {
  return buf.map((e) => ({ ...e }))
}

/** Только для тестов. */
export function resetErrorLog() {
  buf = []
  installed = false
}

export function installErrorLog() {
  if (typeof window === 'undefined' || installed) return
  installed = true
  window.addEventListener('error', (e) => {
    recordError({
      at: Date.now(),
      message: e.message || String(e.error || 'error'),
      source: e.filename ? `${e.filename}:${e.lineno || 0}:${e.colno || 0}` : 'window.error',
      url: typeof location !== 'undefined' ? location.href : '',
      stack: e.error?.stack,
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    recordError({
      at: Date.now(),
      message: r?.message || String(r || 'unhandledrejection'),
      source: 'unhandledrejection',
      url: typeof location !== 'undefined' ? location.href : '',
      stack: r?.stack,
    })
  })
}
