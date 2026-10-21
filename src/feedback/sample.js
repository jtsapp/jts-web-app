// Образец отчётов — данные прототипа (data/jts-progress-report.html) в форме
// ответа API (спека §3.2). Нужен, пока бэкенда нет: посмотреть вид по
// ?screen=lessons&tab=reports&reportSample=1 и /report/sample. Имена
// выдуманные: в очереди прототипа — настоящие ученики.
//
// Только на локалке и дев-стендах — тот же признак адреса, что у ?ieltsSample=1:
// на проде ученик, дописав параметр, увидел бы чужой выдуманный отчёт как свой.

export const SAMPLE_TOKEN = 'sample'

const STUDENT = 'Айша Тестова'
const TEACHER = 'Test Teacher'

const FIRST = {
  id: 1,
  periodNo: 1,
  periodStart: '2026-08-02',
  periodEnd: '2026-08-31',
  lang: 'ru',
  studentName: STUDENT,
  teacherName: TEACHER,
  level: 'A1',
  format: 'individual',
  groupName: null,
  unitsText: 'Unit 1 — Lessons 1–5',
  attendance: { done: 8, planned: 8 },
  homeworkPct: 92,
  skills: [
    { key: 'speaking', score: 3, prev: null },
    { key: 'listening', score: 3, prev: null },
    { key: 'reading', score: 3, prev: null },
    { key: 'writing', score: 2, prev: null },
    { key: 'grammar', score: 3, prev: null },
    { key: 'vocabulary', score: 3, prev: null },
  ],
  strengths: ['Не боится говорить'],
  improvements: ['Артикли'],
  motivation: 'Маленькие шаги каждый день = большой результат.',
  badges: [{ type: 'perfect_attendance' }, { type: 'homework_hero' }],
  pastGoals: [],
  nextGoals: ['Выучить числа до 100', 'Рассказать о себе 5 предложениями', 'Домашка каждый урок'],
  plan: 'Unit 2: Present Simple, лексика «Family».',
  publishedAt: '2026-09-02T09:40:00+05:00',
  seenAt: '2026-09-02T19:05:00+05:00',
}

export const SAMPLE_REPORT = {
  id: 2,
  periodNo: 2,
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  lang: 'ru',
  studentName: STUDENT,
  teacherName: TEACHER,
  level: 'A1',
  format: 'individual',
  groupName: null,
  unitsText: 'Unit 2 — Lessons 1–6',
  attendance: { done: 8, planned: 9 },
  homeworkPct: 85,
  skills: [
    { key: 'speaking', score: 4, prev: 3 },
    { key: 'listening', score: 3, prev: 3 },
    { key: 'reading', score: 4, prev: 3 },
    { key: 'writing', score: 3, prev: 2 },
    { key: 'grammar', score: 3, prev: 3 },
    { key: 'vocabulary', score: 4, prev: 3 },
  ],
  strengths: ['Активен на уроке', 'Быстро учит слова', 'Хорошо запоминает новые слова и уверенно использует их в диалогах.'],
  improvements: ['Времена глаголов', 'Окончание -s в Present Simple (he works, she likes).'],
  motivation: 'Ты делаешь огромные шаги — так держать!',
  // Посчитано правилами спеки §3.4: выросли 4 навыка, 2 цели достигнуты,
  // 2-й месяц; посещаемость 8/9 и домашки 85% бейджей не дают.
  badges: [{ type: 'skills_growth', n: 4 }, { type: 'goals_achieved', n: 2 }, { type: 'months_with_jts', n: 2 }],
  pastGoals: [
    { text: 'Выучить числа до 100', result: 'achieved' },
    { text: 'Рассказать о себе 5 предложениями', result: 'achieved' },
    { text: 'Домашка каждый урок', result: 'partly' },
  ],
  nextGoals: ['Без ошибок в -s (he works)', 'Выучить 30 новых слов'],
  plan: 'Unit 3: Present Simple — вопросы и отрицания, лексика «Daily routine». 10 минут в день на приложение Vocabulary.',
  publishedAt: '2026-10-02T10:15:00+05:00',
  seenAt: null,
}

export const SAMPLE_REPORTS = { 1: FIRST, 2: SAMPLE_REPORT }

export const SAMPLE_LIST = [SAMPLE_REPORT, FIRST].map((r) => ({
  id: r.id,
  periodNo: r.periodNo,
  periodStart: r.periodStart,
  periodEnd: r.periodEnd,
  level: r.level,
  teacherName: r.teacherName,
  publishedAt: r.publishedAt,
  seenAt: r.seenAt,
}))

export function sampleAllowed(hostname) {
  return /^(localhost|127\.0\.0\.1|dev-)/.test(hostname || '')
}

// Читать в эффекте или обработчике, а не при рендере: на сервере window нет,
// и SSR разошёлся бы с клиентом.
export function wantsReportSample() {
  try {
    if (!sampleAllowed(window.location.hostname)) return false
    return new URLSearchParams(window.location.search).get('reportSample') === '1'
  } catch {
    return false
  }
}
