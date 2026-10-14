// Короткие месяцы ru в Intl неровные: «окт», но «нояб», «февр», «сент» — а в макете SAT везде три буквы
// («20 ноя», «26 фев», Figma 4, 12–16). Точки сокращений и « г.» после года экраны и так снимали, каждый по-своему.
const RU_SHORT = { сент: 'сен', нояб: 'ноя', февр: 'фев' }

/** Дата для экранов SAT: Intl по языку, короткий месяц — тремя буквами, без точек и « г.». */
export function fmtDate(loc, date, opts) {
  let s = new Intl.DateTimeFormat(loc, opts).format(date)
  if (opts?.month === 'short') {
    // « г.» года — только после пробела: «г.» в конце «авг.» — часть месяца
    s = s.replace(/\s+г\.?$/, '').replace(/\./g, '')
    // без lookbehind: Safari до 16.4 его не разбирает (src/lib/safariSyntax.test.js)
    if (loc.startsWith('ru')) s = s.replace(/(^|[^а-яё])(сент|нояб|февр)(?![а-яё])/g, (m, before, w) => before + RU_SHORT[w])
  }
  return s
}
