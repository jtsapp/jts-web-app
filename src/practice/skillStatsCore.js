// Чистая логика рейтинга навыков: без DOM/fetch, поэтому тестируется в node.
// Поля везде { done, firstTry } (SQL-колонки tasks_done/first_try_correct).

export const SKILLS = ['listening', 'speaking', 'reading', 'writing', 'grammar', 'vocab']

const CONF_FULL = 25 // столько «первых попыток» = полная уверенность (максимум полосок)

export function emptyStats() {
  const out = {}
  for (const s of SKILLS) out[s] = { done: 0, firstTry: 0 }
  return out
}

// 2..10 полосок. Пусто → 2. Точность зажата объёмом (уверенностью): пока заданий
// мало, максимума не достичь; растёт по мере практики.
export function skillBars({ done = 0, firstTry = 0 } = {}) {
  if (!done || done <= 0) return 2
  const accuracy = Math.min(1, firstTry / done)
  const confidence = Math.min(1, done / CONF_FULL)
  const bars = 2 + Math.round(8 * accuracy * confidence)
  return Math.max(2, Math.min(10, bars))
}

// «Сильные и слабые стороны» ученика — одна формула на «Главной», в Профиле и у Луны (ТЗ v2.0, 5.5; решение школы
// 06.11.2026): доля заданий текущего уровня, решённых верно с первой попытки. skillBars выше зажимал долю «объёмом»
// (до 25 заданий меньше), а цифра рядом была чистой долей — у одного ученика чтение 32% на «Главной» и 73% в Профиле.
// Меньше MIN_LEVEL_TASKS заданий — «мало данных» (null): два-три ответа — ещё не навык.
export const MIN_LEVEL_TASKS = 5

/** Доля верных с первой попытки, %; меньше MIN_LEVEL_TASKS заданий — null («мало данных»). */
export function levelShare({ done = 0, firstTry = 0 } = {}) {
  if (!Number.isFinite(done) || done < MIN_LEVEL_TASKS) return null
  return Math.round(Math.min(1, firstTry / done) * 100)
}

/** 2..10 полосок по доле (levelShare); нет доли — 2, как у пустого навыка. */
export function shareBars(percent) {
  if (percent == null) return 2
  return Math.max(2, Math.min(10, 2 + Math.round((8 * percent) / 100)))
}

// Иммутабельно прибавляет одну попытку к навыку. Неизвестный навык — no-op.
export function addDelta(map, skill, correct) {
  if (!SKILLS.includes(skill)) return map
  const cur = map[skill] || { done: 0, firstTry: 0 }
  return {
    ...map,
    [skill]: { done: cur.done + 1, firstTry: cur.firstTry + (correct ? 1 : 0) },
  }
}

// Уровни, по которым копятся навыки (ТЗ v2.0, 5.5: «Сильные и слабые стороны» — по заданиям текущего уровня;
// таблица skill_level_stat, миграция 0021). Чужое значение — не уровень: задание идёт только в общий итог.
export const SKILL_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Уровень CEFR в виде ключа ('b1' → 'B1'); не уровень — null. */
export function skillLevel(level) {
  const code = String(level ?? '').trim().toUpperCase()
  return SKILL_LEVELS.includes(code) ? code : null
}

/** То же, что addDelta, но в наборе по уровням { A2: { skill: {done, firstTry} } }. */
export function addLevelDelta(byLevel, level, skill, correct) {
  const code = skillLevel(level)
  if (!code || !SKILLS.includes(skill)) return byLevel
  return { ...byLevel, [code]: addDelta(byLevel?.[code] || emptyStats(), skill, correct) }
}

/** Склейка двух наборов по уровням. */
export function mergeLevelDeltas(a, b) {
  const out = { ...(a || {}) }
  for (const code of Object.keys(b || {})) {
    if (!skillLevel(code)) continue
    out[code] = mergeDeltas(out[code] || emptyStats(), b[code])
  }
  return out
}

// Суммирует два набора дельт по навыкам (для склейки буфера).
export function mergeDeltas(a, b) {
  const out = { ...a }
  for (const skill of Object.keys(b || {})) {
    const x = out[skill] || { done: 0, firstTry: 0 }
    const y = b[skill] || { done: 0, firstTry: 0 }
    out[skill] = { done: (x.done || 0) + (y.done || 0), firstTry: (x.firstTry || 0) + (y.firstTry || 0) }
  }
  return out
}
