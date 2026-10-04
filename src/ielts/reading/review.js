// Разбор сданной попытки: строки вопросов из документа + вердикта сервера, фильтры и сводка (Figma «7 · Reading —
// разбор»). Чистые функции — экран только рисует.
import { categoryOf } from './meta.js'
import { flattenItems } from './run.js'
import { flatDoc } from '../listening/listening.js'

export const SLOW_SEC = 90

export function reviewRows(attempt) {
  // у Listening вопросы лежат в частях — разбор идёт по тому же сквозному списку, что и прохождение
  const raw = attempt?.document || {}
  const doc = raw.parts ? flatDoc(raw) : raw
  const verdicts = Object.fromEntries((attempt?.result?.items || []).map((r) => [r.itemId, r]))
  return flattenItems(doc).map((e) => {
    const v = verdicts[e.id] || {}
    const given = attempt?.answers?.[e.id]
    const status = v.correct ? 'ok' : v.spellingOnly ? 'spelling' : v.score > 0 ? 'partial' : given == null ? 'empty' : 'wrong'
    return { ...e, verdict: v, given, status }
  })
}

export function filterRows(rows, filter) {
  if (filter === 'wrong') return rows.filter((r) => r.status !== 'ok')
  if (filter === 'spelling') return rows.filter((r) => r.status === 'spelling')
  return rows
}

export function reviewSummary(attempt, rows) {
  const a = attempt?.attempt || {}
  return {
    raw: a.rawScore ?? 0,
    max: a.maxScore ?? 0,
    accuracy: a.maxScore ? Math.round((a.rawScore / a.maxScore) * 100) : 0,
    timeSec: a.timeSec ?? null,
    slow: rows.filter((r) => (r.verdict.timeSec || 0) > SLOW_SEC).length,
    // по номерам, как итог «9 из 13»: у choose-TWO с одной верной буквой неверен один номер из двух
    all: rows.reduce((n, r) => n + r.numbers.length, 0),
    wrong: rows.reduce((n, r) => (r.status === 'ok' ? n : n + Math.max(1, r.numbers.length - (r.verdict.score || 0))), 0),
    spelling: rows.filter((r) => r.status === 'spelling').length,
    band: a.band ?? null,
  }
}

// «Потренировать слабое»: типы, где были ошибки, — по убыванию числа ошибок.
export function weakCategories(rows) {
  const n = {}
  for (const r of rows) if (r.status !== 'ok') n[categoryOf(r.type)] = (n[categoryOf(r.type)] || 0) + 1
  return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

export function formatGiven(given) {
  if (Array.isArray(given)) return given.join(', ')
  return given == null || given === '' ? null : String(given)
}
