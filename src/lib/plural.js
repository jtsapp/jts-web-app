// Выбор формы числительного для ключей i18n вида `x.one` / `x.few` / `x.many`.
//
// «12 уроков» и «24 урока» — разные слова, и в макете тарифов они стоят рядом
// в одном списке: одной строкой «{n} уроков» их не покрыть. Русский требует три
// формы, английскому хватает двух (few === many). Существительное после числа
// по-казахски не меняется, но «один» и там отдельная форма: во фразе вроде
// «Алғашқы материалды» число выпадает, а при двух и больше — стоит.
//
// Правила берём из CLDR через Intl.PluralRules, а не пишем руками: у русского
// ловушки на 11–14 и 111–114, и самописная таблица на каждом новом языке
// рискует разойтись с тем, как язык считает на самом деле.

// Незнакомый язык считаем по-русски — так же, как словарь откатывается на ru.
const LOCALES = ['ru', 'en', 'kk']
const rulesByLocale = new Map()

function rulesFor(lang) {
  const locale = LOCALES.includes(lang) ? lang : 'ru'
  if (!rulesByLocale.has(locale)) rulesByLocale.set(locale, new Intl.PluralRules(locale))
  return rulesByLocale.get(locale)
}

/** @returns {'one'|'few'|'many'} суффикс ключа */
export function pluralForm(n, lang = 'ru') {
  // Дробей и минусов в счётчиках нет; целая часть держит русский в трёх
  // формах — дробное число CLDR отнёс бы к четвёртой, `other`.
  const category = rulesFor(lang).select(Math.abs(Math.trunc(n)))
  // У en/kk всё, кроме единицы, — `other`: он ложится на many, few у них
  // просто повторяет many.
  return category === 'one' || category === 'few' ? category : 'many'
}

/** `plural(t, lang, 'pricing.lessons', 12)` → t('pricing.lessons.many', {n:'12'}) */
export function plural(t, lang, baseKey, n) {
  return t(`${baseKey}.${pluralForm(n, lang)}`, { n: String(n) })
}
