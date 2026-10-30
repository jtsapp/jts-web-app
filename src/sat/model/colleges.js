// Страна вуза для главы 3 онбординга («NEW 2», 17:366: фильтр по странам над списком «Куда попадает эта цель»).
// colleges.json — выгрузка прототипа (`scripts/sat/export-sat.js`), страны в ней нет; правка руками пропала бы при
// следующей выгрузке, поэтому страна — здесь, по id вуза. Новый вуз в выгрузке без строки здесь просто не попадёт
// ни в одну страну, кроме «Все» (тест colleges.test.js сверяет, что у каждого вуза страна есть).

export const COLLEGE_COUNTRY = {
  mit: 'US',
  caltech: 'US',
  harvard: 'US',
  yale: 'US',
  princeton: 'US',
  cornell: 'US',
  georgetown: 'US',
  purdue: 'US',
  nyu: 'US',
  umich: 'US',
  uiuc: 'US',
  utaustin: 'US',
  nus: 'SG',
  uoft: 'CA',
  nazarbayev: 'KZ',
  kimep: 'KZ',
}

// порядок чипов — как в макете; страны, которых в макете нет, — после них
const ORDER = ['US', 'CA', 'GB', 'KZ', 'KR', 'SG']

export function countryOf(college) {
  return college?.country || COLLEGE_COUNTRY[college?.id] || null
}

/** Чипы — только страны, вузы которых есть в данных: пустой «Великобритании» из макета не будет. */
export function countriesIn(rows = []) {
  const have = [...new Set(rows.map(countryOf).filter(Boolean))]
  const rank = (c) => (ORDER.includes(c) ? ORDER.indexOf(c) : ORDER.length)
  return have.sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1))
}

/** Вузы выбранной страны; 'all' — все. По ним же считается «N из M в досягаемости». */
export function byCountry(rows = [], country = 'all') {
  return country === 'all' ? rows : rows.filter((c) => countryOf(c) === country)
}
