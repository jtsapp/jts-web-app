// Расчёты главного экрана IELTS («Сегодня»). Чистые функции без React и сети:
// данные (баллы, XP, серия, дата экзамена) приедут с бэкенда позже, а правила
// счёта взяты из ТЗ раздела (JTS_IELTS_TZ_v1_3, §11, §17, §19.4) и от источника
// не зависят. Любое поле может быть null — «ещё не измерено», и каждая функция
// обязана это пережить, а не показать ученику 0 или NaN.

export const SECTIONS = ['listening', 'reading', 'writing', 'speaking']

// Writing и Speaking оценивает ИИ (ТЗ §14.3, §15.4). Пока балла нет, строка
// секции говорит «оценит ИИ», а не «нет данных»: ученик ничего не пропустил.
export const AI_GRADED = new Set(['writing', 'speaking'])

// Округление band по ТЗ §17.3: .25 → .5, .75 → вверх до целого, .125 → вниз.
// Ровно это и делает Math.round(x * 2) / 2.
export function roundBand(x) {
  if (x == null || !Number.isFinite(x)) return null
  return Math.round(x * 2) / 2
}

// Overall — среднее четырёх секций (§17.3). Бэкенд/диагностика отдают его
// готовым, но если нет — считаем по измеренным секциям: после диагностики
// Writing и Speaking ждут ИИ, а оценку ученик должен увидеть уже сейчас.
export function overallBand(overall, bands) {
  if (overall != null) return roundBand(overall)
  const measured = SECTIONS.map((s) => bands?.[s]).filter((b) => b != null && Number.isFinite(b))
  if (!measured.length) return null
  return roundBand(measured.reduce((a, b) => a + b, 0) / measured.length)
}

export function bandGap(overall, target) {
  if (overall == null || target == null) return null
  return Math.max(0, roundBand(target - overall))
}

// Полоса секции — доля шкалы band 0–9.
export function bandShare(band) {
  if (band == null) return 0
  return Math.min(1, Math.max(0, band / 9))
}

// Band всегда с одним знаком: «6.0», а не «6».
export function formatBand(band) {
  return band == null ? '—' : band.toFixed(1)
}

// XP: 1 000 на уровень (§19.4). Если бэкенд пришлёт уровень сам — верим ему.
export const XP_PER_LEVEL = 1000
export function xpLevel(xp, level) {
  if (level != null) return level
  if (xp == null) return null
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

// 1240 → «1 240» (как XP в макете и монеты в сайдбаре).
export function groupNumber(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Даты сравниваем по календарным дням, а не по миллисекундам: «через 75 дней»
// не должно меняться в течение одного дня.
function dayIndex(d) {
  const x = d instanceof Date ? d : new Date(d)
  return Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86400000)
}

export function daysUntil(date, today = new Date()) {
  if (!date) return null
  return dayIndex(date) - dayIndex(today)
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Сводка плана: сколько закрыто, сколько всего и сколько осталось минут.
export function planSummary(tasks = []) {
  let total = 0
  let left = 0
  let done = 0
  for (const t of tasks) {
    const m = t.minutes || 0
    total += m
    if (t.done) done += 1
    else left += m
  }
  return { done, count: tasks.length, totalMinutes: total, leftMinutes: left }
}

// «Начните с этого» — первая незакрытая задача, если план явно не назвал
// другую. Так подсказка не остаётся висеть на уже сделанном.
export function recommendedTaskId(tasks = []) {
  const explicit = tasks.find((t) => t.recommended && !t.done)
  if (explicit) return explicit.id
  return tasks.find((t) => !t.done)?.id ?? null
}

// Фазы roadmap (§11, блок 2). Длительности пропорциональны сроку: при 12
// неделях 2/4/3/3 — отсюда доли.
export const ROADMAP_PHASES = ['format', 'skill', 'speed', 'exam']
const PHASE_SHARES = [2, 4, 3, 3]

// Даты начала фаз 2–4 между стартом подготовки и экзаменом. Без даты экзамена
// фазы идут по вехам, а не по датам (§11), — тогда null.
export function phaseStartDates(startDate, examDate) {
  if (!startDate || !examDate) return null
  const span = dayIndex(examDate) - dayIndex(startDate)
  if (span <= 0) return null
  const sum = PHASE_SHARES.reduce((a, b) => a + b, 0)
  const starts = []
  let acc = 0
  for (const share of PHASE_SHARES) {
    starts.push(addDays(startDate, Math.round((acc / sum) * span)))
    acc += share
  }
  return starts
}

// Фазы для отрисовки: статус каждой (done/current/upcoming), вехи и ориентир.
// `roadmap` — что известно о прохождении (с бэкенда); без него ученик в первой
// фазе — он ещё не прошёл ни формат, ни диагностику.
export function roadmapView(roadmap, { examDate, startDate } = {}) {
  const current = roadmap?.currentPhase ?? 1
  const starts = phaseStartDates(startDate, examDate)
  return ROADMAP_PHASES.map((key, i) => {
    const n = i + 1
    const info = roadmap?.phases?.[i] || {}
    const status = n < current ? 'done' : n === current ? 'current' : 'upcoming'
    return {
      key,
      n,
      status,
      milestonesDone: info.milestonesDone ?? null,
      milestonesTotal: info.milestonesTotal ?? null,
      eta: info.eta ?? starts?.[i] ?? null,
    }
  })
}
