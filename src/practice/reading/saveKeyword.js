// Ключевое слово текста → личный словарь ученика.
// Тот же путь, что у карточек курса (CourseStepPlayer) и тап-перевода книг:
// POST /mobile/saved-words на оба языка перевода плюс vocab_bank (повторения).
// Казахский в данных чтения — `kz`, в курсе — `kk`; принимаем оба.

import { saveWord } from '../../api.js'
import { addVocabWords } from '../../lib/vocabBank.js'

async function saveLang(token, word, translation, language, source) {
  const tr = String(translation || '').trim()
  if (!token || !tr) return false
  try {
    await saveWord(token, { word, translation: tr, language, source })
    return true
  } catch {
    return false
  }
}

/**
 * Куда ушло слово: 'dict' — личный словарь (его показывает «Словарь»), 'bank'
 * — только банк повторений тьютора (гость: «Словаря» у него нет), false —
 * никуда. По этому кнопка и подписывается: гостю «Сохранено», а не «Уже в
 * словаре» (решение владельца 09.10.2026, как в Обучении).
 *
 * @param {string|null|undefined} token
 * @param {{en: string, ru?: string, kz?: string, kk?: string}} w
 * @param {string} [source]
 * @returns {Promise<'dict'|'bank'|false>}
 */
export async function saveReadingKeyword(token, w, source) {
  const word = String(w?.en || '').trim()
  if (!word) return false
  const ru = w.ru
  const kz = w.kz || w.kk
  const hint = [ru, kz].filter(Boolean).join(' · ')

  // Банк тьютора (повторения) пишем всем; гость другого словаря не имеет, и
  // слово уходит туда под device-id.
  const bank = addVocabWords([{ word, hint: hint || null }])
  if (!token) return (await bank) ? 'bank' : false
  const [, ruOk, kzOk] = await Promise.all([
    bank,
    saveLang(token, word, ru, 'ru', source),
    saveLang(token, word, kz, 'kk', source),
  ])
  // «В словаре» — только если слово принял личный словарь: банк тьютора в
  // разделе «Словарь» не виден, и его одно «да» давало ложную галочку
  // (ревью 08.10.2026).
  return ruOk || kzOk ? 'dict' : false
}
