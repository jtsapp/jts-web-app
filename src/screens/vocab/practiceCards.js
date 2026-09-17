// Карточки урока каталога → то, что практика «Словаря» реально спрашивает.

import { vocabKey } from './vocabLearned.js'

/**
 * Карточка каталога — единица ПОКАЗА, а спрашиваемая единица — атом (так
 * устроен файл словаря: `lesson.atoms`, у каждого свои перевод, предложение с
 * пропуском `ctx` и флаги). У «Father, mother» два атома — father и mother;
 * у «Numbers 0–20» их двадцать один. Пример такой карточки бэкенд берёт у
 * ПЕРВОГО атома («My ___ is a doctor»), а проверка ждала в этот пропуск всю
 * строку «Father, mother»: ученик вписывал верное father — и получал ошибку.
 * В A0 таких карточек большинство, всего по каталогу — 113.
 *
 * Поэтому из карточки с несколькими атомами берём один (случайный: за
 * несколько заходов пройдутся все) и спрашиваем его целиком — слово, перевод
 * и предложение от одного атома. Ключ остаётся ключом карточки: «изучено» и
 * счётчики уроков считают карточки.
 *
 * Карточке из одного атома оставляем её собственные подписи (их ученик видит
 * в списке слов: «Сто», а не атомное «100»), а с атома берём только то, чего
 * у карточки нет, и флаг `nogap` — «в предложении видно само слово, пропуск
 * там не спрашивать» (call stack: «Each function call pushes…»).
 */
export function practiceCardsOf(lesson, rng = Math.random) {
  const cards = Array.isArray(lesson?.cards) ? lesson.cards : []
  const atoms = new Map((Array.isArray(lesson?.atoms) ? lesson.atoms : []).map((a) => [a.id, a]))
  return cards.map((card) => {
    const own = (card.atoms || []).map((id) => atoms.get(id)).filter(Boolean)
    if (own.length > 1) {
      const atom = own[Math.min(own.length - 1, Math.floor(rng() * own.length))]
      return {
        id: vocabKey(card),
        en: atom.en,
        ru: atom.ru || '',
        kk: atom.kk || '',
        ipa: atom.ipa || '',
        example: atom.ctx || '',
        def: atom.mean || '',
        nogap: !!atom.nogap,
      }
    }
    const atom = own[0]
    if (!atom) return card
    const example = card.example || atom.ctx || ''
    return {
      ...card,
      ipa: card.ipa || atom.ipa || '',
      example,
      def: card.def || atom.mean || '',
      // Флаг описывает предложение атома — к чужому примеру карточки он не относится.
      nogap: !!atom.nogap && example === atom.ctx,
    }
  })
}
