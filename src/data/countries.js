// Страны для селектора кода в телефонном вводе регистрации/входа.
// dial — код страны без «+»; len — длина национального номера (диапазон
// [min, max] для стран с переменной длиной) для валидации и маски.
// Флаги — эмодзи (компактно, без набора SVG); на мобильных таргетах
// (iOS/Android/macOS) отрисовываются корректно.
//
// ВНИМАНИЕ: канонический вид номера для бэкенда — цифры кода+номера без «+»
// (см. normalizePhone в api.js). Для Казахстана/России это «7XXXXXXXXXX» —
// тот же формат, в котором уже зарегистрированы существующие пользователи,
// поэтому вход по OTP для них не ломается.
export const COUNTRIES = [
  { iso: 'kz', name: 'Казахстан', dial: '7', min: 10, max: 10, flag: '🇰🇿' },
  { iso: 'ru', name: 'Россия', dial: '7', min: 10, max: 10, flag: '🇷🇺' },
  { iso: 'uz', name: 'Узбекистан', dial: '998', min: 9, max: 9, flag: '🇺🇿' },
  { iso: 'kg', name: 'Кыргызстан', dial: '996', min: 9, max: 9, flag: '🇰🇬' },
  { iso: 'tj', name: 'Таджикистан', dial: '992', min: 9, max: 9, flag: '🇹🇯' },
  { iso: 'tm', name: 'Туркменистан', dial: '993', min: 8, max: 8, flag: '🇹🇲' },
  { iso: 'az', name: 'Азербайджан', dial: '994', min: 9, max: 9, flag: '🇦🇿' },
  { iso: 'ge', name: 'Грузия', dial: '995', min: 9, max: 9, flag: '🇬🇪' },
  { iso: 'am', name: 'Армения', dial: '374', min: 8, max: 8, flag: '🇦🇲' },
  { iso: 'by', name: 'Беларусь', dial: '375', min: 9, max: 9, flag: '🇧🇾' },
  { iso: 'ua', name: 'Украина', dial: '380', min: 9, max: 9, flag: '🇺🇦' },
  { iso: 'tr', name: 'Турция', dial: '90', min: 10, max: 10, flag: '🇹🇷' },
  { iso: 'ae', name: 'ОАЭ', dial: '971', min: 8, max: 9, flag: '🇦🇪' },
  { iso: 'us', name: 'США / Канада', dial: '1', min: 10, max: 10, flag: '🇺🇸' },
  { iso: 'gb', name: 'Великобритания', dial: '44', min: 10, max: 10, flag: '🇬🇧' },
  { iso: 'de', name: 'Германия', dial: '49', min: 6, max: 11, flag: '🇩🇪' },
]

// Казахстан по умолчанию — это KZ-приложение (justtostudy.kz).
export const DEFAULT_COUNTRY = COUNTRIES[0]

// Национальный номер: для +7 — привычная маска (777) 123-45-67,
// для остальных — группировка по 3 цифры (нейтрально и читаемо).
export function formatNational(country, digits) {
  const d = digits.slice(0, country.max)
  if (!d) return ''
  if (country.dial === '7') {
    let out = '(' + d.slice(0, 3)
    if (d.length > 3) out += ') ' + d.slice(3, 6)
    if (d.length > 6) out += '-' + d.slice(6, 8)
    if (d.length > 8) out += '-' + d.slice(8, 10)
    return out
  }
  return d.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

// Достаточно ли цифр для отправки (в пределах [min, max]).
export function isNationalComplete(country, digits) {
  return digits.length >= country.min && digits.length <= country.max
}
