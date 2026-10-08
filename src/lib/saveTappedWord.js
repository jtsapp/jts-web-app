// Сохранение слова из тап-перевода читалок Практики (Книги, Комиксы) в личный
// словарь ученика (POST /mobile/saved-words).
//
// Только со СВОИМ токеном сессии, не с токеном экрана. У гостя читалка получает
// общий демо-токен Практики (PracticePage → apiToken), и слово уходило в словарь
// демо-аккаунта — один на всех гостей. А без демо-токена запрос шёл с «Bearer
// null», падал, и кнопка молча откатывалась, будто нажатия не было (ревью
// 08.10.2026, баг 54). Перевод слова, наоборот, демо-токеном брать можно: он
// ничего не пишет (wordTranslate.js).

import { saveWord } from '../api.js'
import { loadToken } from './session.js'

/**
 * @param fields то же, что у saveWord: { word, translation, alternates?, language, source }
 * @returns {Promise<{status: 'saved', saved: object} | {status: 'guest'} | {status: 'failed'}>}
 */
export async function saveTappedWord(fields) {
  const token = loadToken()
  if (!token) return { status: 'guest' }
  try {
    const saved = await saveWord(token, fields)
    return { status: 'saved', saved }
  } catch {
    return { status: 'failed' }
  }
}

/** Есть ли у ученика свой словарь (вошёл ли он) — чтобы не предлагать кнопку гостю. */
export function canSaveWords() {
  return Boolean(loadToken())
}
