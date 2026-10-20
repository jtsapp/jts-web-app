// Подписи отчёта о прогрессе — на ЯЗЫКЕ ОТЧЁТА, а не интерфейса: отчёт пишется
// родителю на его языке (поле lang), и по ссылке из мессенджера он открывает
// его без аккаунта, то есть без выбранного языка интерфейса. Тексты сняты с
// прототипа data/jts-progress-report.html (T, GT, GSTL, SNAME, badges()) —
// превью у преподавателя и вид у родителя должны совпадать слово в слово.

export const REPORT_LANGS = ['ru', 'kk', 'en']

export function reportLang(lang) {
  const l = String(lang || '').toLowerCase()
  // 'kz' — код казахского в словаре тьютора и местами на бэкенде.
  if (l === 'kz') return 'kk'
  return REPORT_LANGS.includes(l) ? l : 'ru'
}

const BLOCKS = {
  ru: {
    title: 'Отчёт о прогрессе', attendance: 'Посещаемость', homework: 'Домашние задания', covered: 'Пройдено',
    strengths: 'Сильные стороны', improvements: 'Над чем работаем', plan: 'План', skills: 'Навыки',
    teacher: 'Преподаватель', pastGoals: 'Цели прошлого отчёта', nextGoals: 'Цели на следующие 30 дней',
    footer: 'Отчёт подготовлен в школе Just to Study',
  },
  kk: {
    title: 'Прогресс есебі', attendance: 'Қатысу', homework: 'Үй тапсырмасы', covered: 'Өтілді',
    strengths: 'Күшті жақтары', improvements: 'Жұмыс істейтін тұстар', plan: 'Жоспар', skills: 'Дағдылар',
    teacher: 'Мұғалім', pastGoals: 'Өткен кезеңнің мақсаттары', nextGoals: 'Келесі 30 күнге мақсаттар',
    footer: 'Есепті Just to Study мектебі дайындады',
  },
  en: {
    title: 'Progress report', attendance: 'Attendance', homework: 'Homework', covered: 'Covered',
    strengths: 'Strengths', improvements: 'Areas to improve', plan: 'Next steps', skills: 'Skills',
    teacher: 'Teacher', pastGoals: 'Last report goals', nextGoals: 'Goals for the next 30 days',
    footer: 'Prepared by Just to Study',
  },
}

export function reportLabels(lang) {
  return BLOCKS[reportLang(lang)]
}

const SKILLS = {
  ru: { speaking: 'Говорение', listening: 'Аудирование', reading: 'Чтение', writing: 'Письмо', grammar: 'Грамматика', vocabulary: 'Лексика' },
  kk: { speaking: 'Сөйлеу', listening: 'Тыңдау', reading: 'Оқу', writing: 'Жазу', grammar: 'Грамматика', vocabulary: 'Лексика' },
  en: { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing', grammar: 'Grammar', vocabulary: 'Vocabulary' },
}

export function skillName(key, lang) {
  return SKILLS[reportLang(lang)][key] ?? key
}

const GOALS = {
  ru: { achieved: 'Достигнута', partly: 'Частично', not: 'Не достигнута' },
  kk: { achieved: 'Орындалды', partly: 'Ішінара', not: 'Орындалмады' },
  en: { achieved: 'Achieved', partly: 'Partly', not: 'Not yet' },
}

export function goalResultLabel(result, lang) {
  return GOALS[reportLang(lang)][result] ?? ''
}

// Период — «N-й месяц (дни …)», а не «Уроки 8–14» из ТЗ: та формулировка
// осталась от правила «отчёт каждые 7 уроков», которое руководство заменило
// на 30 дней (20.10.2026).
export function periodLabel(periodNo, lang) {
  const n = Number(periodNo)
  if (!Number.isInteger(n) || n < 1) return ''
  const from = (n - 1) * 30 + 1
  const to = n * 30
  const l = reportLang(lang)
  if (l === 'en') return `Month ${n} (days ${from}–${to})`
  if (l === 'kk') return `${n}-ай (${from}–${to} күн)`
  return `${n}-й месяц (дни ${from}–${to})`
}

// Бейджи СЧИТАЕТ бэкенд (спека §3.4): они видны ещё в превью web-admin и в
// тексте WhatsApp, и правило в трёх местах разъехалось бы. Здесь — только
// подпись. Незнакомый тип молча пропускаем: бэкенд может добавить бейдж
// раньше, чем выйдет веб.
const BADGES = {
  perfect_attendance: { icon: '🔥', ru: () => 'Ни одного пропуска', kk: () => 'Бірде-бір сабақ жібермеді', en: () => 'Perfect attendance' },
  homework_hero: { icon: '📚', ru: () => 'Герой домашки', kk: () => 'Үй тапсырмасының чемпионы', en: () => 'Homework hero' },
  skills_growth: { icon: '📈', withN: true, ru: (n) => `Рост в ${n} навыках`, kk: (n) => `${n} дағдыда өсті`, en: (n) => `Grew in ${n} skills` },
  goals_achieved: { icon: '🎯', withN: true, ru: (n) => `${n} цели достигнуто`, kk: (n) => `${n} мақсат орындалды`, en: (n) => `${n} goals achieved` },
  months_with_jts: { icon: '🏅', withN: true, ru: (n) => `${n} мес. с JTS`, kk: (n) => `JTS-пен ${n} ай`, en: (n) => `${n} months with JTS` },
}

export function badgeView(badge, lang) {
  const b = BADGES[badge?.type]
  if (!b) return null
  // Бейдж с числом без числа — «Рост в undefined навыках»; лучше не показать.
  if (b.withN && !(Number.isInteger(badge.n) && badge.n > 0)) return null
  return { icon: b.icon, text: b[reportLang(lang)](badge.n) }
}

// Формат занятий прототип пишет по-английски на всех языках («1 to 1»,
// «Group») — так их называют в школе.
export function formatLabel(format, groupName) {
  if (format === 'group') return groupName ? `Group · ${groupName}` : 'Group'
  return '1 to 1'
}
