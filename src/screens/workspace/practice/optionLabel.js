// Вариант ответа в карточке: картинка отдельно, слово отдельно.
//
// Курс пишет их одной строкой — «☕️ Coffee», «📅 Mondays». В макете это карточка,
// где картинка стоит над словом и набрана крупнее, поэтому строку надо разделить.
// Флаг — пара региональных индикаторов, а не пиктограмма: без отдельной ветки
// «🇷🇺 Русский» разбиралось бы как текст целиком, а наивная регулярка по эмодзи
// режет пополам составные (флаги, семьи).
const LEADING_EMOJI = /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)+/u

export function splitOptionLabel(option) {
  const raw = String(option ?? '')
  const match = raw.match(LEADING_EMOJI)
  if (!match) return { emoji: '', text: raw.trim() }
  const emoji = match[0]
  const text = raw.slice(emoji.length).trim()
  // Вариант из одной картинки (👍 / 👎) — это и есть ответ: слова под ним нет,
  // и пустая подпись оставила бы карточку без строки текста.
  return text ? { emoji, text } : { emoji: '', text: emoji }
}

/**
 * Стоит ли рисовать варианты карточками.
 *
 * Карточка из макета — это картинка над словом. Ответ из одного 👍 в ней
 * превращается в плиту во всю колонку без смысла, поэтому карточки включаются
 * только там, где у вариантов есть и картинка, и слово.
 */
export function optionsAreCards(options) {
  return (options || []).some((option) => splitOptionLabel(option).emoji)
}
