// Числа «Аркады» по правилам языка интерфейса: в русском и казахском дробная
// часть пишется через запятую («2,5 с тишины»), в английском — через точку.
const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' }

/** Как есть: 12 → «12», 2.5 → «2,5» (ru/kk). */
export function formatNumber(n, lang) {
  return new Intl.NumberFormat(LOCALES[lang] || LOCALES.ru).format(n)
}

/** Ровно один знак после запятой — для секунд и соотношений в итогах. */
export function formatOneDecimal(n, lang) {
  return new Intl.NumberFormat(LOCALES[lang] || LOCALES.ru, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)
}
