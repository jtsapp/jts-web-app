// Данные макета (Figma «JTS-clone», Screen MS): ученик в середине подготовки.
// Нужны для ?ieltsSample=1 и тестов — проверить, что экран с полными данными
// выглядит как в макете. Тексты плана — русские, как в макете: в боевом плане
// их пришлёт бэкенд на языке ученика.
export const SAMPLE_DASHBOARD = {
  streakDays: 5,
  xp: 1240,
  level: 4,
  targetBand: 7,
  overall: 6,
  bands: { listening: 6.5, reading: 6, writing: null, speaking: null },
  forecast: { date: '2026-12-12', band: 6.5 },
  examDate: '2026-12-12',
  startDate: '2026-09-01',
  lessonToday: { time: '19:00' },
  roadmap: {
    currentPhase: 2,
    phases: [
      { milestonesDone: 3, milestonesTotal: 3 },
      { milestonesDone: 2, milestonesTotal: 4 },
      { eta: '2026-11-03' },
      { eta: '2026-11-24' },
    ],
  },
  vocabDue: 12,
  plan: [
    {
      id: 'reading-review',
      section: 'reading',
      title: 'Reading: повторение — Matching headings',
      reason: 'Последний раз тренировали 6 дн. назад',
      minutes: 15,
      done: true,
      target: 'ielts-reading',
    },
    {
      id: 'listening-spelling',
      section: 'listening',
      title: 'Listening: Тренировка правописания',
      reason: 'Написание слов — самая обидная потеря баллов в Listening',
      minutes: 15,
      recommended: true,
      target: 'ielts-listening',
    },
    {
      id: 'writing-task2',
      section: 'writing',
      title: 'Writing: эссе Task 2 с ИИ-проверкой',
      reason: 'До цели по Writing дальше всего — берём его чаще',
      minutes: 40,
      target: 'ielts-writing',
    },
    {
      id: 'speaking-part1',
      section: 'speaking',
      title: 'Speaking: Part 1 — 5 вопросов',
      reason: 'Тема «Work and studies» ещё не тренировали',
      minutes: 10,
      target: 'ielts-speaking',
    },
    {
      id: 'vocab-review',
      section: 'vocab',
      title: 'Словарь: повторить 12 слов',
      reason: 'К повторению готовы 12 слов из текстов Reading',
      minutes: 5,
      target: 'vocab',
    },
  ],
}
