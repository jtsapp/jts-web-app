/**
 * Отложенная запись прогресса ученика.
 *
 * Ответ в поле ввода меняется на каждую букву, поэтому запись идёт с задержкой.
 * Но задержка — не право потерять запись:
 *
 * - на выходе из урока прежний код просто гасил таймер, и последний ответ
 *   (тот самый, после которого ученик и закрывает урок) не доезжал никуда;
 * - при переходе на другой материал отложенная запись заменялась новой — с
 *   ДРУГИМ materialId, то есть строка прогресса предыдущего материала так и
 *   оставалась пустой.
 *
 * Отсюда «не сохраняется прогресс студента»: терялось не всё подряд, а именно
 * последнее сделанное — что со стороны и выглядит как «ничего не сохранилось».
 */
export function createProgressSaver(save, delay = 800) {
  let timer = null
  let pending = null

  function flush(keepalive = false) {
    clearTimeout(timer)
    timer = null
    if (!pending) return null
    const { materialId, payload } = pending
    pending = null
    return save(materialId, payload, keepalive)
  }

  function schedule(materialId, payload) {
    // Ушли на другой материал — прежнюю запись досылаем, а не отменяем.
    if (pending && pending.materialId !== materialId) flush()
    clearTimeout(timer)
    pending = { materialId, payload }
    timer = setTimeout(() => flush(), delay)
  }

  return { schedule, flush, hasPending: () => pending != null }
}
