// Вариант ответа в карточке: эмодзи отдельно, слово отдельно.
//
// Курс пишет их одной строкой — «☕️ Coffee», «📅 Mondays». В макете это карточка,
// где картинка стоит над словом и набрана крупнее, поэтому строку надо разделить.
// Разбираем по первому пробелу после эмодзи, а не регуляркой по всем эмодзи:
// внутри слова они не встречаются, зато встречаются составные (флаги, семьи) —
// их бы порезало на части.
// Флаг — пара региональных индикаторов, а не пиктограмма: без отдельной ветки
// «🇷🇺 Русский» разбиралось как текст целиком.
const LEADING_EMOJI = /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)+/u

export function splitOptionLabel(option) {
  const raw = String(option ?? '')
  const match = raw.match(LEADING_EMOJI)
  if (!match) return { emoji: '', text: raw.trim() }
  const emoji = match[0]
  const text = raw.slice(emoji.length).trim()
  // Вариант из одного эмодзи (👍 / 👎) — это и есть ответ: слова под ним нет,
  // и пустая подпись оставила бы карточку без строки текста.
  return text ? { emoji, text } : { emoji: '', text: emoji }
}
