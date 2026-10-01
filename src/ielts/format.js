// Форматтеры дат и длительностей раздела IELTS — на языке интерфейса.
import { pluralForm } from '../lib/plural.js'

const LOCALES = { ru: 'ru-RU', en: 'en-GB', kk: 'kk-KZ' }

// «12 декабря» / «12 December»; short — «3 ноя». Год не пишем: экзамен и фазы
// подготовки всегда в пределах ближайших месяцев.
export function formatDate(date, lang = 'ru', short = false) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const s = new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.ru, {
    day: 'numeric',
    month: short ? 'short' : 'long',
  }).format(d)
  // ru-RU в коротком виде ставит точку («3 нояб.») — в макете «3 ноя».
  return short && lang === 'ru' ? s.replace(/\.$/, '').replace('нояб', 'ноя').replace('сент', 'сен') : s
}

// 80 → «1 ч 20 мин», 45 → «45 мин» (единицы — из словаря).
export function formatDuration(minutes, t) {
  const m = Math.max(0, Math.round(minutes || 0))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (!h) return t('ieltsHub.minutes', { n: String(rest) })
  if (!rest) return t('ieltsHub.hours', { n: String(h) })
  return `${t('ieltsHub.hours', { n: String(h) })} ${t('ieltsHub.minutes', { n: String(rest) })}`
}

// 5 → «5 месяцев», 2.5 → «2,5 месяца»: у дробного числа русский берёт родительный единственного, как у «few»;
// pluralForm считает по целой части и дал бы «2,5 месяцев».
export function formatMonths(n, t, lang = 'ru') {
  const frac = n % 1 !== 0
  const form = frac ? 'few' : pluralForm(n, lang)
  return t(`ieltsOb.months.${form}`, { n: String(n).replace('.', lang === 'en' ? '.' : ',') })
}
