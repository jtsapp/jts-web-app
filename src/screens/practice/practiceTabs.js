// Раскладка «Практики». Вкладка — карточки по порядку; чем карточки отличаются, описывает practiceCatalog.js.
//
// С 17.11.2026 (задача 226 доски, файл методиста practice-categories.md) вкладок пять: Аудирование, Говорение,
// Чтение, «Грамматика и письмо» и «Игры»; подгрупп нет — у каждой вкладки один общий список карточек, порядок —
// из файла. Прежние «Письмо» (`writing`) и «Грамматика» (`grammarGames`, в ней жили и темы, и игры) ушли: письмо и
// грамматика слились в `grammarWriting`, игры получили свою вкладку `games`. Сохранённая в сессии старая вкладка
// просто не находится — Практика откроется на «Аудировании».
//
// Карточка может стоять в двух вкладках (шэдоуинг, караоке, сказки, «Скорочтение», мини-игра Listening, «Слова в
// картинках», «Числа», Speak or Die, «Три формы глагола») — так задумано файлом, а не дубль.
//
// Literature World появился в develop позже файла методиста (17.11.2026) и в нём не упомянут: оставлен в «Чтении»,
// где и был, — после комиксов, перед сказками.

import { cardOf } from './practiceCatalog.js'

export const SKILLS = [
  {
    key: 'listening',
    groups: [{ cards: ['listenchoose', 'justListen', 'cartoons', 'memes', 'tales', 'shadowing', 'karaoke', 'listening', 'numbers', 'words'] }],
  },
  { key: 'speaking', groups: [{ cards: ['situations', 'speakspin', 'pronunciation', 'shadowing', 'karaoke', 'speedReading', 'speak'] }] },
  { key: 'reading', groups: [{ cards: ['reading', 'speedReading', 'books', 'comics', 'literature', 'tales'] }] },
  {
    key: 'grammarWriting',
    groups: [{ cards: ['grammar', 'topics', 'tenses', 'verbs', 'prepositions', 'punctuation', 'partsofspeech', 'writing', 'workbooks'] }],
  },
  { key: 'games', groups: [{ cards: ['listening', 'words', 'numbers', 'wordhunt', 'speak', 'runner', 'verbs'] }] },
]

// Вкладка-«дом» модуля, если первая по порядку ему не родная: «Скорочтение» стоит и в «Говорении» (оно раньше), но
// это чтение — переход с фильтром и «назад» без истории ведут в «Чтение».
const HOME = { speedReading: 'reading' }

export const SKILL_KEYS = SKILLS.map((s) => s.key)

/** Карточки вкладки по порядку. */
export function skillCards(key) {
  const skill = SKILLS.find((s) => s.key === key)
  return skill ? skill.groups.flatMap((g) => g.cards) : []
}

/** Тренажёры вкладки — для подписи «N тренажёров»; две карточки «Аркады» — один тренажёр. */
export function skillModules(key) {
  return [...new Set(skillCards(key).map((id) => cardOf(id).module))]
}

/**
 * Вкладка, где живёт модуль: для перехода «с фильтром» (плитка «Книги» на Главной, выдача из домашней работы,
 * Луна). Модуль в нескольких вкладках (сказки, шэдоуинг, караоке, игры) открывается в первой, если не задан HOME.
 */
export function skillOfModule(module) {
  if (HOME[module]) return HOME[module]
  const skill = SKILLS.find((s) => skillModules(s.key).includes(module))
  return skill ? skill.key : null
}

// Карточки-каталоги: открывают полный список раздела. Остальные ведут на свой экран, разворачивать их не во что.
export const EXPANDABLE = new Set(
  SKILLS.flatMap((s) => skillCards(s.key)).filter((id) => cardOf(id).list),
)
