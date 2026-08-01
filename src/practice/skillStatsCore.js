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

// Иммутабельно прибавляет одну попытку к навыку. Неизвестный навык — no-op.
export function addDelta(map, skill, correct) {
  if (!SKILLS.includes(skill)) return map
  const cur = map[skill] || { done: 0, firstTry: 0 }
  return {
    ...map,
    [skill]: { done: cur.done + 1, firstTry: cur.firstTry + (correct ? 1 : 0) },
  }
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
