// Прогресс по уровню и сильные/слабые стороны для «Главной».
//
// Данные — те же, что у рейтинга навыков в профиле ({done, firstTry} на навык,
// см. practice/skillStats.js). Нового источника у нас нет, и придумывать его
// ради красивой карточки нельзя: цифра на первом экране должна означать ровно
// то же, что цифра в профиле, иначе ученик увидит два разных «своих» прогресса.
//
// Модуль чистый (кроме явно помеченных снимков в localStorage) — считается в
// тестах без DOM.

import { LEVELS } from '../cefr.js'
import { SKILLS } from '../practice/skillStatsCore.js'

// Столько заданий на навык считаем «набранным объёмом»: до него точность ещё
// не показательна и процент придерживается уверенностью. То же число, что в
// skillStatsCore (CONF_FULL) — шкалы профиля и главной обязаны совпадать.
const CONF_FULL = 25

/** Процент владения навыком: точность, зажатая объёмом. 0 у нового ученика. */
export function skillPercent({ done = 0, firstTry = 0 } = {}) {
  if (!done || done <= 0) return 0
  const accuracy = Math.min(1, firstTry / done)
  const confidence = Math.min(1, done / CONF_FULL)
  return Math.round(accuracy * confidence * 100)
}

/** [{ skill, percent }] по всем навыкам, от сильного к слабому. */
export function rankSkills(stats) {
  return SKILLS
    .map((skill) => ({ skill, percent: skillPercent(stats?.[skill]) }))
    .sort((a, b) => b.percent - a.percent || SKILLS.indexOf(a.skill) - SKILLS.indexOf(b.skill))
}

/** Следующий уровень CEFR или null на потолке (C2). */
export function nextLevel(level) {
  const i = LEVELS.indexOf(String(level || 'A1').toUpperCase())
  if (i < 0) return LEVELS[1]
  return LEVELS[i + 1] || null
}

/**
 * Сводка для карточки уровня.
 *
 * `lessonsLeft`/`practiceLeft` — оценка, а не план курса: у приложения нет
 * «сколько уроков до B2», и обещать точное число было бы враньём. Считаем от
 * остатка процента по средней отдаче одного занятия (урок ≈ 4%, практика ≈ 2%)
 * и так и говорим в подписи («примерно»).
 */
export function levelSummary(userLevel, stats) {
  const ranked = rankSkills(stats)
  const percent = ranked.length
    ? Math.round(ranked.reduce((s, r) => s + r.percent, 0) / ranked.length)
    : 0
  const next = nextLevel(userLevel)
  const remaining = Math.max(0, 100 - percent)
  return {
    level: String(userLevel || 'A1').toUpperCase(),
    next,
    percent,
    ranked,
    strongest: ranked[0]?.percent ? ranked[0] : null,
    weakest: ranked.length && ranked[ranked.length - 1].percent < ranked[0].percent
      ? ranked[ranked.length - 1]
      : null,
    lessonsLeft: Math.ceil(remaining / 4),
    practiceLeft: Math.ceil(remaining / 12),
  }
}

const SNAPSHOT_KEY = 'jts_level_progress_week'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Насколько процент вырос за неделю.
 *
 * Истории прогресса на бэкенде нет, поэтому неделю отсчитываем от снимка,
 * который сами и кладём (см. touchWeeklySnapshot). Пока снимка нет — возвращаем
 * null, и карточка просто не рисует прирост: «+0% за неделю» у новичка читается
 * как «ты за неделю ничего не добился», хотя недели ещё не было.
 */
export function weeklyDelta(percent, snapshot, now = Date.now()) {
  if (!snapshot || typeof snapshot.percent !== 'number') return null
  if (!(now - snapshot.at >= 0)) return null
  return percent - snapshot.percent
}

/**
 * Читает снимок и обновляет его, когда он старше недели. Возвращает прирост.
 * Единственное место модуля, которое трогает localStorage.
 */
export function touchWeeklySnapshot(percent, now = Date.now()) {
  let snapshot = null
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    snapshot = raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
  const delta = weeklyDelta(percent, snapshot, now)
  if (!snapshot || now - snapshot.at >= WEEK_MS) {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ percent, at: now }))
    } catch {
      /* приватный режим — обойдёмся без прироста */
    }
  }
  return delta
}
