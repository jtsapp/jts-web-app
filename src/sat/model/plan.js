// Календарь плана SAT на экране (Figma SAT 13–14): даты, сетка месяца, статусы занятий и карта диагностики.
// Фазы и недели курса считает сервер (SatRoadmap, ТЗ 21.10.2026); экрана выбора дней и его сводки больше нет (3.1).


/** Дата → «ГГГГ-ММ-ДД» по местному календарю (не UTC: в Алматы UTC-дата вечером была бы уже завтрашней). */
export function iso(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** «ГГГГ-ММ-ДД» → полночь этой даты по местному времени. */
export function parse(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return x
}

/** Понедельник недели, в которой лежит дата. */
export function monday(d) {
  const dow = (d.getDay() + 6) % 7
  return addDays(d, -dow)
}

/** Номер дня недели 1 (пн) … 7 (вс). */
export function dow(d) {
  return ((d.getDay() + 6) % 7) + 1
}

/** Все занятия плана подряд. */
export function allLessons(plan) {
  return (plan?.weeks || []).flatMap((w) => w.lessons.map((l) => ({ ...l, week: w.index })))
}

/** Следующее занятие: ближайшее несделанное с сегодняшнего дня (сегодняшнее — первым). */
export function nextLesson(plan, todayIso) {
  return allLessons(plan)
    .filter((l) => (l.status === 'planned' || l.status === 'moved') && l.date >= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0] || null
}

/** Статус для легенды Figma 13: выполнено · следующее · запланировано · пропущено · перенесено. */
export function shownStatus(lesson, next) {
  if (lesson.status === 'done') return 'done'
  if (lesson.status === 'skipped') return 'skipped'
  if (next && lesson.id === next.id) return 'next'
  if (lesson.status === 'moved') return 'moved'
  return 'planned'
}

/**
 * Сетка месяца (Figma 14): строки-недели с понедельника, в каждой — 7 дней с занятиями этого дня и меткой недели
 * плана, если она есть. Дни соседних месяцев остаются в строке (бледными), чтобы неделя читалась целиком.
 */
export function monthGrid(plan, year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const byDate = new Map()
  for (const l of allLessons(plan)) {
    if (!byDate.has(l.date)) byDate.set(l.date, [])
    byDate.get(l.date).push(l)
  }
  const rows = []
  for (let m = monday(first); m <= last; m = addDays(m, 7)) {
    const mIso = iso(m)
    const week = (plan?.weeks || []).find((w) => w.monday === mIso) || null
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(m, i)
      const dIso = iso(d)
      days.push({ date: dIso, day: d.getDate(), inMonth: d.getMonth() === month, lessons: byDate.get(dIso) || [] })
    }
    rows.push({ monday: mIso, week, days })
  }
  return rows
}

/** Сколько занятий в месяце (бейдж «17 занятий» у Figma 14). */
export function lessonsInMonth(plan, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  return allLessons(plan).filter((l) => l.date.startsWith(prefix)).length
}

/**
 * Карта диагностики по полосам (Figma 9): начинать отсюда · шатко · уверенно; внутри — от слабого к сильному, при
 * равенстве — порядок экзамена.
 */
export function bands(domains) {
  const order = { weak: 0, shaky: 1, strong: 2 }
  const out = { weak: [], shaky: [], strong: [] }
  ;(domains || []).forEach((d, i) => out[d.band]?.push({ ...d, order: i, share: d.total ? d.correct / d.total : 0 }))
  for (const k of Object.keys(order)) out[k].sort((a, b) => a.share - b.share || a.order - b.order)
  return out
}

