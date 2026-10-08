// IELTS Vocabulary в «Словаре» (дизайн «IELTS new»): наборы слов по темам экзамена из банка IELTS (skill = vocab,
// backend TEST_FORMAT.md §12) и их прогресс на сервере (/mobile/vocab-progress, коробки Лейтнера). Здесь — только
// чистые правила экрана: ключ набора, порядок тем, подпись карточки, очередь тренировки, статус слова.

import { vocabKey } from './vocabLearned.js'

// порядок тем — как в макете; темы, которых нет в списке, встают в конец по номеру документа
export const IELTS_TOPIC_ORDER = ['environment', 'education', 'technology', 'health', 'work', 'society', 'culture', 'travel']

/** Ключ набора в прогрессе словаря: общий для всех наборов IELTS префикс, чтобы не пересечься с уровнями и сферами. */
export const ieltsScope = (setId) => `ielts-${setId}`

export function sortIeltsSets(sets) {
  const rank = (s) => {
    const i = IELTS_TOPIC_ORDER.indexOf(s.category)
    return i < 0 ? IELTS_TOPIC_ORDER.length : i
  }
  return [...(sets || [])].sort((a, b) => rank(a) - rank(b) || String(a.id).localeCompare(String(b.id)))
}

/**
 * Подпись карточки набора, как в макете: «12 из 40 изучено» (начат), «6 слов к повторению» (срок повторения
 * наступил — это важнее), «Изучен · 40 из 40» (все слова изучены), «40 слов» (ещё не начат).
 */
export function setCardMeta(summary, total) {
  const s = summary || { seen: 0, learned: 0, due: 0 }
  if (total > 0 && s.learned >= total) return { kind: 'done', n: s.learned, total }
  if (s.due > 0) return { kind: 'due', n: s.due, total }
  if (s.seen > 0) return { kind: 'progress', n: s.learned, total }
  return { kind: 'new', n: total, total }
}

/** Статус слова набора по его состоянию на сервере. */
export function wordStatus(state) {
  if (!state || !state.box) return 'new'
  if (state.due) return 'due'
  if (state.learned) return 'learned'
  return 'learning'
}

export const NEW_PER_SESSION = 10
export const REVIEW_PER_SESSION = 15

/**
 * Очередь тренировки: сначала слова, срок повторения которых наступил (их забывают первыми), иначе — следующие
 * новые. Слова «учу, но рано» не берутся: верный ответ до срока коробку не двигает, тренировка прошла бы впустую.
 * mode: review | new | all — кнопки экрана набора.
 */
export function practiceQueue(words, states, mode = 'auto') {
  const list = Array.isArray(words) ? words : []
  const st = (w) => wordStatus(states?.[vocabKey(w)])
  const due = list.filter((w) => st(w) === 'due')
  const fresh = list.filter((w) => st(w) === 'new')
  if (mode === 'all') return list
  if (mode === 'review') return due.slice(0, REVIEW_PER_SESSION)
  if (mode === 'new') return fresh.slice(0, NEW_PER_SESSION)
  return due.length ? due.slice(0, REVIEW_PER_SESSION) : fresh.slice(0, NEW_PER_SESSION)
}

/** Слово набора → карточка тренажёра «Словаря» (VocabPractice): те же поля, что у карточек каталога. */
export function practiceCard(w) {
  return { id: w.id, en: w.en, ru: w.ru || '', kk: w.kk || '', ipa: w.ipa || '', example: w.example || '', def: w.def || '' }
}

/** Ответы тренировки → тело /mobile/vocab-progress: ключ — тот же vocabKey, что у карточки. */
export function progressResults(answers) {
  return (answers || []).filter((a) => a && a.key).map((a) => ({ key: a.key, ok: !!a.ok }))
}
