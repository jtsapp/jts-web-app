// Раскладка «Практики». Вкладка — карточки по порядку; чем карточки отличаются, описывает practiceCatalog.js.
//
// С 18.11.2026 (задача 226 доски, файл методиста practice-categories.md «после созвона») вкладок пять — по навыкам:
// Аудирование, Говорение, Чтение, Письмо и Грамматика; подгрупп нет — у вкладки один общий список карточек, порядок —
// из файла. Игры из Практики ушли совсем: это отдельный пункт меню «Игры» (экран `games`, список — GAMES ниже).
// Сутки до того (#928, 17.11) письмо и грамматика были одной вкладкой `grammarWriting`, а игры — вкладкой `games`;
// сохранённая в сессии такая вкладка просто не находится — Практика откроется на «Аудировании».
//
// Карточка может стоять в двух вкладках (шэдоуинг и караоке — Аудирование и Говорение, сказки — Аудирование и
// Чтение, «Скорочтение» — Чтение и Говорение, Just to Listen и Cartoon World — Аудирование и Письмо, воркбуки —
// Письмо и Грамматика) — так задумано файлом, а не дубль.
//
// Literature World появился в develop позже файла методиста (17.11.2026) и в нём не упомянут: оставлен в «Чтении»,
// где и был, — после комиксов, перед сказками.

import { cardOf } from './practiceCatalog.js'

export const SKILLS = [
  { key: 'listening', groups: [{ cards: ['listenchoose', 'justListen', 'cartoons', 'memes', 'tales', 'shadowing', 'karaoke'] }] },
  { key: 'speaking', groups: [{ cards: ['situations', 'speakspin', 'pronunciation', 'shadowing', 'karaoke', 'speedReading'] }] },
  { key: 'reading', groups: [{ cards: ['reading', 'speedReading', 'books', 'comics', 'literature', 'tales'] }] },
  { key: 'writing', groups: [{ cards: ['writing', 'workbooks', 'justListen', 'cartoons'] }] },
  {
    key: 'grammar',
    groups: [{ cards: ['grammar', 'topics', 'tenses', 'verbs', 'prepositions', 'punctuation', 'partsofspeech', 'workbooks'] }],
  },
]

// Раздел меню «Игры» (экран `games`): шесть игр по порядку файла и чип «что тренирует» — ключ подписи
// `games.trains.<навык>`. Карточки — те же, что жили в Практике (practiceCatalog.js): обложка, токены, переход.
export const GAMES = [
  { id: 'listening', trains: ['listening'] },
  { id: 'words', trains: ['listening', 'words'] },
  { id: 'numbers', trains: ['listening', 'numbers'] },
  { id: 'speak', trains: ['speaking'] },
  { id: 'wordhunt', trains: ['words'] },
  { id: 'runner', trains: ['words', 'reaction'] },
]

/** Модули игр: переход «с фильтром» на такой модуль ведёт в раздел «Игры», а не в Практику. */
export const GAME_MODULES = new Set(GAMES.map((g) => cardOf(g.id).module))

// Вкладка-«дом» модуля, если первая по порядку ему не родная: «Скорочтение» стоит и в «Говорении» (оно раньше), но
// это чтение — переход с фильтром и «назад» без истории ведут в «Чтение».
const HOME = { speedReading: 'reading' }

export const SKILL_KEYS = SKILLS.map((s) => s.key)

// Ключи вкладок прежних раскладок → нынешние: так их ещё шлют сохранённые цели, ссылки и Луна. «Грамматика и письмо»
// (17.11.2026) и «Грамматика» до неё — в «Грамматику»; `games` вкладкой больше не бывает — App уводит его в «Игры».
const LEGACY_SKILL = { grammarWriting: 'grammar', grammarGames: 'grammar' }

/** Вкладка по ключу из перехода или null, если такой нет. */
export function skillKeyOf(key) {
  const k = LEGACY_SKILL[key] || key
  return SKILL_KEYS.includes(k) ? k : null
}

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
 * Луна). Модуль в нескольких вкладках (сказки, шэдоуинг, караоке, воркбуки…) открывается в первой, если не задан HOME.
 * Игр во вкладках нет — для них null (их место — раздел «Игры», см. GAME_MODULES).
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
