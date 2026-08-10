// Карточки словаря урока. Слова и переводы лежат в VOCAB, картинки — в
// отдельной карте IMG, и в разметку урока ни то, ни другое не попадает:
// исходный курс рисует карточки скриптом. Поэтому собираем их сами.
const escapeHtml = (s) =>
  String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Имя файла картинки: слово в нижнем регистре, всё небуквенное — в дефис. */
function imageSlug(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
      const image = src ? `<img class="kl-vocab__img" src="${escapeHtml(src)}" alt="">` : ''
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
