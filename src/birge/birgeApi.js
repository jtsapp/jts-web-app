import { API_BASE } from '../lib/apiBase.js'
import { reportUnauthorized } from '../lib/session.js'

// Клиент ручек ученика Birge — /mobile/birge/** (спека 2026-11-11 §5.1, формы §5.3). Свой, а не общие
// authGet/authPost из api.js: отказ 429 несёт retryAfterSec («попробуйте через N мин»), а общий разбор тела
// (rejectionText в api.js) оставляет от него только текст. Имена полей контракта не переименовываем: по ним
// параллельно пишутся бэкенд и web-admin.
//
// Адрес — из lib/apiBase.js, а не из api.js: компоненты в тестах мокают модули целиком, и импорт адреса из api.js
// падал бы на «нет такого экспорта» (та же причина, что записана в apiBase.js).

export class BirgeApiError extends Error {
  constructor(status, body) {
    // Отказы бэкенда — тело GlobalExceptionHandler { messages: ["…"] } (§5, так же их читает rejectionText в api.js);
    // исключение — 429 со своим телом { error, retryAfterSec, message } (§3.7, §5.3), отсюда запасное body.message.
    const text = (Array.isArray(body?.messages) ? body.messages[0] : null) ?? body?.message
    const message = typeof text === 'string' && text.trim() ? text.trim() : null
    super(message || `Ошибка сервера (${status})`)
    this.name = 'BirgeApiError'
    // 0 — запрос до сервера не дошёл (нет сети)
    this.status = status
    // RATE_LIMIT у 429 (§3.7); у остальных отказов поля error в контракте нет
    this.code = typeof body?.error === 'string' ? body.error : null
    this.retryAfterSec = typeof body?.retryAfterSec === 'number' ? body.retryAfterSec : null
    this.serverMessage = message
  }
}

async function request(path, token, { method = 'GET', json, form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  // У multipart заголовок с границей ставит сам браузер — свой Content-Type его сломал бы.
  if (json !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`${API_BASE}/mobile/birge${path}`, {
      method,
      headers,
      body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    })
  } catch {
    throw new BirgeApiError(0, { message: 'Нет связи с сервером.' })
  }
  if (!res.ok) {
    // 401 с токеном — возможно, кончилась сессия: разбор и плашку делает lib/session.js
    if (res.status === 401) reportUnauthorized(token)
    throw new BirgeApiError(res.status, await res.json().catch(() => null))
  }
  if (res.status === 204) return null
  return res.json().catch(() => null)
}

/** Список с курсором (§5.3): { items, nextCursor }, nextCursor: null — конец ленты. */
function page(data) {
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    nextCursor: typeof data?.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null,
  }
}

/** Лента: опубликованные ветки и свои непубличные, по 20, новые сверху. topic: null — все темы. */
export function listBirgePosts(token, { topic = null, cursor = null } = {}) {
  const query = new URLSearchParams()
  if (topic) query.set('topic', topic)
  if (cursor) query.set('cursor', cursor)
  const qs = query.toString()
  return request(`/posts${qs ? `?${qs}` : ''}`, token).then(page)
}

/** Ветка и комментарии: { thread, comments }. Нет доступа — 404. */
export function getBirgeThread(token, id) {
  return request(`/posts/${encodeURIComponent(id)}`, token).then((data) => ({
    thread: data?.thread ?? null,
    comments: Array.isArray(data?.comments) ? data.comments : [],
  }))
}

/**
 * Фото уходит на проверку сразу при выборе, а не при публикации (§3.1): { id, width, height }. Загрузки — под тем же
 * антиспамом, что публикации (§3.7): 429 с тем же телом, retryAfterSec разбирается так же.
 */
export function uploadBirgeMedia(token, blob, filename = 'photo.jpg') {
  const form = new FormData()
  form.append('file', blob, filename)
  return request('/media', token, { method: 'POST', form })
}

/** Публикация ветки или комментария → PublishResponse (§5.3). */
export function publishBirgePost(token, body) {
  return request('/posts', token, { method: 'POST', json: body })
}

/** Лайк (POST) или снять его (DELETE) → { liked, likes }. */
export function setBirgeLike(token, id, liked) {
  return request(`/posts/${encodeURIComponent(id)}/like`, token, { method: liked ? 'POST' : 'DELETE' })
}

/** Жалоба → { reports, hidden }. Свой пост — 403, повтор — 409. */
export function reportBirgePost(token, id, reason = null) {
  return request(`/posts/${encodeURIComponent(id)}/report`, token, { method: 'POST', json: { reason } })
}

/** 404 на ленте — бэкенд без раздела: экран пишет «Раздел скоро откроется», а не ошибку (§7). */
export const isSectionMissing = (err) => err?.status === 404
