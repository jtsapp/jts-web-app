import { reportLang } from './labels.js'

// Разбор ответа ручек отчёта (контракт — спека 2026-10-20, §3). Терпим к
// пропускам, как comicsShape.js: веб вышел раньше бэкенда, и первая версия
// ручек почти наверняка разойдётся с контрактом в мелочах — отчёт должен
// показаться с тем, что пришло, а не упасть белым листом.

export const SKILL_KEYS = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary']
const GOAL_RESULTS = ['achieved', 'partly', 'not']

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
// null и '' — «числа нет»: Number(null) дал бы 0, то есть «0% домашек».
const int = (v) => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])
const score = (v) => {
  const n = int(v)
  return n != null && n >= 1 && n <= 5 ? n : null
}

// Шесть навыков всегда и в порядке прототипа: полосы стоят друг под другом, и
// пропавший или переставленный навык читался бы как другой.
function skills(raw) {
  const byKey = new Map()
  if (Array.isArray(raw)) {
    for (const s of raw) if (s && typeof s.key === 'string') byKey.set(s.key.toLowerCase(), s)
  }
  return SKILL_KEYS.map((key) => {
    const s = byKey.get(key) || {}
    return { key, score: score(s.score), prev: score(s.prev) }
  })
}

function attendance(raw) {
  const done = int(raw?.done)
  const planned = int(raw?.planned)
  return done != null && planned != null && planned > 0 ? { done, planned } : null
}

function percent(v) {
  const n = int(v)
  return n != null && n >= 0 && n <= 100 ? n : null
}

export function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id ?? null,
    periodNo: int(raw.periodNo),
    periodStart: str(raw.periodStart),
    periodEnd: str(raw.periodEnd),
    lang: reportLang(raw.lang),
    studentName: str(raw.studentName) || '',
    teacherName: str(raw.teacherName),
    level: str(raw.level),
    format: raw.format === 'group' ? 'group' : 'individual',
    groupName: str(raw.groupName),
    unitsText: str(raw.unitsText),
    attendance: attendance(raw.attendance),
    homeworkPct: percent(raw.homeworkPct),
    skills: skills(raw.skills),
    strengths: strList(raw.strengths),
    improvements: strList(raw.improvements),
    motivation: str(raw.motivation),
    badges: Array.isArray(raw.badges)
      ? raw.badges.filter((b) => b && typeof b.type === 'string').map((b) => ({ type: b.type, n: int(b.n) }))
      : [],
    pastGoals: Array.isArray(raw.pastGoals)
      ? raw.pastGoals
        .map((g) => ({ text: str(g?.text), result: GOAL_RESULTS.includes(g?.result) ? g.result : null }))
        .filter((g) => g.text)
      : [],
    nextGoals: strList(raw.nextGoals),
    plan: str(raw.plan),
    publishedAt: str(raw.publishedAt),
    seenAt: str(raw.seenAt),
  }
}

const time = (iso) => (iso ? Date.parse(iso) || 0 : 0)

export function normalizeReportList(raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return arr
    .filter((r) => r && r.id != null)
    .map((r) => ({
      id: r.id,
      periodNo: int(r.periodNo),
      periodStart: str(r.periodStart),
      periodEnd: str(r.periodEnd),
      level: str(r.level),
      teacherName: str(r.teacherName),
      publishedAt: str(r.publishedAt),
      seenAt: str(r.seenAt),
    }))
    .sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
}
