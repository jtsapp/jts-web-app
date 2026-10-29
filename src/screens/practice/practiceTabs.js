// Раскладка «Практики» — редизайн 29.10.2026 (Figma «pitch JTS (Copy)», секция «Практика · редизайн» 7393:14225;
// спека docs/superpowers/specs/2026-10-29-practice-cards-redesign-design.md). Вкладка — группы, группа — карточки
// одного вида; чем карточки отличаются, описывает practiceCatalog.js. Порядок карточек — с экранов макета.
//
// Ключи вкладок прежние: на них стоят сессия, «назад» (navStack), переходы Луны и плитки «Главной». Пятая вкладка
// так и осталась `grammarGames`, хотя называется теперь «Грамматика»: кроме тем, в ней собраны игры из других
// вкладок и «Скорочтение» (карта переноса макета, 7404:4427). Подпись под ней — `sub`, а не «N тренажёров».
//
// Сказки — последняя карточка везде, где они есть (решение владельца 27.09.2026); макет это соблюдает.

import { cardOf } from './practiceCatalog.js'

export const SKILLS = [
  { key: 'listening', groups: [{ cards: ['listenchoose', 'justListen', 'cartoons', 'shadowing', 'karaoke', 'memes', 'tales'] }] },
  { key: 'reading', groups: [{ cards: ['reading', 'books', 'comics', 'tales'] }] },
  { key: 'writing', groups: [{ cards: ['grammar', 'prepositions', 'writing', 'verbs', 'workbooks'] }] },
  { key: 'speaking', groups: [{ cards: ['pronunciation', 'situations', 'speakspin', 'shadowing', 'karaoke', 'tales'] }] },
  {
    key: 'grammarGames',
    sub: 'practice.skillSub.grammarGames',
    groups: [
      { title: 'practice.group.trainers', cards: ['topics', 'speedReading'] },
      {
        title: 'practice.group.games',
        sub: 'practice.group.gamesSub',
        cards: ['listening', 'words', 'numbers', 'wordhunt', 'speak', 'runner'],
      },
    ],
  },
]

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
 * Луна). Модуль в нескольких вкладках (сказки, шэдоуинг, караоке) открывается в первой.
 */
export function skillOfModule(module) {
  const skill = SKILLS.find((s) => skillModules(s.key).includes(module))
  return skill ? skill.key : null
}

// Карточки-каталоги: открывают полный список раздела. Остальные ведут на свой экран, разворачивать их не во что.
export const EXPANDABLE = new Set(
  SKILLS.flatMap((s) => skillCards(s.key)).filter((id) => cardOf(id).list),
)
