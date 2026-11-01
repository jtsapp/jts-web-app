// Прогресс коротких тренировок Writing и очередь «Повторить ошибки» — на сервере (/mobile/ielts/drills/…, /review;
// контракт IELTS Writing §5): строка списка знает число проходов и лучший процент, ошибка раунда ждёт повторения по
// (testId, roundId) на любом устройстве. Без связи или без входа (401) — как раньше, на устройстве: проходы и лучший
// счёт в localStorage. Прежний прогресс устройства (`jts_ielts_wdrills_v1`) один раз уезжает на сервер (import).
import { useCallback, useEffect, useState } from 'react'
import { getIeltsDrillProgress, getIeltsReview, importIeltsDrillProgress, postIeltsDrillRun, resolveIeltsReview } from '../../../api.js'
import { loadToken } from '../../../lib/session.js'

const KEY = 'jts_ielts_wdrills_v1'
const MIGRATED = 'jts_ielts_wdrills_v1_migrated'
// изменилась очередь ошибок — карточка «Повторить ошибки (N)» перечитывает счёт
const REVIEW_EVENT = 'jts-ielts-review-changed'

export function loadDrillProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

/** Новый прогресс после прохода (чистая функция): проходы +1, лучший — по доле верных. */
export function withRun(progress, id, score, total) {
  const prev = progress?.[id]
  const better = !prev || (total > 0 && (!prev.total || score / total > prev.best / prev.total))
  return {
    ...(progress || {}),
    [id]: { runs: (prev?.runs || 0) + 1, best: better ? score : prev.best, total: better ? total : prev.total, at: new Date().toISOString() },
  }
}

/** Записать проход на устройстве и вернуть новый прогресс; без хранилища (приватное окно) — только в памяти экрана. */
export function recordDrillRun(id, score, total) {
  const next = withRun(loadDrillProgress(), id, score, total)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* не запомнится — не беда */
  }
  return next
}

/** Строки сервера [{testId, best, runs, at}] → прогресс списка { [id]: { runs, best, total: 100, at } } (best — %). */
export function progressFromServer(rows) {
  const out = {}
  for (const r of Array.isArray(rows) ? rows : []) if (r?.testId) out[r.testId] = { runs: Number(r.runs) || 0, best: Number(r.best) || 0, total: 100, at: r.at || null }
  return out
}

/** Прогресс устройства → строки импорта: лучший — в процентах; пробные дриллы на сервер не едут (их нет в банке). */
export function importItems(local) {
  return Object.entries(local || {})
    .filter(([id, p]) => id && !id.startsWith('WD-SAMPLE-') && p && Number(p.runs) > 0)
    .map(([testId, p]) => ({ testId, runs: Number(p.runs), best: p.total > 0 ? Math.round((Number(p.best) / Number(p.total)) * 100) : 0, at: p.at || null }))
}

const migrated = () => {
  try {
    return localStorage.getItem(MIGRATED) === '1'
  } catch {
    return true
  }
}

/** Разовый перенос прогресса устройства на сервер; после ответа — отметка, второй раз не шлём. */
export async function migrateLocalProgress(token) {
  if (!token || migrated()) return false
  const items = importItems(loadDrillProgress())
  if (items.length) await importIeltsDrillProgress(token, items)
  try {
    localStorage.setItem(MIGRATED, '1')
  } catch {
    /* повторим в следующий раз — сервер сливает max/sum, но повтор не страшнее потери */
  }
  return items.length > 0
}

/**
 * Прогресс дриллов для списка: сервер (после разового импорта), без связи / без входа — устройство. Пробные дриллы
 * считаются только на устройстве и подмешиваются к серверным.
 */
export async function fetchDrillProgress(token) {
  const local = loadDrillProgress()
  if (!token) return local
  try {
    await migrateLocalProgress(token).catch(() => null)
    const server = progressFromServer(await getIeltsDrillProgress(token))
    const samples = Object.fromEntries(Object.entries(local).filter(([id]) => id.startsWith('WD-SAMPLE-')))
    return { ...samples, ...server }
  } catch {
    return local
  }
}

/** Хук хаба: прогресс дриллов (сначала устройство, затем сервер); второй элемент — запись после прохода. */
export function useDrillProgress(token) {
  const [progress, setProgress] = useState(loadDrillProgress)
  useEffect(() => {
    let alive = true
    fetchDrillProgress(token || loadToken()).then((p) => alive && setProgress(p))
    return () => {
      alive = false
    }
  }, [token])
  return [progress, setProgress]
}

export const notifyReviewChanged = () => {
  try {
    window.dispatchEvent(new Event(REVIEW_EVENT))
  } catch {
    /* без window (SSR) — некому слушать */
  }
}

/**
 * Записать проход. Пробный дрилл — только устройство. Иначе сервер (pct, ошибки в очередь повторения, верные — из
 * неё); не вышло — устройство. source 'attempt' — упражнения разбора, testId = id попытки.
 * Возвращает строку прогресса { runs, best, total, at } этого testId.
 */
export async function recordRun(token, testId, { pct, score, total, wrong = [], right = [], source = 'drill', sample = false }) {
  if (!sample && token) {
    try {
      const r = await postIeltsDrillRun(token, testId, { pct, wrong, right, source })
      notifyReviewChanged()
      return { runs: Number(r?.runs) || 1, best: Number(r?.best ?? pct) || 0, total: 100, at: r?.at || null }
    } catch {
      /* без связи — проход запомнится на устройстве */
    }
  }
  return recordDrillRun(testId, score, total)[testId]
}

/** Убрать раунды из очереди ошибок (верный ответ в «Повторить ошибки»); сбой — раунд просто останется в очереди. */
export function resolveReview(token, items) {
  if (!token || !items?.length) return Promise.resolve()
  return resolveIeltsReview(token, items)
    .then(notifyReviewChanged)
    .catch(() => null)
}

/** Очередь ошибок сервера: [{ testId, roundId, source, addedAt }], новые сверху; без связи — пусто. */
export function fetchReview(token) {
  if (!token) return Promise.resolve([])
  return getIeltsReview(token)
    .then((r) => (Array.isArray(r) ? r : []))
    .catch(() => [])
}

/** Счёт очереди «Повторить ошибки» для хаба; перечитывается после прохода и повторения. */
export function useIeltsReviewCount(token) {
  const [count, setCount] = useState(0)
  const reload = useCallback(() => {
    let alive = true
    fetchReview(token || loadToken()).then((r) => alive && setCount(r.length))
    return () => {
      alive = false
    }
  }, [token])
  useEffect(() => {
    const stop = reload()
    const on = () => reload()
    window.addEventListener(REVIEW_EVENT, on)
    return () => {
      stop()
      window.removeEventListener(REVIEW_EVENT, on)
    }
  }, [reload])
  return { count, reload }
}

/**
 * Проверка мини-эссе ИИ (дрилл с aiCheck): серверный роут /api/ielts/writing/mini, дневная квота. Ответ —
 * { verdict: [{ item, ok, note }], summary, better }; ошибка несёт code: 'quota' (429) и прочие.
 */
export async function checkMiniEssay(token, { testId, roundId, text, uiLang }) {
  let res
  try {
    res = await fetch('/api/ielts/writing/mini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ testId, roundId, text, uiLang }),
    })
  } catch {
    throw Object.assign(new Error('network'), { code: 'network' })
  }
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.ok) {
    const code = res.status === 429 || body?.error === 'quota' ? 'quota' : body?.error || `http_${res.status}`
    throw Object.assign(new Error(code), { status: res.status, code })
  }
  return body
}
