// Даты на языке интерфейса для «Главной»: «20 октября», «пн», «понедельник». Для ru и en — Intl, для казахского —
// свои таблицы: в Chrome данных kk для Intl может не быть, и `toLocaleDateString('kk-KZ')` отдаёт «Sat» и «M10 20»
// (так было на «Главной» в полосе недели и в дате баннера, проверено e2e 07.11.2026).

const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
// с воскресенья, как Date#getDay
const KK_DAYS = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі']
const KK_DAYS_SHORT = ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб']

const localeOf = (lang) => (lang === 'en' ? 'en-GB' : 'ru-RU')
const valid = (d) => d instanceof Date && !Number.isNaN(d.getTime())

/** «20 октября» / «20 October» / «20 қазан». */
export function dayMonth(date, lang) {
  if (!valid(date)) return ''
  if (lang === 'kk') return `${date.getDate()} ${KK_MONTHS[date.getMonth()]}`
  return date.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'long' })
}

/** «пн» / «Mon» / «дс». */
export function weekdayShort(date, lang) {
  if (!valid(date)) return ''
  if (lang === 'kk') return KK_DAYS_SHORT[date.getDay()]
  return date.toLocaleDateString(localeOf(lang), { weekday: 'short' })
}

/** «понедельник» / «Monday» / «дүйсенбі». */
export function weekdayLong(date, lang) {
  if (!valid(date)) return ''
  if (lang === 'kk') return KK_DAYS[date.getDay()]
  return date.toLocaleDateString(localeOf(lang), { weekday: 'long' })
}
