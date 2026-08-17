// Карточки словаря урока. Слова и переводы лежат в VOCAB, картинки — в
// отдельной карте IMG, и в разметку урока ни то, ни другое не попадает:
// исходный курс рисует карточки скриптом. Поэтому собираем их сами.
const crypto = require('node:crypto')

/**
 * Имя файла картинки: слово в нижнем регистре, всё небуквенное — в дефис, плюс
 * короткий хэш самого слова.
 *
 * Хэш обязателен, потому что читаемая часть неоднозначна: «Why?» и «Why…?»,
 * «Who?» и «Who…?», «How often?» и «How often…?» — разные слова словаря A0, а
 * дефисная запись у них одна, и второе слово получало картинку первого. Слово
 * вообще без латинских букв давало пустое имя. Хэш от исходной строки решает
 * оба случая и остаётся детерминированным: перегенерация даёт те же имена.
 */
function imageSlug(word) {
  const source = String(word || '')
  const base = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const tag = crypto.createHash('sha1').update(source).digest('hex').slice(0, 6)
  return base ? `${base}-${tag}` : tag
}

/**
 * Задание-карточки для стадии Vocabulary. imageUrl(word) → ссылка или null:
 * слова без картинки остаются текстовыми, и это не ошибка.
 *
 * Отдаём данные, а не готовую разметку. Раньше здесь клеился html со своими
 * классами, и плеер печатал его одной простынёй — на экране получался список
 * слов вместо презентации: перевод виден сразу, слово нельзя ни перевернуть,
 * ни забрать в свой словарь. Разметку рисует плеер (WordCards), здесь только
 * содержимое.
 */
function vocabCardsTask(lesson, imageUrl) {
  const words = (lesson.vocab || []).filter((row) => Array.isArray(row) && row[0])
  if (!words.length) return null

  return {
    type: 'cards',
    sec: 'Vocabulary',
    title: '',
    sub: '',
    words: words.map(([word, , ru, kk, definition]) => ({
      en: word,
      ru: ru || '',
      kk: kk || '',
      def: definition || '',
      img: imageUrl(word) || null,
    })),
  }
}

module.exports = { vocabCardsTask, imageSlug }
