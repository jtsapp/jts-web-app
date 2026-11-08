// Интервальное повторение модели ученика (ТЗ v2.0 «Луна-трекер», 8.3: «слова и правила возвращаются через 1, 3, 7, 14
// дней»; спека docs/superpowers/specs/2026-11-08-luna-student-model-methodology-design.md, раздел 3).
//
// Вещь — тема «Грамматики · игр» (ggame:L2-03) или слово «Словаря» (word:<ключ>). Коробки 0–4: попав в коробку b, вещь
// ждёт INTERVAL_DAYS[b] дней. Коробка 4 — «освоено», дальше поддерживающее повторение раз в 30 дней.
//
// Повторением считается ответ, когда срок вышел. Ответы до срока коробку не двигают: в одной игре десяток вопросов на
// тему, и иначе ученик «прошёл» бы все повторения за вечер. Но день, в котором 3+ ошибки и меньше 80 % верных, вещь
// откатывает в коробку 0 — оговорка из десяти не повод, а провал темы повод (тот же порог 80 %, что у темпа, pace.js).
//
// Модуль чистый: время — параметром, день — UTC, как у skill_day (сервер базы пишет сутки в UTC).

export const INTERVAL_DAYS = [1, 3, 7, 14, 30]
export const MASTER_BOX = 4
// День «провален»: ошибок не меньше стольких и верных меньше LAPSE_SHARE.
export const LAPSE_WRONG = 3
export const LAPSE_SHARE = 0.8

const DAY_MS = 24 * 60 * 60 * 1000

/** Сутки UTC: 'YYYY-MM-DD'. */
export const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10)

const addDays = (ms, days) => ms + days * DAY_MS

/**
 * @typedef {{ box: number, dueAt: number, lapses: number, seen: number, correct: number,
 *             day: string|null, daySeen: number, dayWrong: number, firstAt: number, lastAt: number }} SrState
 */

/**
 * Состояние после ответа. state — прежнее или null (вещь встретилась впервые). Время — миллисекунды.
 * @param {SrState|null} state
 * @param {boolean} ok
 * @param {number} now
 * @returns {SrState}
 */
export function srStep(state, ok, now) {
  const day = utcDay(now)
  if (!state) {
    return {
      box: 0,
      dueAt: addDays(now, INTERVAL_DAYS[0]),
      lapses: 0,
      seen: 1,
      correct: ok ? 1 : 0,
      day,
      daySeen: 1,
      dayWrong: ok ? 0 : 1,
      firstAt: now,
      lastAt: now,
    }
  }
  const sameDay = state.day === day
  const next = {
    ...state,
    seen: (state.seen || 0) + 1,
    correct: (state.correct || 0) + (ok ? 1 : 0),
    day,
    daySeen: (sameDay ? state.daySeen || 0 : 0) + 1,
    dayWrong: (sameDay ? state.dayWrong || 0 : 0) + (ok ? 0 : 1),
    lastAt: now,
  }
  const box = Math.max(0, Math.min(MASTER_BOX, Number(state.box) || 0))
  if (Number(state.dueAt) <= now) {
    // Повторение: срок вышел.
    if (ok) {
      const up = Math.min(MASTER_BOX, box + 1)
      return { ...next, box: up, dueAt: addDays(now, INTERVAL_DAYS[up]) }
    }
    return lapse(next, box, now)
  }
  // До срока: только провальный день откатывает. Вещь, которую и так повторять завтра, трогать незачем.
  const failedDay = next.dayWrong >= LAPSE_WRONG && (next.daySeen - next.dayWrong) / next.daySeen < LAPSE_SHARE
  if (!ok && failedDay && (box > 0 || Number(state.dueAt) > addDays(now, INTERVAL_DAYS[0]))) return lapse(next, box, now)
  return { ...next, box }
}

function lapse(next, box, now) {
  return { ...next, box: 0, dueAt: addDays(now, INTERVAL_DAYS[0]), lapses: (next.lapses || 0) + (box > 0 ? 1 : 0) }
}

/** Статус по ТЗ 8.1: не изучено / изучается / освоено / забывается. */
export const STATUS = { new: 'new', learning: 'learning', mastered: 'mastered', due: 'due' }

/** @param {SrState|null} state @param {number} now */
export function srStatus(state, now) {
  if (!state) return STATUS.new
  if (Number(state.dueAt) <= now) return STATUS.due
  if ((Number(state.box) || 0) >= MASTER_BOX) return STATUS.mastered
  return STATUS.learning
}

/** Сколько дней прошло с последнего ответа (для «прошло 3 дня»), целое не меньше 0. */
export function daysSince(ms, now) {
  return Math.max(0, Math.floor((now - Number(ms)) / DAY_MS))
}
