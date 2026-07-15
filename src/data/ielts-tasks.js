// Bundled IELTS Listening/Reading/Speaking tasks (v1) — authored by the
// methodology team. Answer-key graded by lib/ielts/key-grading.js; no LLM.
// Ported from felix data/ielts-tasks.ts (TS types dropped, data verbatim).
//
// AUTHORING RULES:
//  - every listening part's `script` must stay ≤800 chars — the
//    /api/listening-audio TTS route rejects longer texts;
//  - gap `accept` lists every variant we take (compared AFTER normalization:
//    lowercase, articles/$ stripped, number-words mapped — see normalizeAnswer);
//  - the script is NEVER shown in the UI, only played.
//
// Question shapes:
//   gap  → { kind, id, prompt (blank written "___"), accept: [], display }
//   mcq  → { kind, id, prompt, options: [{key:'A'|'B'|'C', text}], answer }
//   tfng → { kind, id, statement, answer: 'TRUE'|'FALSE'|'NOT GIVEN' }

export const IELTS_LISTENING_TASK = {
  id: 'listening-v1',
  parts: [
    {
      id: 'part-a',
      title: 'Part 1 · Form Completion',
      context:
        'Студентка звонит агенту по аренде жилья. Заполни заметки агента по ходу разговора.',
      instructions:
        'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
      script:
        'Hello, my name is Sarah Jenkins. I am looking for a place to rent for about 6 months while I complete my short course. I’d really love to live near the university so I don’t waste time commuting. My maximum budget is 800 dollars per month. Also, it’s very important for me that the apartment has a balcony and, of course, high-speed internet for my studies.',
      questions: [
        {
          kind: 'gap',
          id: 'l1',
          prompt: 'Length of stay: ___ months',
          accept: ['6', 'six'],
          display: '6 (six)',
        },
        {
          kind: 'gap',
          id: 'l2',
          prompt: 'Preferred location: Near the ___',
          accept: ['university'],
          display: 'university',
        },
        {
          kind: 'gap',
          id: 'l3',
          prompt: 'Maximum budget: $ ___ per month',
          accept: ['800', 'eight hundred'],
          display: '800',
        },
        {
          kind: 'gap',
          id: 'l4',
          prompt: 'Required facilities: Must have a ___ and high-speed internet',
          accept: ['balcony'],
          display: 'balcony',
        },
      ],
    },
    {
      id: 'part-b',
      title: 'Part 2 · Multiple Choice',
      context: 'Объявление для студентов в университете о новом спортивном центре.',
      instructions: 'Choose the correct letter, A, B or C.',
      script:
        'Welcome, students! We are excited to announce that our brand-new sports center is completed. While the grand opening ceremony was originally planned for Thursday, it has been moved to Saturday morning. We have great news: the gym will be completely free to use for all students who live on campus, while off-campus students will need a premium membership.',
      questions: [
        {
          kind: 'mcq',
          id: 'l5',
          prompt: 'The new sports center will officially open on:',
          options: [
            { key: 'A', text: 'Monday' },
            { key: 'B', text: 'Thursday' },
            { key: 'C', text: 'Saturday' },
          ],
          answer: 'C',
        },
        {
          kind: 'mcq',
          id: 'l6',
          prompt: 'The gym is free to use for all students who:',
          options: [
            { key: 'A', text: 'Live on campus' },
            { key: 'B', text: 'Study sports sciences' },
            { key: 'C', text: 'Have a premium membership' },
          ],
          answer: 'A',
        },
      ],
    },
  ],
}

export const IELTS_READING_TASK = {
  id: 'reading-ai-education-v1',
  title: 'AI in Education',
  passage:
    'The integration of Artificial Intelligence (AI) in education has accelerated significantly over the past three years. Many teachers report that personalized AI tutors help students learn languages 40% faster by adapting to their individual pace. However, critics argue that relying too heavily on technology might decrease human interaction in classrooms.',
  instructions: {
    tfng: 'Do the following statements agree with the information in the passage? Choose TRUE, FALSE or NOT GIVEN.',
    gap: 'Complete the sentences below. Write NO MORE THAN TWO WORDS from the passage for each answer.',
  },
  questions: [
    {
      kind: 'tfng',
      id: 'r1',
      statement: 'AI tutors customize the learning speed for each individual student.',
      answer: 'TRUE',
    },
    {
      kind: 'tfng',
      id: 'r2',
      statement: 'Most students prefer AI tutors over human teachers.',
      answer: 'NOT GIVEN',
    },
    {
      kind: 'gap',
      id: 'r3',
      prompt:
        "According to teachers, language learning can be accelerated by AI tutors because they adapt to a student's ___.",
      accept: ['individual pace', 'pace'],
      display: 'individual pace',
    },
    {
      kind: 'gap',
      id: 'r4',
      prompt: 'Some critics are worried about a reduction in ___ within classrooms.',
      accept: ['human interaction', 'interaction'],
      display: 'human interaction',
    },
  ],
}

// ---- Speaking (spoken test — Azure pronunciation + Sonnet language) --------

export const IELTS_SPEAKING_TASK = {
  id: 'speaking-v1',
  // Short warm-up questions (recorded one at a time, brief answers).
  part1: [
    { id: 's1', question: 'Do you work or are you a student?' },
    { id: 's2', question: 'Why did you choose this profession or field of study?' },
  ],
  // Cue card monologue — 1 min prep, 2 min talk (the pronunciation sample).
  part2: {
    id: 's3',
    prompt: 'Describe a website or an app that helped you learn something new.',
    bullets: [
      'what the app is',
      'how often you use it',
      'what you learned from it',
      'and explain why you think it is useful',
    ],
    prepSeconds: 60,
    speakSeconds: 120,
  },
}

// Lookup used by the record-section route to re-grade server-side.
export function ieltsTaskById(taskId) {
  if (taskId === IELTS_LISTENING_TASK.id) {
    return {
      section: 'listening',
      questions: IELTS_LISTENING_TASK.parts.flatMap((p) => p.questions),
    }
  }
  if (taskId === IELTS_READING_TASK.id) {
    return { section: 'reading', questions: IELTS_READING_TASK.questions }
  }
  return null
}
