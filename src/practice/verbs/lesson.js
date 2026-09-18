// Английские примеры урока «Разберись» — из разметки прототипа
// (data/jtsverbs.html, блок .lesson-language[data-language=en]). Во всех трёх
// языковых блоках они одинаковые, поэтому в словарь переводов не идут;
// объяснения к ним — ключи verbs.* в src/i18n.jsx.
//
// Если пример поменяли в прототипе, scripts/extract-verbs.test.js упадёт:
// он ищет каждую строку отсюда в английском блоке исходника.

export const HERO = ['go', 'went', 'gone']

// Цепочки «правильный / неправильный»: выделенная часть — то, что меняется.
export const COMPARE = {
  regular: [
    ['work', 'ed'],
    ['play', 'ed'],
  ],
  irregular: [
    ['go', 'went', 'gone'],
    ['buy', 'bought', 'bought'],
  ],
}

// Каждый пример — [до, форма, после]: форма подчёркнута.
export const FORM_CARDS = [
  {
    pill: 'V1',
    title: 'Base form',
    examples: [['I ', 'go', ' to school.'], ['Did you ', 'go', ' home?']],
    more: ['We can ', 'go', ' now.'],
  },
  {
    pill: 'V2',
    title: 'Past Simple',
    examples: [['I ', 'went', ' home yesterday.'], ['She ', 'bought', ' a book.']],
    more: ['We ', 'saw', ' a film last night.'],
  },
  {
    pill: 'V3',
    title: 'Past Participle',
    examples: [['She has ', 'gone', ' home.'], ['The house was ', 'built', ' in 1990.']],
    more: ['I have ', 'seen', ' this film.'],
  },
]

export const PATTERN_CARDS = [
  { id: 'AAA', chain: 'put → put → put', example: 'cut → cut → cut' },
  { id: 'ABB', chain: 'buy → bought → bought', example: 'think → thought → thought' },
  { id: 'ABA', chain: 'come → came → come', example: 'run → ran → run' },
  { id: 'ABC', chain: 'go → went → gone', example: 'sing → sang → sung' },
]

export const FIXES = [
  { wrong: 'I goed.', right: 'I went.' },
  { wrong: 'Did you went home?', right: 'Did you go home?' },
  { wrong: 'I have saw it.', right: 'I have seen it.' },
]

// Порядок вариантов — как в прототипе: он не случайный, верный стоит в
// разных местах у трёх вопросов.
export const QUIZ = [
  { text: 'Yesterday I ____ home.', choices: ['go', 'went', 'gone'], answer: 'went' },
  { text: 'Did you ____ it?', choices: ['saw', 'seen', 'see'], answer: 'see' },
  { text: 'I have ____ the film.', choices: ['see', 'saw', 'seen'], answer: 'seen' },
]
