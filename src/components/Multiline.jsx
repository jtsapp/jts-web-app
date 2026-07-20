// Рендерит строку с переносами \n, вставляя <br/>
export default function Multiline({ text }) {
  const lines = String(text).split('\n')
  // Пробел перед <br/> нужен, чтобы при скрытом переносе (мобилка,
  // `.form-title br{display:none}`) слова не слипались: «номеру телефона».
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && ' '}
      {i > 0 && <br />}
      {line}
    </span>
  ))
}
