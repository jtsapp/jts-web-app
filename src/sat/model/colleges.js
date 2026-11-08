// Вузы главы 3 онбординга. Страна лежит в самих данных: colleges.json с 11.2026 ведёт веб-приложение (решения SAT,
// «1. Данные вузов»), выгрузка прототипа его больше не пишет — отдельная карта стран по id не нужна.
// Баллы разных стран — разные величины (США — статистика зачисленных, Британия — порог допуска), поэтому список
// всегда делится по стране и никогда не сортируется по баллу через страны.

// порядок чипов и групп — Все · США · Великобритания · Казахстан · Южная Корея
export const COUNTRY_ORDER = ['US', 'GB', 'KZ', 'KR']

export function countryOf(college) {
  return college?.country || null
}

const rank = (c) => (COUNTRY_ORDER.includes(c) ? COUNTRY_ORDER.indexOf(c) : COUNTRY_ORDER.length)

/** Чипы — только страны, вузы которых есть в данных. */
export function countriesIn(rows = []) {
  const have = [...new Set(rows.map(countryOf).filter(Boolean))]
  return have.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1))
}

/** Вузы выбранной страны; 'all' — все. */
export function byCountry(rows = [], country = 'all') {
  return country === 'all' ? rows : rows.filter((c) => countryOf(c) === country)
}

/** Группы по стране в порядке чипов: внутри группы можно сравнивать, между группами — нет. */
export function groupByCountry(rows = []) {
  return countriesIn(rows).map((country) => ({ country, rows: rows.filter((c) => countryOf(c) === country) }))
}
