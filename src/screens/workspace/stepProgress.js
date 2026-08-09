// Ответы урока, открытого шагами, живут в том же material_progress, что и
// прогресс материала в iframe: ключ (урок, материал, ученик) у них общий, а
// eventsJson бэкенд хранит как произвольную строку и в её содержимое не
// смотрит. Второй таблицы под то же самое заводить не стали — это было бы два
// места для одного ответа.
//
// Формат у двух путей разный и различим: бридж пишет массив DOM-событий, здесь
// объект с ответами. Материал бывает либо тем, либо другим, но уровень могут
// перерегистрировать, и урок каталога, который вчера открывался файлом, сегодня
// откроется шагами — поэтому чужая форма читается как «прогресса нет», а не
// роняет экран.

const SHAPE = 'lesson-steps'

/** Строка для eventsJson: ответы, проверенные шаги и последний открытый шаг. */
export function serializeStepProgress({ answers, checkedSteps, stepId }) {
  return JSON.stringify({
    shape: SHAPE,
    answers: answers || {},
    checked: [...(checkedSteps || [])],
    stepId: stepId ?? null,
  })
}

/**
 * Разбор сохранённого прогресса. `null` — сохранять было нечего или лежит
 * форма другого пути; вызывающий тогда начинает с чистого листа.
 */
export function parseStepProgress(eventsJson) {
  if (typeof eventsJson !== 'string' || !eventsJson.trim()) return null
  let parsed
  try {
    parsed = JSON.parse(eventsJson)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  if (parsed.shape !== SHAPE) return null

  return {
    answers: parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)
      ? parsed.answers
      : {},
    checkedSteps: new Set(Array.isArray(parsed.checked) ? parsed.checked : []),
    stepId: typeof parsed.stepId === 'string' || typeof parsed.stepId === 'number' ? parsed.stepId : null,
  }
}
