// Локализованные поля ДАННЫХ (задание к тексту, пояснения к ответам,
// заголовки абзацев): в прототипе они лежат объектом {en, ru, kz} и переводятся
// не через i18n, а по языку интерфейса. Код языка там `kz`, в приложении —
// `kk`; отображаем одно на другое здесь, чтобы это не расползлось по экранам.

export function dataLang(lang) {
  if (lang === 'kk' || lang === 'kz') return 'kz'
  if (lang === 'en') return 'en'
  return 'ru'
}

/** Строку отдаём как есть — часть полей прототипа не переведена намеренно
 *  (английские предложения задания читаются на языке оригинала). */
export function loc(value, lang) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  const key = dataLang(lang)
  return value[key] || value.en || value.ru || ''
}
