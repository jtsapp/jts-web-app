// Баннер сроков на «Сегодня» (ТЗ 21.10, задача 4; Figma «NEW 2», 17:5933): какой вид показать. Сами цифры считает
// сервер (timing в /mobile/sat/roadmap), здесь — только «впервые или уже видели».

/**
 * Ключ «уже показан полностью». Цифры в ключе нарочно: сдвинулась дата или темп — это новая ситуация, и её снова
 * показывают целиком, а не одной строкой.
 */
export function timingSeenKey(timing) {
  return `jts_sat_timing_${timing?.status}_${timing?.weeksLeft}_${timing?.weeksNeeded}`
}

/**
 * Вид баннера: 'none' — времени хватает или даты нет; 'tight' — мягкая плашка «впритык»; 'full' — нехватка, первый
 * показ с тремя решениями; 'collapsed' — та же нехватка при повторном заходе: одна строка, но не пропадает, пока
 * ситуация не решена.
 */
export function timingMode(timing, seen) {
  if (timing?.status === 'tight') return 'tight'
  if (timing?.status === 'short') return seen ? 'collapsed' : 'full'
  return 'none'
}

// отметка живёт на устройстве: это удобство (не показывать одно и то же полотном), а не учёт
export function readTimingSeen(key) {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeTimingSeen(key) {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    /* без хранилища баннер просто снова покажется целиком */
  }
}
