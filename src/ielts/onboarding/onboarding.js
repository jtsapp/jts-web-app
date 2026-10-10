// Онбординг и маршрут IELTS: варианты шагов (Figma 1.1–1.6), расчёт срока до цели и рекомендация маршрута (ТЗ §11.4).
// Чистые функции под тестами: экран только рисует то, что здесь посчитано.

export const PURPOSES = [
  { id: 'study', recommend: 'academic' },
  { id: 'immigration', recommend: 'general' },
  { id: 'work', recommend: 'general' },
  { id: 'school', recommend: 'academic' },
]
export const TRACKS = ['academic', 'general']
// Figma 1.3: цели с подсказкой, кому какой балл нужен; «8.0+» хранится как 8.0
export const TARGETS = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0]
export const TARGET_DEFAULT = 6.5
export const WINDOWS = ['1-2m', '3-6m', 'unknown']
export const DAILY = [30, 60, 90, 120]
export const DAILY_DEFAULT = 60
export const FAMILIARITY = [
  { id: 'new', level: 'light', next: 'guide' },
  { id: 'some', level: 'standard', next: 'quiz' },
  { id: 'exp', level: 'full', next: 'diagnostic' },
]
export const STEPS = ['purpose', 'track', 'target', 'date', 'daily', 'familiarity']

// §11.4: часы = разрыв × 160; занятий 6 в неделю. С преподавателем быстрее: 2 урока в неделю — в 1.6 раза,
// курс (3 урока и индивидуальная программа) — в 2 раза. Больше 2 баллов разрыва или 18 месяцев — срок не называем.
export const EST = { hoursPerBand: 160, weekDays: 6, mixSpeedup: 1.6, teacherSpeedup: 2, longGap: 2, longMonths: 18, weeksBelowMonths: 3 }
// Пока диагностики нет, разрыв неизвестен: считаем его как у неизмеренной секции (§10)
export const GAP_UNMEASURED = 1.5

/** Срок до цели: недели и месяцы при данном разрыве и времени в день; long — срок не называем. */
export function estimateTerm(gap, dailyMinutes, speedup = 1) {
  const hours = Math.max(0.5, gap) * EST.hoursPerBand
  const perWeek = ((dailyMinutes || 60) * EST.weekDays) / 60
  const weeks = perWeek > 0 ? hours / perWeek / speedup : 0
  const months = weeks / 4.345
  return {
    long: gap > EST.longGap || months > EST.longMonths,
    weeks: Math.max(1, Math.round(weeks)),
    months: Math.max(1, Math.round(months * 2) / 2),
  }
}

/** Успевает ли срок к дате экзамена. Даты нет — null («пока не знаю»). */
export function fitsExam(term, examDate, today = new Date()) {
  if (!examDate || term.long) return examDate ? false : null
  const days = Math.round((new Date(`${examDate}T00:00:00`) - new Date(today.toDateString())) / 86400000)
  return term.weeks * 7 <= days
}

export function bandGap(target, overall) {
  if (target == null || overall == null) return null
  return Math.max(0, Math.round((target - overall) * 10) / 10)
}

/**
 * Рекомендация маршрута — правила a–g §11.4 (как в прототипе): низкий старт, большой разрыв или близкий экзамен —
 * с преподавателем; разрыв в Writing/Speaking — микс; маленький разрыв — самостоятельно. После диагностики W/S ещё
 * не измерены (ждут ИИ), поэтому правило d молчит, пока их нет.
 */
export function recommendRoute(profile, today = new Date()) {
  const b = profile?.bands
  if (!b || b.overall == null) return null
  const target = Number(profile.targetBand) || 7
  const o = Number(b.overall)
  const gap = bandGap(target, o)
  const weeksLeft = profile.examDate ? Math.ceil((new Date(`${profile.examDate}T00:00:00`) - new Date(today.toDateString())) / 86400000 / 7) : null
  const ws = Math.max(b.writing == null ? 0 : target - b.writing, b.speaking == null ? 0 : target - b.speaking)
  if (o < 4.5) return { route: 'teacher', rule: 'a', gap }
  if (gap >= 1.5) return { route: 'teacher', rule: 'b', gap }
  if (weeksLeft != null && weeksLeft < 4 && gap >= 1.0) return { route: 'teacher', rule: 'c', gap }
  if (ws >= 1.0) return { route: target >= 7 ? 'teacher' : 'mix', rule: 'd', gap }
  if (gap <= 1.0) return { route: gap > 0.5 ? 'mix' : 'platform', rule: 'e', gap }
  return { route: 'platform', rule: 'g', gap }
}

/** Три маршрута экрана «Как дойти до цели» (Figma 3) со сроком каждого и тем, успевают ли они к экзамену. */
export function routeOptions(profile, today = new Date()) {
  const gap = bandGap(Number(profile?.targetBand) || 7, profile?.bands?.overall) ?? GAP_UNMEASURED
  const daily = profile?.dailyMinutes || 60
  return [
    { id: 'platform', speedup: 1 },
    { id: 'mix', speedup: EST.mixSpeedup },
    { id: 'teacher', speedup: EST.teacherSpeedup },
  ].map((r) => {
    const term = estimateTerm(gap, daily, r.speedup)
    return { ...r, term, fits: fitsExam(term, profile?.examDate, today) }
  })
}

// Квиз о формате (для «Что-то знаю»): шесть вопросов, ответ — номер варианта 1–4; тексты — ieltsOb.p.quiz.a<n>.*
export const QUIZ = [2, 3, 1, 4, 2, 3]
export const QUIZ_PASS = 4

/** Ответы формы онбординга → тело PUT /mobile/ielts/profile. */
export function onboardingBody(f) {
  return {
    purpose: f.purpose || null,
    track: f.track || 'academic',
    targetBand: f.target ?? TARGET_DEFAULT,
    examDate: f.window === 'date' ? f.examDate : null,
    examWindow: f.window || 'unknown',
    dailyMinutes: f.daily || DAILY_DEFAULT,
    familiarity: f.familiarity || null,
  }
}
