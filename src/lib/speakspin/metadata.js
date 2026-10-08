// Разбор metadata запроса «SpeakSpin». Вынесено из route.js: Next не любит
// лишние экспорты у роутов, а разбор недоверенного JSON стоит покрыть тестом.

import TOPICS from '@/practice/speakspin/topics.json'

const TOPIC_BY_ID = new Map((TOPICS?.topics || []).map((t) => [t.id, t]))
const LANGS = new Set(['en', 'ru', 'kk'])

function nonNegInt(v, max) {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null
}

function strList(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 60)) : []
}

// metadata — недоверенный JSON с клиента. Из него берём только то, что нужно,
// с потолками; тему и её сложность — из topics.json, а не из запроса.
export function parseMetadata(raw, headerKey) {
  let m
  try {
    m = JSON.parse(String(raw || ''))
  } catch {
    return { error: 'invalid_metadata' }
  }
  if (!m || typeof m !== 'object') return { error: 'invalid_metadata' }
  const attemptId = String(headerKey || m.attemptId || '').trim()
  if (!attemptId || attemptId.length > 128) return { error: 'invalid_metadata' }
  const topic = TOPIC_BY_ID.get(String(m.topicId || ''))
  if (!topic) return { error: 'unknown_topic' }
  const lang = String(m.feedbackLanguage || '').toLowerCase()
  const support = m.supportUsed && typeof m.supportUsed === 'object' ? m.supportUsed : {}
  return {
    attemptId,
    topic,
    feedbackLanguage: LANGS.has(lang) ? lang : lang === 'kz' ? 'kk' : 'ru',
    learnerLevel: typeof m.learnerLevel === 'string' && m.learnerLevel.trim() ? m.learnerLevel.trim().slice(0, 20) : null,
    mode: m.mode === 'challenge' ? 'challenge' : 'guided',
    supportUsed: {
      available: strList(support.available),
      shown: strList(support.shown),
      expanded: strList(support.expanded),
      improvedAnswerViewed: support.improvedAnswerViewed === true,
    },
    actualPreparationMs: nonNegInt(m.actualPreparationMs, 30 * 60 * 1000),
    recordingDurationMs: nonNegInt(m.recordingDurationMs, 10 * 60 * 1000),
  }
}
