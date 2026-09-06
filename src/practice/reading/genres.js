// Жанры каталога — порядок и эмодзи из прототипа (GENRES, jtsreading.html:392).
// Порядок неалфавитный и осмысленный: он идёт от «твёрдого» к «человеческому»,
// и в данных тексты каждого уровня разложены по нему же (1 · SCIENCE,
// 2 · ADVENTURE, …), поэтому пересортировать = разъехаться с материалом.
// Ключ перевода — reading.genre.<id> в src/i18n.jsx.
export const GENRES = [
  { id: 'science', emoji: '🔬' },
  { id: 'adventure', emoji: '🧭' },
  { id: 'mystery', emoji: '🕵️' },
  { id: 'history', emoji: '🏛' },
  { id: 'technology', emoji: '💡' },
  { id: 'nature', emoji: '🌿' },
  { id: 'people', emoji: '👤' },
  { id: 'culture', emoji: '✈️' },
]

export function genreOf(id) {
  return GENRES.find((g) => g.id === id) || GENRES[0]
}
