// Примерный урок для клиентского workspace (под-проект №1). Форма совместима с
// будущим выходом экстрактора HTML→JSON (под-проект №2).

export const SAMPLE_LESSON = {
  id: 'sample-a2-u4',
  unit: 'Unit 4 — Мой день',
  level: 'A2',
  durationSec: 3000, // 50:00
  teacher: { name: 'Дана' },
  topics: [
    { id: 't1', title: 'Разогрев' },
    { id: 't2', title: 'Правило' },
    { id: 't3', title: 'Практика' },
    { id: 't4', title: 'Применение' },
    { id: 't5', title: 'Финал' },
  ],
  steps: [
    { id: 's1', order: 1, title: 'Мой день, разминка', topicId: 't1', blocks: [
      { type: 'banner', title: 'Место для\nбаннера' },
      { type: 'theory', title: 'Present Simple: привычки и расписание', minutes: 7,
        text: 'Используем, когда действие повторяется: каждый день, по средам, никогда.',
        forms: [
          { label: 'I / you / we / they', example: 'work' },
          { label: 'he / she / it', example: 'works', accent: true },
        ],
        table: [
          { kind: 'Утверждение', example: 'She gets up at seven.', accent: 'gets' },
          { kind: 'Отрицание', example: "She doesn't get up at seven.", accent: "doesn't get" },
          { kind: 'Вопрос', example: 'Does she get up at seven?', accent: 'Does get' },
        ],
        mistake: 'В отрицании и вопросе -s уходит к does, а глагол остаётся чистым: Does she gets up? → Does she get up?' },
      { type: 'practice', title: 'Выбери верную форму', minutes: 5, hint: 'Один клик — сразу видно, попал или нет', questions: [
        { id: 'p1q1', type: 'choice', prompt: 'My brother ____ to the office by bus every morning.', options: ['commute', 'commutes', 'is commute'], answer: 'commutes' },
        { id: 'p1q2', type: 'chips', gapBefore: '', gapAfter: ' she rush in the mornings?', bank: ['Does', 'Do', 'Is'], answer: 'Does' },
        { id: 'p1q3', type: 'chips', gapBefore: 'We ', gapAfter: ' chores on Sundays.', bank: ["doesn't do", 'not do', "don't do"], answer: "don't do" },
      ] },
    ] },
    { id: 's2', order: 2, title: 'Слова дня', topicId: 't1', blocks: [
      { type: 'banner', title: 'Вторая часть\nурока' },
      { type: 'practice', title: 'Выбери верную форму', minutes: 5, questions: [
        { id: 'p2q1', type: 'gap', gapBefore: 'Alina ', gapAfter: ' (wake) up at 6:30 and grabs (grab) a bite.', answers: ['wakes'] },
        { id: 'p2q2', type: 'gap', gapBefore: 'Her father ', gapAfter: ' (not / drive) to work — he walks.', answers: ["doesn't drive", 'does not drive'] },
        { id: 'p2q3', type: 'gap', gapBefore: '', gapAfter: ' (do) you often wind (wind) down after 9 pm?', answers: ['Do'] },
      ] },
    ] },
    { id: 's3', order: 3, title: 'Правило Present Simple', topicId: 't2', blocks: [
      { type: 'theory', title: 'Правило', text: 'he / she / it → глагол + -s. Вопрос и отрицание через do/does.' },
    ] },
    { id: 's4', order: 4, title: 'Выбор формы', topicId: 't3', blocks: [
      { type: 'practice', title: 'Выбери верную форму', questions: [
        { id: 's4q1', type: 'choice', prompt: 'She ____ tea every evening.', options: ['drink', 'drinks'], answer: 'drinks' },
      ] },
    ] },
    { id: 's5', order: 5, title: 'Пропуски', topicId: 't3', blocks: [
      { type: 'practice', title: 'Заполни пропуск', questions: [
        { id: 's5q1', type: 'gap', gapBefore: 'They ', gapAfter: ' (play) football on Fridays.', answers: ['play'] },
      ] },
    ] },
    { id: 's6', order: 6, title: 'Порядок слов', topicId: 't4', blocks: [
      { type: 'practice', title: 'Собери вопрос', questions: [
        { id: 's6q1', type: 'chips', gapBefore: '', gapAfter: ' he like coffee?', bank: ['Does', 'Do'], answer: 'Does' },
      ] },
    ] },
    { id: 's7', order: 7, title: 'Чтение', topicId: 't4', blocks: [
      { type: 'theory', title: 'Чтение', text: 'Прочитай текст о распорядке дня и ответь на вопросы учителя в чате.' },
    ] },
    { id: 's8', order: 8, title: 'Разговор', topicId: 't5', blocks: [
      { type: 'theory', title: 'Разговор', text: 'Расскажи о своём типичном дне, используя Present Simple.' },
    ] },
    { id: 's9', order: 9, title: 'Итог урока', topicId: 't5', blocks: [
      { type: 'theory', title: 'Итог урока', text: 'Ты научился(ась) говорить о привычках и расписании в Present Simple. Молодец!' },
    ] },
  ],
  chat: [
    { id: 'm1', from: 'teacher', text: 'Открой шаг 4, начнём с него' },
    { id: 'm2', from: 'student', text: 'ок, вижу' },
    { id: 'm3', from: 'teacher', text: 'commute = добираться на работу, не путай с come' },
  ],
}
