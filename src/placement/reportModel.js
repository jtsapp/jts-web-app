// Отчёт теста уровня на «Главной» (решение руководителя 14.10: «после теста все данные — очень детальные отчёты —
// в этом разделе»). Чистая функция: конверт v16 → то, что рисует PlacementReport. Тексты причин и объяснений v16
// пишет сам на языке, на котором шёл тест, — их показываем как есть, переводить чужие формулировки не берёмся.

import { CEFR } from './envelope.js'
import { navForActivity } from './activityRoutes.js'
import { pickFeedback } from './speakingFeedback.js'

// Порядок плиток отчёта; его же берёт пустая карточка «теста ещё нет» — плитки на тех же местах, что после теста.
export const SKILL_ORDER = ['LU', 'R', 'L', 'S']

const cefr = (v) => (CEFR.includes(v) ? v : null)
const arr = (v) => (Array.isArray(v) ? v : [])

// Сколько ответов отличает законченный тест от брошенного, когда уровня нет: v16 в обоих случаях отдаёт overallCEFR null,
// а признака «раздел закончен» в конверте нет. Замер симулятором v16 (612 прогонов с итогом Foundation, 03.11.2026):
// грамматика 14–15 ответов (раньше 10 v16 её не останавливает, EARLY_STOP), чтение 8 (четыре текста ветки A0). Аудирование
// не считаем: его разрешено пропустить из-за проблемы со звуком.
const FOUNDATION_MIN = { LU: 10, R: 8 }

function isFoundation(a) {
  if (cefr(a.overallCEFR)) return false
  const answered = (id) => (Number.isFinite(a.skillResults?.[id]?.total) ? a.skillResults[id].total : 0)
  return answered('LU') >= FOUNDATION_MIN.LU && answered('R') >= FOUNDATION_MIN.R
}

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
    // Тест пройден, но ни один уровень не подтвердился: итог v16 «Foundation — начни с основ». Это его рекомендация, а не
    // A0, поэтому уровня в отчёте нет, но и «Не пройден» здесь неправда (жалоба с прода 03.11.2026).
    foundation: isFoundation(a),
    // partial — тест открыт до конца (чаще всего без говорения): уровень предварительный.
    partial: a.overallStatus === 'partial',
    completedAt: a.completedAt || env.host?.savedAt || null,
    skills,
    // Отзыв о говорении — в отчёте рядом с уровнем, а не отдельным итогом посреди теста (speakingFeedback.js).
    speaking: skills.find((s) => s.id === 'S').assessed ? pickFeedback(a.skillResults?.S?.feedback) : null,
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

/**
 * Целевой уровень — из профиля General English, как на баннере «Главной» и у Луны (ТЗ v2.0, «данные расходятся»:
 * на тестовом аккаунте баннер звал к B1, а блок «Цель» отчёта — к B2). v16 предлагает цель в момент теста, анкета
 * кладёт её в профиль, а потом ученик меняет цель карандашом на баннере — отчёт же хранит прежнюю. Поэтому цель
 * профиля главнее; объяснение v16 относится к его цели и при другой цели не показывается.
 */
export function withProfileGoal(view, targetLevel) {
  const goal = cefr(targetLevel)
  if (!view || !goal || goal === view.target) return view
  const rank = (lv) => CEFR.indexOf(lv)
  return {
    ...view,
    target: goal,
    targetAlreadyMet: !!view.overall && rank(view.overall) >= rank(goal),
    targetExplanation: null,
  }
}

/** Отчёт для «Главной» или null — тест не пройден: попытки нет либо тест брошен раньше, чем v16 определил хоть что-то. */
export function homeReport(env, lang = 'ru') {
  const view = reportView(env, lang)
  return view && (view.overall || view.foundation) ? view : null
}
