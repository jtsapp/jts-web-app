// Корзина, пришедшая ссылкой: «Купить» на странице тарифов сайта или
// «Оплатить картой» в приложении, которое уводит оплату на домен лендинга.
//
// Адрес — ?screen=pricing&offer=<код>[:кол-во][,<код>[:кол-во]…]. Гостю до оплаты
// надо войти, а адрес к тому времени уже вычищен. Поэтому строки лежат в
// sessionStorage вкладки, пока витрина не положит их в корзину, — один раз:
// иначе они возвращались бы в корзину на каждом заходе.

const KEY = 'jts_pending_offer'
const LINE = /^([A-Za-z0-9_-]{1,64})(?::(\d{1,2}))?$/
const MAX_LINES = 10
const MAX_QTY = 20

/** Строка адреса → [{code, qty}]; кривое молча отбрасывается. */
export function parseOfferParam(raw) {
  if (typeof raw !== 'string' || !raw) return []
  const lines = []
  for (const part of raw.split(',').slice(0, MAX_LINES)) {
    const m = LINE.exec(part.trim())
    if (!m) continue
    const qty = Math.min(MAX_QTY, Math.max(1, Number(m[2] || 1)))
    if (!lines.some((l) => l.code === m[1])) lines.push({ code: m[1], qty })
  }
  return lines
}

export function rememberPendingOffer(raw) {
  const lines = parseOfferParam(raw)
  if (!lines.length) return
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    /* приватный режим — корзина просто не подставится */
  }
}

/** Забрать корзину и забыть её: [{code, qty}], пусто — []. */
export function consumePendingOffer() {
  const lines = peekPendingOffer()
  clearPendingOffer()
  return lines
}

/** Посмотреть, не забирая (для начального состояния: StrictMode зовёт его дважды). */
export function peekPendingOffer() {
  try {
    const lines = JSON.parse(window.sessionStorage.getItem(KEY) || '[]')
    return Array.isArray(lines)
      ? parseOfferParam(lines.map((l) => `${l?.code}:${l?.qty}`).join(','))
      : []
  } catch {
    return []
  }
}

export function clearPendingOffer() {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    /* нечего чистить */
  }
}
