// Раскладка «Практики» по навыкам — макет Figma «Макеты» (5316:1548), по
// экрану на вкладку, и таблица модулей по навыкам (секция «Практика»,
// 5316:1727).
//
// Порядок секций и их оформление взяты с экранов макета как есть, включая
// то, что выглядит непоследовательно: «Посмотреть все» у одной и той же
// секции бывает рамкой-пилюлей (`pill`) или простой ссылкой (`link`) в разных
// вкладках, а заголовки «Караоке» и «Ситуации» — 18px вместо 24px. Это
// сверено по узлам, а не на глаз; править надо макет, а не здесь.
//
// `modules` — какие тренажёры секция выводит (пара баннеров — два), по ним
// считается подпись «N тренажёров» на карточке навыка.

export const SKILLS = [
  {
    key: 'listening',
    sections: [
      { id: 'tales', all: 'pill' },
      { id: 'listenPair', modules: ['listening', 'listenchoose'] },
      // «Слов в картинках» на экране макета нет, хотя в таблице модулей они
      // стоят в Аудировании. Без баннера раздел пропал бы из Практики вовсе,
      // поэтому он здесь — во всю ширину, как баннер «Чтения».
      { id: 'words' },
      { id: 'shadowing', all: 'link' },
      { id: 'karaoke', all: 'pill', small: true },
      { id: 'memes', all: 'pill' },
    ],
  },
  {
    key: 'reading',
    sections: [
      { id: 'tales', all: 'pill' },
      { id: 'reading' },
      { id: 'books', all: 'pill' },
      { id: 'comics', all: 'pill' },
    ],
  },
  {
    key: 'writing',
    sections: [
      { id: 'grammar', all: 'pill' },
      { id: 'writePair', modules: ['writing', 'verbs'] },
      { id: 'workbooks', all: 'pill' },
    ],
  },
  {
    key: 'speaking',
    sections: [
      { id: 'tales', all: 'link' },
      { id: 'shadowing', all: 'link' },
      { id: 'situations', all: 'pill', small: true },
      { id: 'karaoke', all: 'pill', small: true },
    ],
  },
]

export const SKILL_KEYS = SKILLS.map((s) => s.key)

const modulesOf = (section) => section.modules || [section.id]

/** Тренажёры навыка — для подписи на карточке. */
export function skillModules(key) {
  const skill = SKILLS.find((s) => s.key === key)
  return skill ? skill.sections.flatMap(modulesOf) : []
}

/**
 * Вкладка, где живёт модуль: для перехода «с фильтром» (плитка «Книги» на
 * Главной, выдача из домашней работы). Модуль в нескольких вкладках (сказки,
 * шэдоуинг, караоке) открывается в первой — там, где он стоит в таблице
 * модулей первым.
 */
export function skillOfModule(module) {
  const skill = SKILLS.find((s) => s.sections.some((sec) => modulesOf(sec).includes(module)))
  return skill ? skill.key : null
}

// Секции, у которых есть полный список по «Посмотреть все». Баннеры ведут на
// свой экран и развернуть их не во что.
export const EXPANDABLE = new Set([
  'tales',
  'shadowing',
  'karaoke',
  'memes',
  'books',
  'comics',
  'grammar',
  'workbooks',
  'situations',
])
