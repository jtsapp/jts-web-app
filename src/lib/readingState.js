// Прогресс «Чтения» {texts: {<id>: {ex: {<i>: {score, total}}, done}}} — чистые
// правила, общие для клиента и сервера: ни БД, ни DOM, ни сети.
//
// Почему слияние, а не замена. До 05.10.2026 клиент слал состояние целиком
// (replace), собранное из localStorage. Когда хранилище забивал кэш каталогов,
// запись в него молча не проходила, и каждое «Проверить» отправляло «старое +
// одно задание»: на сервере оставалось только последнее, а итог показывал 0 %.
// Теперь сервер сливает по заданию «лучший результат» (та же семантика, что у
// пересдачи в прототипе), и никакая отправка не может уменьшить сохранённое.

export const READING_LIMITS = { texts: 1000, idLen: 64, exIndex: 49, total: 1000 }

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Вход с клиента → чистая форма или null (тогда роут отвечает 400). Лишние поля
 * отбрасываем, а не храним: jsonb-колонку читают профиль и квоты, и мусор в ней
 * переживёт любой клиент.
 */
export function sanitizeReadingState(raw) {
  if (!isObj(raw)) return null
  const texts = raw.texts === undefined ? {} : raw.texts
  if (!isObj(texts)) return null
  const ids = Object.keys(texts)
  if (ids.length > READING_LIMITS.texts) return null
  const out = {}
  for (const id of ids) {
    if (!id || id.length > READING_LIMITS.idLen) return null
    const t = texts[id]
    if (!isObj(t)) return null
    const ex = t.ex === undefined ? {} : t.ex
    if (!isObj(ex)) return null
    if (t.done !== undefined && typeof t.done !== 'boolean') return null
    const cleanEx = {}
    for (const k of Object.keys(ex)) {
      if (!/^\d+$/.test(k) || Number(k) > READING_LIMITS.exIndex) return null
      const rec = ex[k]
      if (!isObj(rec)) return null
      const { score, total } = rec
      if (!Number.isInteger(score) || !Number.isInteger(total)) return null
      if (score < 0 || score > total || total > READING_LIMITS.total) return null
      cleanEx[k] = { score, total }
    }
    out[id] = { ex: cleanEx, done: t.done === true }
  }
  return { texts: out }
}

/**
 * existing ⊕ incoming: по каждому заданию — запись с большим счётом (при
 * равенстве входящая: так обновляется total, если текст в данных поменялся);
 * done только включается. Монотонно и идемпотентно — поэтому порядок прихода
 * ответов и повторы отправок ничего не портят.
 */
export function mergeReadingState(existing, incoming) {
  const a = isObj(existing) && isObj(existing.texts) ? existing.texts : {}
  const b = isObj(incoming) && isObj(incoming.texts) ? incoming.texts : {}
  const texts = {}
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = isObj(a[id]) ? a[id] : {}
    const y = isObj(b[id]) ? b[id] : {}
    const ex = { ...(isObj(x.ex) ? x.ex : {}) }
    for (const [k, rec] of Object.entries(isObj(y.ex) ? y.ex : {})) {
      const prev = ex[k]
      if (!prev || rec.score >= prev.score) ex[k] = rec
    }
    texts[id] = { ex, done: !!(x.done || y.done) }
  }
  return { texts }
}

/** Что в next строго лучше, чем в base, — дельта для досылки; null, если нечего. */
export function readingDelta(base, next) {
  const a = isObj(base) && isObj(base.texts) ? base.texts : {}
  const out = {}
  for (const [id, y] of Object.entries(isObj(next) && isObj(next.texts) ? next.texts : {})) {
    const x = isObj(a[id]) ? a[id] : {}
    const ex = {}
    for (const [k, rec] of Object.entries(isObj(y.ex) ? y.ex : {})) {
      const prev = isObj(x.ex) ? x.ex[k] : undefined
      if (!prev || rec.score > prev.score) ex[k] = rec
    }
    const done = !!y.done && !x.done
    if (Object.keys(ex).length || done) out[id] = done ? { ex, done: true } : { ex }
  }
  return Object.keys(out).length ? { texts: out } : null
}
