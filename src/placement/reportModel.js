// Отчёт теста уровня на «Главной» (решение руководителя 14.10: «после теста все данные — очень детальные отчёты —
// в этом разделе»). Чистая функция: конверт v16 → то, что рисует PlacementReport. Тексты причин и объяснений v16
// пишет сам на языке, на котором шёл тест, — их показываем как есть, переводить чужие формулировки не берёмся.

import { CEFR } from './envelope.js'
import { navForActivity } from './activityRoutes.js'

const SKILL_ORDER = ['LU', 'R', 'L', 'S']

const cefr = (v) => (CEFR.includes(v) ? v : null)
const arr = (v) => (Array.isArray(v) ? v : [])

function skillRow(id, r) {
  if (id === 'S') {
    const done = r?.status === 'completed' && cefr(r.level)
    return { id, level: done ? r.level : null, assessed: !!done, confirmed: null, total: null, correct: null }
  }
  const total = Number.isFinite(r?.total) ? r.total : null
  const correct = Number.isFinite(r?.correct) ? r.correct : null
  return {
    id,
    level: cefr(r?.level),
    assessed: !!cefr(r?.level),
    // confirmed === false — v16 сам сомневается в уровне (мало ответов, разброс): так и пишем ученику.
    confirmed: r?.confirmed === false ? false : r?.confirmed === true ? true : null,
    total,
    correct,
    percent: total ? Math.round((100 * (correct || 0)) / total) : null,
  }
}

export function reportView(env, lang = 'ru') {
  if (!env?.assessment) return null
  const a = env.assessment
  const rec = env.recommendations || {}
  const skills = SKILL_ORDER.map((id) => skillRow(id, a.skillResults?.[id]))
  const label = env.host?.goalLabel
  return {
    attemptId: a.attemptId,
    overall: cefr(a.overallCEFR),
    // partial — тест открыт до конца (чаще всего без говорения): уровень предварительный.
    partial: a.overallStatus === 'partial',
    completedAt: a.completedAt || env.host?.savedAt || null,
    skills,
    flags: arr(a.flags).filter((f) => typeof f === 'string'),
    goal: env.goals?.primaryGoal ? (label?.[lang] || label?.ru || null) : null,
    target: cefr(rec.targetCEFR),
    targetAlreadyMet: rec.targetAlreadyMet === true,
    targetExplanation: typeof rec.targetExplanation === 'string' ? rec.targetExplanation : null,
    priorities: arr(rec.prioritySkills)
      .filter((p) => p && typeof p.title === 'string')
      .slice(0, 4)
      .map((p) => ({ id: p.id, title: p.title, reason: p.reason || '', note: p.note || '' })),
    activities: arr(rec.recommendedActivities)
      .filter((r) => r && typeof r.title === 'string')
      .slice(0, 4)
      .map((r) => ({
        id: r.activityId || r.id,
        title: r.title,
        level: cefr(r.practiceLevel),
        minutes: Number.isFinite(r.minutes) ? r.minutes : null,
        reason: r.reason || r.explanation || '',
        path: arr(r.navigation?.selectionPath).filter((s) => typeof s === 'string'),
        nav: navForActivity(r),
      })),
  }
}
