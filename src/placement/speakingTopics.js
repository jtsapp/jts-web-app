// Темы говорения теста уровня (решение 14.10.2026: «как SpeakSpin — тема, подготовка, запись до трёх минут»).
//
// Модуль общий для экрана и сервера: экран показывает тему и подсказки, сервер берёт текст темы ПО id (в промпт
// грейдера не должно попасть ничего, что прислал браузер). Полоса темы — по уровню, который тест уже намерил
// (грамматика, чтение, аудирование): ученику A1 нельзя давать «обсудите плюсы и минусы удалённой работы», а B2 —
// «расскажи о своей семье», иначе запись не покажет его потолок.

export const PREP_SECONDS = 60
export const MAX_SECONDS = 180
// Короче — оценивать нечего: пара фраз не покажет уровень, а грейдер всё равно его назовёт.
export const MIN_SECONDS = 15

const BANDS = ['A1', 'A2', 'B1', 'B2', 'C1']

export const TOPICS = [
  {
    id: 'a1-family',
    band: 'A1',
    prompt: 'Tell me about yourself and your family.',
    hints: ['Your name, age and city', 'Who is in your family', 'What they do', 'What you like to do together'],
  },
  {
    id: 'a1-day',
    band: 'A1',
    prompt: 'Describe your usual day.',
    hints: ['When you get up', 'What you do in the morning', 'Work or study', 'What you do in the evening'],
  },
  {
    id: 'a2-weekend',
    band: 'A2',
    prompt: 'Tell me about your last weekend.',
    hints: ['Where you went', 'Who you were with', 'What you did', 'Did you like it? Why?'],
  },
  {
    id: 'a2-place',
    band: 'A2',
    prompt: 'Describe your favourite place in your city.',
    hints: ['Where it is', 'What it looks like', 'What people do there', 'Why you like it'],
  },
  {
    id: 'b1-learning',
    band: 'B1',
    prompt: 'Why are you learning English, and how do you plan to use it?',
    hints: ['Your main reason', 'A situation when you needed English', 'Your plans', 'What is hard for you'],
  },
  {
    id: 'b1-trip',
    band: 'B1',
    prompt: 'Talk about a trip that you remember well.',
    hints: ['Where and when', 'What happened', 'A problem or a surprise', 'What you learned'],
  },
  {
    id: 'b2-remote',
    band: 'B2',
    prompt: 'Is working from home better than working in an office? Give your opinion.',
    hints: ['Advantages', 'Disadvantages', 'An example from your life', 'Your conclusion'],
  },
  {
    id: 'b2-technology',
    band: 'B2',
    prompt: 'How has technology changed the way people communicate? Is it a good change?',
    hints: ['What changed', 'Positive effects', 'Negative effects', 'Your position'],
  },
  {
    id: 'c1-education',
    band: 'C1',
    prompt: 'Should universities focus on practical skills or on academic knowledge? Discuss.',
    hints: ['Arguments for each side', 'A real example', 'Who benefits and who loses', 'A balanced conclusion'],
  },
  {
    id: 'c1-cities',
    band: 'C1',
    prompt: 'Big cities are growing every year. What problems does this create, and how could they be solved?',
    hints: ['Main problems', 'Their causes', 'Possible solutions', 'Which solution is realistic and why'],
  },
]

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]))

export function topicById(id) {
  return BY_ID.get(id) || null
}

/**
 * Полоса темы по уровням, которые намерил тест: медиана из известных (A0 — к A1, у A0 своих тем нет). Без уровней —
 * A2: средняя тема не отпугнёт новичка и не покажется издёвкой продвинутому.
 */
export function bandFor(levels = []) {
  const ranks = levels
    .map((l) => (l === 'A0' ? 'A1' : l))
    .map((l) => BANDS.indexOf(l))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)
  if (!ranks.length) return 'A2'
  return BANDS[ranks[Math.floor((ranks.length - 1) / 2)]]
}

/** Тема полосы; seed в [0, 1) выбирает одну из двух, чтобы пересдача не давала ту же тему наизусть. */
export function pickTopic(levels, seed = 0) {
  const band = bandFor(levels)
  const list = TOPICS.filter((t) => t.band === band)
  return list[Math.min(list.length - 1, Math.floor(seed * list.length))]
}
