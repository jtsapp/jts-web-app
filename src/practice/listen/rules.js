// Правила проверки и награды Just to Listen — из checkWord/checkSentence/
// finishSentence прототипа и таблицы ТЗ «Подсказки, монеты, прогресс».

import { compareSentence, containsTarget, enMain, letters, lev, missingWords } from './compare.js'

export const HINTS_PER_TEST = 3
export const SHOWS_PER_TEST = 3
export const TRIES = 2
const OWN_MIN_WORDS = 4

export const wordTarget = (en) => letters(enMain(en))

/** Слово целиком: 'ok' | 'near' (ошибка в 1–2 буквы — не засчитывается) | 'bad'. */
export function judgeWord(typed, en) {
  const variants = String(en).split('|').map(letters)
  if (variants.includes(typed)) return 'ok'
  return variants.some((t) => lev(typed, t) <= Math.max(1, Math.floor(t.length / 5))) ? 'near' : 'bad'
}

/**
 * Монеты слова по ТЗ: с первой попытки без подсказок — 10, со второй или с
 * одной подсказкой — 5, несколько подсказок — 2. Считаем НАЖАТИЯ подсказки:
 * прототип считал открытые буквы вместе с верно набранным началом, и одна
 * подсказка после трёх верных букв стоила как «несколько».
 */
export function wordCoins(tries, hintsUsed) {
  if (hintsUsed === 0 && tries === 1) return 10
  return hintsUsed < 2 ? 5 : 2
}

/** Предложение: с первой попытки без подсказки — 15, иначе — 8. */
export function sentenceCoins(tries, hinted) {
  return tries === 1 && !hinted ? 15 : 8
}

export const hasSentence = (card) => !!(card.exEn && card.exRu)
export const sentenceRef = (card) => (card.exEn ? card.exEn.split('||')[0] : '')

/**
 * Ответ на шаге 2. Диктант сверяется с ПЕРВЫМ вариантом — он и звучит: до 6
 * слов — без ошибок, длиннее — одна. Без образца (свой список) — своё
 * предложение: целевое слово, от 4 слов, без кириллицы.
 * → { ok, near, distance, ref, missing, reason: null | 'needWord' | 'minWords' }
 */
export function judgeSentence(raw, card) {
  const hasTarget = containsTarget(raw, card.en)
  if (!hasSentence(card)) {
    const ok = hasTarget && raw.split(/\s+/).length >= OWN_MIN_WORDS && !/[а-яё]/i.test(raw)
    return { ok, near: false, distance: null, ref: '', missing: [], reason: ok ? null : hasTarget ? 'minWords' : 'needWord' }
  }
  const b = compareSentence(raw, sentenceRef(card))
  const limit = b.rt.length <= 6 ? 0 : 1
  const miss = missingWords(raw, b.ref)
  return {
    ok: hasTarget && b.d <= limit,
    near: hasTarget && b.d <= limit + 2,
    distance: b.d,
    ref: b.ref,
    missing: miss.length && miss.length <= 2 ? miss : [],
    reason: hasTarget ? null : 'needWord',
  }
}

/** Лучше ли результат: больше монет, при равенстве — больше верных. */
export function isBetter(next, best) {
  if (!best) return true
  return next.coins > best.coins || (next.coins === best.coins && next.ok > best.ok)
}

/**
 * Монеты теста в баланс — только прирост к лучшему результату прогона
 * (решение владельца 21.10.2026): иначе «Пройти заново» — бесконечная ферма.
 * Прогон без ключа («Повторить ошибки», «Свой список») монет не даёт.
 */
export function coinsToCredit(earned, best, keyed) {
  if (!keyed) return 0
  return Math.max(0, earned - (best?.coins || 0))
}
