import { translateWord } from '../../lib/wordTranslate.js'
import { saveReadingKeyword } from '../../practice/reading/saveKeyword.js'

// «В словарь» из маркера Reading: выделенное слово с переводом → общий «Словарь» (/mobile/saved-words), тем же путём,
// что «Чтение» Практики и «Глаголы» (saveReadingKeyword). translateWord отдаёт { tr, alternates }: раньше экран читал
// несуществующее поле `translation`, перевод всегда был пустым, а без перевода saveReadingKeyword слово не шлёт
// (бэкенд требует translation) — меню писало «Не сохранилось» на любое слово. Края выделения чистятся от знаков
// («species,» → «species»): маркер доводит выделение до границы слова, но запятую рядом мышью цепляют часто.
export async function savePassageWord(token, raw, { translate = translateWord, save = saveReadingKeyword } = {}) {
  const word = String(raw || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!word) return false
  const ru = await translate(word, 'ru')
    .then((r) => (typeof r === 'string' ? r : r?.tr) || '')
    .catch(() => '')
  return save(token, { en: word, ru }, 'ielts-reading')
}
