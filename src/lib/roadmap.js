// Калькулятор Roadmap: сколько уроков осталось до цели, за сколько недель студент
// их закроет и как режется его недельный фонд домашки по пяти тренажёрам JTS.
// Источник — ТЗ «Roadmap & AI Notification Engine» v2.0, разделы 4 и 5.
//
// Модуль намеренно чистый (никакой БД, сети и дат «сейчас»): те же входные данные
// обязаны давать тот же план и на сервере при генерации, и в браузере при
// предпросмотре в онбординге. Побочные эффекты — в вызывающем коде.
//
// Расхождение в ТЗ разрешено в пользу таблицы силлабуса (см. totalLessons):
// A0 → B1 — это 92 урока, а не 56 из приёмочного критерия QA №1.

// Лестница уровней. Порядок задаёт и сравнение «цель выше текущего», и порядок
// суммирования курсов.
export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']

// Уроков в курсе уровня (ТЗ п.4, «Кол-во уроков в силлабусе»). Ключ — уровень, с
// которого курс начинается: курс A0 «Beginner» ведёт с A0 на A1. У C1 курса нет —
// это верхняя цель, дальше вести некуда.
//
// Цифры сверены с контентом в public/course/<level>/steps-<n>.json (24/32/36/36/48)
// — расхождение ловит roadmap.test.js, чтобы правка курса не разъехалась с планом.
export const SYLLABUS_LESSONS = { A0: 24, A1: 32, A2: 36, B1: 36, B2: 48 }

// Коэффициент эффективности формата (ТЗ п.5.2). Меньше — быстрее дедлайн: час один
// на один плотнее самостоятельной работы, поэтому у него 0.8, а у self-study 1.2.
export const K_EFF = { self_study: 1.2, group: 1.0, individual_30: 0.9, individual_60: 0.8 }

export const LEARNING_FORMATS = Object.keys(K_EFF)

// Буфер на повторение материала (ТЗ п.5.4) — закладывается всегда, не опция.
export const REVISION_BUFFER = 1.15

// Для self-study урок не привязан к сессии с преподавателем, поэтому недельная
// пропускная способность считается по времени: 90 минут ≈ один урок (ТЗ п.5.1).
export const SELF_STUDY_LESSON_MINUTES = 90
export const DEFAULT_STUDY_DAYS_PER_WEEK = 5

// Потолок ускорения за домашку и её «цена» (ТЗ п.5.3): 600 минут ДЗ в неделю дают
// максимум −20% к сроку.
export const HW_MAX_ACCELERATION = 0.2
export const HW_REFERENCE_MINUTES = 600
export const HW_ACCELERATION_RATE = 0.15

// Доли недельного фонда по экосистеме (ТЗ п.5.5). Сумма долей = 1.
export const ECOSYSTEM_SHARES = {
  ai_tutor: 0.3,
  workbooks: 0.25,
  shadowing: 0.15,
  media_practice: 0.15,
  vocabulary_sr: 0.15,
}

export const ECOSYSTEM_MODULES = Object.keys(ECOSYSTEM_SHARES)

// Порядок раздачи остатка при РАВНЫХ дробных частях. Нужен потому, что доли
// 15/15/15 дают три одинаковых дробных хвоста, и «честный» largest remainder не
// определяет, кому достанется лишняя минута. Порядок подобран под приёмочный
// вектор QA №2 (210 мин → 63/53/31/31/32): при ничьей словарь идёт раньше
// шэдоуинга и медиа. Менять только вместе с этим тестом.
const REMAINDER_PRIORITY = ['ai_tutor', 'workbooks', 'vocabulary_sr', 'shadowing', 'media_practice']

export class RoadmapValidationError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'RoadmapValidationError'
    this.code = code // ложится в тело ответа 400, см. ТЗ п.2.2
  }
}

function levelIndex(level) {
  const i = LEVELS.indexOf(String(level || '').toUpperCase())
  if (i < 0) throw new RoadmapValidationError('UNKNOWN_LEVEL', `Unknown level: ${level}`)
  return i
}

// Сколько уроков отделяет текущий уровень от целевого: сумма курсов, каждый из
// которых поднимает на ступень (A0 → A1 → A2 → …). До B1 с нуля это A0+A1+A2 = 92.
//
// В ТЗ формула записана как «Σ Lessons(Level) для Level от Current до Target − 1»,
// а инженерный комментарий и QA №1 настаивают на 56 (только Beginner+Elementary).
// Прочтение «до Target − 1» нельзя применить как общее правило: для соседних
// уровней (B1 → B2 из квиза целей вполне достижимо) оно даёт ноль уроков и
// бессмысленный дедлайн. Решение по проекту: считаем по таблице силлабуса, 92.
export function totalLessons(currentLevel, targetLevel) {
  const from = levelIndex(currentLevel)
  const to = levelIndex(targetLevel)
  if (to <= from) {
    throw new RoadmapValidationError(
      'TARGET_NOT_ABOVE_CURRENT',
      'Target level must be higher than current level',
    )
  }
  let sum = 0
  for (let i = from; i < to; i += 1) sum += SYLLABUS_LESSONS[LEVELS[i]] || 0
  return sum
}

function nonNegative(value, field) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new RoadmapValidationError('INVALID_NUMBER', `${field} must be a non-negative number`)
  }
  return n
}

