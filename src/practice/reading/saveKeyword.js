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
 * @param {string|null|undefined} token
 * @param {{en: string, ru?: string, kz?: string, kk?: string}} w
 * @param {string} [source]
 * @returns {Promise<boolean>}
 */
export async function saveReadingKeyword(token, w, source) {
  const word = String(w?.en || '').trim()
  if (!word) return false
  const ru = w.ru
  const kz = w.kz || w.kk
  const hint = [ru, kz].filter(Boolean).join(' · ')

  const jobs = [addVocabWords([{ word, hint: hint || null }])]
  if (token) {
    jobs.push(saveLang(token, word, ru, 'ru', source))
    jobs.push(saveLang(token, word, kz, 'kk', source))
  }
  const results = await Promise.all(jobs)
  return results.some(Boolean)
}
