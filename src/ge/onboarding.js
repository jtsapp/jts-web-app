// Анкета General English на «Главной» (спека 2026-10-12, секция 1): шаги, наборы ответов, рекомендованная цель и тело
// PUT /mobile/ge/profile. Наборы обязаны совпадать с GeProfileRules бэкенда — иначе 400 на собственное значение.

import { TILE_LEVELS, canSetGoal, rankOf } from './route.js'

// Картинки — из онбординга IELTS (public/ielts/onboarding/): своего макета у General English нет (решение 12.10.2026).
export const PURPOSES = [
  { id: 'work', img: 'work', recommend: 'B2' },
  { id: 'travel', img: 'abroad', recommend: 'B1' },
  { id: 'study', img: 'study', recommend: 'B2' },
  { id: 'self', img: 'school', recommend: 'B1' },
]
export const WINDOWS = ['1-3m', '3-6m', '6-12m', 'none']
export const DAILY = [15, 30, 60, 90]
export const DAILY_DEFAULT = 30
export const START_MODES = ['zero', 'some', 'known']

/** Шаги: правка — только цель, срок и время; с известным уровнем вопроса «знаете свой уровень?» нет. */
export function stepsFor({ levelKnown, edit }) {
  if (edit) return ['target', 'deadline', 'daily']
  return levelKnown ? ['purpose', 'target', 'deadline', 'daily'] : ['purpose', 'target', 'deadline', 'daily', 'start']
}

/** Плитки цели A0…C1: A0 и всё не выше текущего уровня неактивны, с пометкой «ваш уровень» / «пройдено». */
export function targetTiles(level) {
  const cur = level == null ? -1 : rankOf(level)
  return TILE_LEVELS.map((code, i) => ({
    code,
    enabled: i > 0 && i > cur,
    mark: i === cur ? 'current' : i < cur ? 'passed' : null,
  }))
}

/** Рекомендованная цель по «зачем»; если она не выше уровня — следующий за ним (не выше C1). */
export function recommendedTarget(purpose, level) {
  if (!canSetGoal(level)) return null
  const base = PURPOSES.find((p) => p.id === purpose)?.recommend || 'B1'
  const cur = level == null ? -1 : rankOf(level)
  if (rankOf(base) > cur) return base
  return TILE_LEVELS[cur + 1] || null
}

export function stepReady(key, f) {
  switch (key) {
    case 'purpose':
      return !!f.purpose
    case 'target':
      return !!f.target
    case 'deadline':
      return f.window === 'date' ? !!f.date : WINDOWS.includes(f.window)
    case 'daily':
      return DAILY.includes(f.daily)
    case 'start':
      return START_MODES.includes(f.start)
    default:
      return false
  }
}

/** Ответы прошлого раза → форма. Цель, которая уже не выше уровня, не подставляем: её плитка неактивна. */
export function formFromProfile(p, level) {
  if (!p) return { daily: DAILY_DEFAULT }
  const tile = targetTiles(level).find((x) => x.code === p.targetLevel)
  return {
    purpose: p.purpose || null,
    target: tile?.enabled ? p.targetLevel : null,
    window: p.deadlineWindow || null,
    date: p.deadlineWindow === 'date' ? p.deadlineDate : null,
    daily: DAILY.includes(p.dailyMinutes) ? p.dailyMinutes : DAILY_DEFAULT,
    start: p.startMode || null,
  }
}

/** Форма → тело PUT /mobile/ge/profile. */
export function onboardingBody(f) {
  return {
    purpose: f.purpose || null,
    targetLevel: f.target,
    deadlineDate: f.window === 'date' ? f.date : null,
    deadlineWindow: f.window || 'none',
    dailyMinutes: f.daily || DAILY_DEFAULT,
    startMode: f.start || null,
  }
}

/** Куда после сохранения: правка и известный уровень — маршрут; «с нуля» — тоже (A0 ставит бэкенд); иначе тест. */
export function nextAfterSave({ edit, levelKnown, start }) {
  if (edit || levelKnown || start === 'zero') return 'route'
  return 'test'
}
