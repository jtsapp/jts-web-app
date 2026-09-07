// Рация: чистая часть — что считать нажатием рации и что делать с совсем
// коротким удержанием. Вынесено из экрана звонка, потому что проверять это
// живым звонком дорого, а ошибиться легко: пробел в браузере уже занят скроллом
// страницы и «кликом» по сфокусированной кнопке.

/**
 * Пробел — горячая клавиша рации на десктопе. Отсеиваем всё, что нажатием
 * рации не является:
 *  - автоповтор: пока клавишу держат, keydown летит десятками раз;
 *  - модификаторы на НАЖАТИИ: ctrl+пробел и cmd+пробел — это смена раскладки и
 *    Spotlight, рацию они включать не должны. На отпускании модификаторы
 *    игнорируем намеренно: ученик мог зацепить shift, пока говорил, и строгая
 *    проверка оставила бы рацию залипшей открытой;
 *  - ввод текста: полей в звонке сейчас нет, но правка экрана не должна молча
 *    ломать рацию.
 */
export function isPushToTalkKey(event) {
  if (!event) return false
  if (event.repeat) return false
  const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar'
  if (!isSpace) return false
  const modified = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
  if (modified && event.type !== 'keyup') return false
  return !isEditableTarget(event.target)
}

/**
 * Цель события — поле ввода? Target нормализуем до элемента: событие может
 * прийти из текстового узла, а у него нет closest() — ровно на этом уже
 * спотыкалось выделение слов в книжках.
 */
export function isEditableTarget(target) {
  const el = target && target.nodeType === 3 ? target.parentElement : target
  if (!el || typeof el.closest !== 'function') return false
  return Boolean(
    el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
  )
}

// Короче этого удержание — промах по кнопке, а не реплика. Порог нужен, потому
// что в ручном режиме LiveKit генерит ответ даже на ПУСТОЙ транскрипт
// (audio_recognition._run_eou_detection пропускает проверку при manual): без
// него случайный тап заставлял бы тьютора отвечать на тишину.
export const HOLD_MIN_MS = 200

/** Что слать агенту на отпускании: закрыть ход или отменить его. */
export function holdVerdict(heldMs) {
  return Number(heldMs) >= HOLD_MIN_MS ? 'end_turn' : 'cancel_turn'
}
