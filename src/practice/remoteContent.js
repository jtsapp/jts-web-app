// Загрузчик материалов «Практики»: сначала бэкенд, потом статика.
//
// Материалы раздел за разделом переезжают из public/practice/** в админку
// (бэкенд + MinIO, docs/superpowers/specs/2026-10-21-practice-content-to-admin-design.md).
// Код сайта на деве и проде один, а пакет на прод заливают позже, чем
// выкатывают сайт, — поэтому, пока у раздела на стенде пусто (404, пустой
// список) или бэкенд молчит, раздел обязан работать как раньше, со статики.
// После проверки прода раздел чистят: статику удаляют и зовут загрузчик с
// staticUrl = null — тогда неудача бэкенда честно становится ошибкой экрана.
import { API_BASE } from '../lib/apiBase.js'

// Дольше ждать нельзя: ученик смотрит на «Загрузка…», а статика рядом.
export const REMOTE_TIMEOUT_MS = 8000

export async function loadPracticeContent(section, path, staticUrl, opts = {}) {
  const { fetchImpl = globalThis.fetch, base = API_BASE, timeoutMs = REMOTE_TIMEOUT_MS } = opts
  const remote = await tryRemote(`${base}/practice-content/${section}/${path}`, fetchImpl, timeoutMs)
  if (remote) {
    console.info(`[practice] ${section}/${path} ← api`)
    return { data: remote, source: 'api' }
  }
  if (staticUrl == null) throw new Error(`practice content unavailable: ${section}/${path}`)
  const res = await fetchImpl(staticUrl)
  if (!res.ok) throw new Error('bad status ' + res.status)
  const data = await res.json()
  console.info(`[practice] ${section}/${path} ← static`)
  return { data, source: 'static' }
}

// null — «у бэкенда нет»: любая неудача, пустой список, не массив. Пустой
// список — не «в разделе нет заданий», а «на этом стенде пакет ещё не залит».
async function tryRemote(url, fetchImpl, timeoutMs) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const res = await fetchImpl(url, ctrl ? { signal: ctrl.signal } : undefined)
    if (!res || !res.ok) return null
    const data = await res.json()
    return Array.isArray(data) && data.length ? data : null
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