// Недельная пропускная способность в уроках (ТЗ п.5.1).
export function weeklyLessons({
  learningFormat,
  sessionsPerWeek = 0,
  homeworkMinutesPerDay = 0,
  studyDaysPerWeek = DEFAULT_STUDY_DAYS_PER_WEEK,
}) {
  if (!K_EFF[learningFormat]) {
    throw new RoadmapValidationError('UNKNOWN_FORMAT', `Unknown learning_format: ${learningFormat}`)
  }
  if (learningFormat === 'self_study') {
    const minutes = nonNegative(homeworkMinutesPerDay, 'homework_minutes_per_day')
    const days = nonNegative(studyDaysPerWeek, 'study_days_per_week')
    return (minutes * days) / SELF_STUDY_LESSON_MINUTES
  }
  return nonNegative(sessionsPerWeek, 'sessions_per_week')
}

// Ускорение за домашку (ТЗ п.5.3). У self-study время ДЗ уже сидит в пропускной
// способности, поэтому второй раз его не засчитываем — иначе двойной учёт.
export function hwAccelerationFactor(homeworkMinutesPerDay, learningFormat) {
  if (learningFormat === 'self_study') return 1
  const weekly = nonNegative(homeworkMinutesPerDay, 'homework_minutes_per_day') * 7
  const gain = Math.min(HW_MAX_ACCELERATION, (weekly / HW_REFERENCE_MINUTES) * HW_ACCELERATION_RATE)
  return 1 - gain
}

// Срок в целых неделях (ТЗ п.5.4). Округление вверх — часть недели всё равно
// занята, дедлайн ставим по её концу.
export function estimateWeeks({
  totalLessons: lessons,
  learningFormat,
  sessionsPerWeek = 0,
  homeworkMinutesPerDay = 0,
  studyDaysPerWeek = DEFAULT_STUDY_DAYS_PER_WEEK,
}) {
  const perWeek = weeklyLessons({
    learningFormat,
    sessionsPerWeek,
    homeworkMinutesPerDay,
    studyDaysPerWeek,
  })
  if (perWeek <= 0) {
    // Ни сессий с преподавателем, ни времени на самостоятельную работу — плана нет.
    throw new RoadmapValidationError(
      'NO_WEEKLY_CAPACITY',
      'Weekly capacity is zero: no lessons can be scheduled',
    )
  }
  const kEff = K_EFF[learningFormat]
  const kHw = hwAccelerationFactor(homeworkMinutesPerDay, learningFormat)
  const weeks = Math.ceil((lessons / perWeek) * kEff * kHw * REVISION_BUFFER)
  return { weeks, weeklyLessons: perWeek, kEff, kHw }
}

// Разбивка недельного фонда по модулям методом наибольшего остатка (ТЗ п.5.5):
// сумма обязана в точности равняться фонду, иначе студенту показывают цели,
// которые не сходятся с итогом на карточке.
export function splitEcosystemMinutes(weeklyMinutes) {
  const total = Math.trunc(nonNegative(weeklyMinutes, 'weekly_minutes'))
  const exact = {}
  const result = {}
  for (const key of ECOSYSTEM_MODULES) {
    exact[key] = total * ECOSYSTEM_SHARES[key]
    result[key] = Math.floor(exact[key])
  }
  let rest = total - ECOSYSTEM_MODULES.reduce((s, k) => s + result[k], 0)
  const queue = [...ECOSYSTEM_MODULES].sort((a, b) => {
    const fracDiff = exact[b] - result[b] - (exact[a] - result[a])
    if (Math.abs(fracDiff) > 1e-9) return fracDiff
    return REMAINDER_PRIORITY.indexOf(a) - REMAINDER_PRIORITY.indexOf(b)
  })
  for (let i = 0; rest > 0; i += 1, rest -= 1) result[queue[i % queue.length]] += 1
  return result
}

// 'YYYY-MM-DD' + n дней → 'YYYY-MM-DD'. Считаем в UTC: дедлайн — календарная дата,
// и она не должна прыгать на день от таймзоны сервера.
export function addDays(isoDate, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''))
  if (!m) throw new RoadmapValidationError('INVALID_DATE', 'start_date must be YYYY-MM-DD')
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Полный расчёт плана — то, что уходит в ответ POST /roadmap/generate (ТЗ п.8.1).
export function generateRoadmap({
  currentLevel,
  targetLevel,
  learningFormat,
  sessionsPerWeek = 0,
  homeworkMinutesPerDay = 0,
  studyDaysPerWeek = DEFAULT_STUDY_DAYS_PER_WEEK,
  startDate,
}) {
  const lessons = totalLessons(currentLevel, targetLevel)
  const { weeks, kEff, kHw, weeklyLessons: perWeek } = estimateWeeks({
    totalLessons: lessons,
    learningFormat,
    sessionsPerWeek,
    homeworkMinutesPerDay,
    studyDaysPerWeek,
  })
  // Нулевое ДЗ — законный кейс (ТЗ п.2.2): нормативы экосистемы обнуляются,
  // срок держится только на уроках с преподавателем.
  const weeklyMinutes = nonNegative(homeworkMinutesPerDay, 'homework_minutes_per_day') * 7
  const goals = splitEcosystemMinutes(weeklyMinutes)
  return {
    calculationResults: {
      totalLessonsRequired: lessons,
      lessonsPerWeek: perWeek,
      formatEfficiencyFactor: kEff,
      hwAccelerationFactor: kHw,
      estimatedWeeks: weeks,
      startDate,
      completionDate: addDays(startDate, weeks * 7),
    },
    weeklyEcosystemGoalsMinutes: { totalWeeklyMinutes: weeklyMinutes, ...goals },
  }
}
