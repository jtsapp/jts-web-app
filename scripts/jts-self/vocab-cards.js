// Карточки словаря урока. Слова и переводы лежат в VOCAB, картинки — в
// отдельной карте IMG, и в разметку урока ни то, ни другое не попадает:
// исходный курс рисует карточки скриптом. Поэтому собираем их сами.
const crypto = require('node:crypto')

const escapeHtml = (s) =>
  String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

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
 * пока картинки не залиты, карточка остаётся текстовой, и это не ошибка.
 */
function vocabCardsTask(lesson, imageUrl) {
  const words = (lesson.vocab || []).filter((row) => Array.isArray(row) && row[0])
  if (!words.length) return null

  const cards = words
    .map(([word, , ru, kk, definition]) => {
      const src = imageUrl(word)
      // Заливка картинок в бакет — отдельный ручной шаг, до него ссылка
      // 404-ится. Без onerror браузер держит место под img (aspect-ratio в
      // styles.css) и рисует иконку "битого" изображения — так почти все
      // карточки A0 выглядели бы сломанными вместо честного текстового вида.
      // onerror убирает <img> из DOM, и карточка остаётся текстовой, как и
      // заявлено. alt — не пустой: картинка иллюстрирует значение слова, а
      // не украшает страницу, значит нужна вменяемая замена для скринридера.
      const image = src
        ? `<img class="kl-vocab__img" src="${escapeHtml(src)}" alt="${escapeHtml(word)}" onerror="this.remove()">`
        : ''
      return (
        `<div class="kl-vocab__card">${image}` +
        `<b class="kl-vocab__word">${escapeHtml(word)}</b>` +
        `<span class="kl-vocab__tr">${escapeHtml(ru)}${kk ? ' · ' + escapeHtml(kk) : ''}</span>` +
        (definition ? `<span class="kl-vocab__def">${escapeHtml(definition)}</span>` : '') +
        `</div>`
      )
    })
    .join('')

  return { type: 'info', sec: 'Vocabulary', title: '', sub: '', html: `<div class="kl-vocab">${cards}</div>` }
}

module.exports = { vocabCardsTask, imageSlug }
