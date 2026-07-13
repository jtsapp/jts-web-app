// Рендерит строку с переносами \n, вставляя <br/>
export default function Multiline({ text }) {
  const lines = String(text).split('\n')
  return lines.map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ))
}
