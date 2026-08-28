// Локализация КОНТЕНТА воркбука. В прототипе поля вида {en, ru, kk} читал
// loc() по своему переключателю ENG|RU|KAZ — второй язык на экране, никак не
// связанный с языком приложения. Здесь язык один: тот, что выбран в шапке
// сайта (useI18n → lang, ключи ru/en/kk совпадают с полями данных).

/** Строка или {en,ru,kk} → строка на языке интерфейса, с откатом на английский. */
export function loc(o, lang) {
  if (!o) return ''
  if (typeof o === 'string') return o
  return o[lang] || o.en || ''
}

/** Инструкция к заданию: ключ в INS либо готовый объект. У listen/read — от вложенного. */
export function insText(act, meta, lang) {
  const key = act.ins || (act.task && act.task.ins)
  if (!key) return ''
  return loc(typeof key === 'string' ? meta?.ins?.[key] : key, lang)
}

/** Уточнение под инструкцией (второй строкой). */
export function subText(act, meta, lang) {
  const key = act.sub || (act.task && act.task.sub)
  if (!key) return ''
  return loc(typeof key === 'string' ? meta?.ins?.[key] : key, lang)
}

/** Перевод слова из словаря урока: [en, ru, kk, emoji?]. */
export function vocMeaning(v, lang) {
  return (lang === 'kk' && v[2]) || v[1] || ''
}
