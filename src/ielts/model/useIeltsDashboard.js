import { useCallback, useEffect, useState } from 'react'
import { getBalance, getIeltsProfile } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { SAMPLE_DASHBOARD } from './sampleDashboard.js'

// Данные главного экрана IELTS. Форма ответа (всё, кроме plan, может быть null
// — «ещё не знаем», экран это показывает честно, а не нулём):
//
//   streakDays   число дней подряд              ← GET /mobile/balance/info (уже есть)
//   xp, level    очки и уровень раздела         ← бэкенд IELTS (будет)
//   targetBand   цель ученика из онбординга     ← бэкенд IELTS (будет)
//   overall      общий band (диагностика/mock)  ← бэкенд IELTS (будет)
//   bands        { listening, reading, writing, speaking }
//   forecast     { date, band } — прогноз на дату экзамена (§11, блок 3)
//   examDate     дата экзамена, ISO
//   startDate    начало подготовки — от него считаются фазы roadmap
//   lessonToday  { time: 'HH:MM' } — урок с преподавателем сегодня
//   roadmap      { currentPhase: 1..4, phases: [{ milestonesDone, milestonesTotal, eta }] }
//   vocabDue     слов к повторению
//   plan         задачи дня (см. starterPlan)
//
// Когда появится эндпоинт раздела, он подключается в fetchIeltsDashboard ниже
// — экран и компоненты трогать не придётся: они уже рисуют каждое поле и его
// отсутствие.
export const EMPTY_DASHBOARD = {
  streakDays: null,
  xp: null,
  level: null,
  targetBand: null,
  overall: null,
  bands: { listening: null, reading: null, writing: null, speaking: null },
  forecast: null,
  examDate: null,
  startDate: null,
  lessonToday: null,
  roadmap: null,
  vocabDue: null,
  plan: null,
  profile: null,
}

// Стартовый план, пока план не строит бэкенд (§11): по задаче на секцию плюс
// словарь — каждая ведёт в уже работающий экран. `target` — ключ экрана App.
export function starterPlan(t) {
  return [
    {
      id: 'listening',
      section: 'listening',
      title: t('ieltsHub.plan.listening.title'),
      reason: t('ieltsHub.plan.listening.reason'),
      minutes: 15,
      target: 'ielts-listening',
    },
    {
      id: 'reading',
      section: 'reading',
      title: t('ieltsHub.plan.reading.title'),
      reason: t('ieltsHub.plan.reading.reason'),
      minutes: 20,
      // Reading уже на новом движке: задача ведёт в список текстов «Обучения», а не в прежний экран секции
      target: 'ielts-reading',
    },
    {
      id: 'writing',
      section: 'writing',
      title: t('ieltsHub.plan.writing.title'),
      reason: t('ieltsHub.plan.writing.reason'),
      minutes: 40,
      target: 'ielts-writing',
    },
    {
      id: 'speaking',
      section: 'speaking',
      title: t('ieltsHub.plan.speaking.title'),
      reason: t('ieltsHub.plan.speaking.reason'),
      minutes: 10,
      target: 'ielts-speaking',
    },
    {
      id: 'vocab',
      section: 'vocab',
      title: t('ieltsHub.plan.vocab.title'),
      reason: t('ieltsHub.plan.vocab.reason'),
      minutes: 5,
      target: 'vocab',
    },
  ]
}

// Точка подключения бэкенда раздела. Сейчас отсюда приходит только серия дней
// — её уже считает общий баланс приложения (тот же, что в сайдбаре).
async function fetchIeltsDashboard(token) {
  const authToken = token || loadToken()
  if (!authToken) return {}
  const [balance, profile] = await Promise.all([getBalance(authToken).catch(() => null), getIeltsProfile(authToken).catch(() => null)])
  const b = profile?.bands || null
  // цель, дата и стартовые баллы — из профиля IELTS (онбординг и диагностика); W/S до ИИ-оценки — null, не ноль
  return {
    streakDays: balance?.streak ?? null,
    profile,
    targetBand: profile?.targetBand ?? null,
    examDate: profile?.examDate ?? null,
    startDate: profile?.onboardedAt ? String(profile.onboardedAt).slice(0, 10) : null,
    overall: b?.overall ?? null,
    bands: { listening: b?.listening ?? null, reading: b?.reading ?? null, writing: b?.writing ?? null, speaking: b?.speaking ?? null },
  }
}

// ?ieltsSample=1 — экран с данными макета: показать, как он выглядит у
// ученика с историей, пока бэкенда нет. Читается в эффекте, а не при рендере,
// иначе SSR и клиент разойдутся (см. диплинк ?screen= в App.jsx).
function wantsSample() {
  try {
    return new URLSearchParams(window.location.search).get('ieltsSample') === '1'
  } catch {
    return false
  }
}

export function useIeltsDashboard(token) {
  const [data, setData] = useState(EMPTY_DASHBOARD)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    const load = wantsSample() ? Promise.resolve(SAMPLE_DASHBOARD) : fetchIeltsDashboard(token)
    load.then((patch) => {
      if (alive) setData({ ...EMPTY_DASHBOARD, ...patch })
    })
    return () => {
      alive = false
    }
  }, [token, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, reload }
}
