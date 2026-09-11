// Выбор формы числительного для ключей i18n вида `x.one` / `x.few` / `x.many`.
//
// «12 уроков» и «24 урока» — разные слова, и в макете тарифов они стоят рядом
// в одном списке: одной строкой «{n} уроков» их не покрыть. Русский требует три
// формы, английскому хватает двух (few === many), казахскому — одной.

/** @returns {'one'|'few'|'many'} суффикс ключа */
export function pluralForm(n, lang = 'ru') {
  const k = Math.abs(Math.trunc(n))
  if (lang === 'kk') return 'many'
  if (lang === 'en') return k === 1 ? 'one' : 'many'
  // ru: 1, 21, 31 — one; 2-4, 22-24 — few; 0, 5-20, 11-14 — many
  const mod10 = k % 10
  const mod100 = k % 100
  if (mod100 >= 11 && mod100 <= 14) return 'many'
  if (mod10 === 1) return 'one'
  if (mod10 >= 2 && mod10 <= 4) return 'few'
  return 'many'
}

/** `plural(t, lang, 'pricing.lessons', 12)` → t('pricing.lessons.many', {n:'12'}) */
export function plural(t, lang, baseKey, n) {
  return t(`${baseKey}.${pluralForm(n, lang)}`, { n: String(n) })
}
