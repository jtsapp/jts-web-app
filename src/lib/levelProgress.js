// Прогресс по уровню и сильные/слабые стороны для «Главной».
//
// Здесь ДВЕ разные величины, и путать их нельзя:
//
//  1. «Сколько пройдено» — доля освоенных материалов уровня. Считает сервер
//     (GET /mobile/level-progress): слагаемые лежат в отметках каталога, в
//     состоявшихся занятиях и в объёме самого курса, и в браузере их не собрать.
//     Раньше эту цифру давала точность в практике — она отвечала на другой
//     вопрос и упиралась в потолок у того, кто просто идёт дальше по программе.
//  2. «Что получается лучше и хуже» — рейтинг навыков из практики
//     ({done, firstTry} на навык, см. practice/skillStats.js). Он остался
//     прежним и тем же, что в профиле: две карточки об одном себе не должны
//     показывать разные числа.
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
 * @param progress ответ сервера про освоенные материалы или null, пока он не
 *   пришёл. Своей оценки на этот случай не выдумываем: `percent` остаётся null,
 *   и карточка рисует пустую дорожку. Показать вместо неизвестного прогресса
 *   правдоподобное число хуже, чем не показать ничего, — человек примет его за
 *   свой и не узнает, что оно взято с потолка.
 *
 * Остаток — в материалах, а не в «примерно четырёх уроках»: раньше он считался
 * от процента по средней отдаче занятия, потому что курса в этих числах не
 * было. Теперь есть: `remaining` — сколько материалов уровня ещё не пройдено.
 *
 * Уровень карточки тоже берём у сервера, когда он ответил: ученик мог купить
 * курс выше своего, и тогда проходит он именно его. Считать полосу по одному
 * уровню, а подписывать карточку другим нельзя — вышло бы «ВАШ УРОВЕНЬ A1» с
 * дорожкой, ведущей к B2. Уровень в профиле и в сайдбаре при этом остаётся
 * прежним: владеть языком на B1 и купить курс B1 — разные вещи.
 */
export function levelSummary(userLevel, stats, progress = null) {
  const ranked = rankSkills(stats)
  const level = String(progress?.level || userLevel || 'A1').toUpperCase()
  // Именно `progress.next`, а не пересчёт от уровня: на C2 сервер присылает
  // null, и подставлять туда своё значение — значит спорить с ним о потолке.
  const next = progress ? (progress.next || null) : nextLevel(userLevel)
  const percent = typeof progress?.percent === 'number' ? progress.percent : null
  return {
    level,
    next,
    percent,
    ranked,
    strongest: ranked[0]?.percent ? ranked[0] : null,
    weakest: ranked.length && ranked[ranked.length - 1].percent < ranked[0].percent
      ? ranked[ranked.length - 1]
      : null,
    done: progress?.done ?? null,
    total: progress?.total ?? null,
    remaining: typeof progress?.remaining === 'number' ? progress.remaining : null,
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
  // Прогресс ещё не приехал — снимать нечего. Записать null значило бы стереть
  // недельную точку отсчёта каждым открытием экрана в офлайне.
  if (typeof percent !== 'number') return null
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
