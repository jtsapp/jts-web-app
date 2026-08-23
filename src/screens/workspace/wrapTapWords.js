// Оборачивает английские слова в тексте живого урока в теги, по которым можно
// тапнуть за переводом (см. useTapTranslate.js) — тот же приём, что читалка
// книг делает через split(/\s+/) в JSX (BookDetail.jsx), но здесь текст уже
// приехал HTML-строкой (санитизированная разметка урока), поэтому слова
// оборачиваются DOM-обходом текстовых узлов, а не разбором строки: тронуть
// нужно только текст, а не порвать существующие теги/атрибуты разметки.
export function wrapTapWords(html) {
  if (typeof document === 'undefined' || !html) return html
  const container = document.createElement('div')
  container.innerHTML = html
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes = []
  let node
  while ((node = walker.nextNode())) textNodes.push(node)

  for (const textNode of textNodes) {
    const text = textNode.nodeValue
    if (!text || !/[A-Za-z]/.test(text)) continue
    // Кнопки ответа / ссылки / поля — не трогаем: тап там выбирает вариант,
    // а не просит перевод.
    if (textNode.parentElement?.closest('button, a, input, textarea, select, label')) continue
    // Обёртка — ОДИН узел на место текстового, а не россыпь соседних (было
    // раньше): курс кладёт целые фразы одним текстовым узлом прямо в
    // flex/grid-карточку («иконка + подпись», класс .card в разметке урока) —
    // разбив узел на несколько соседних, каждое слово становится отдельным
    // flex-элементом и уезжает на свою строку. Обёртка inline, сама не участвует
    // в раскладке — слова внутри неё идут обычным текстовым потоком.
    const wrap = document.createElement('span')
    for (const tok of text.split(/(\s+)/)) {
      if (!tok) continue
      if (/^\s+$/.test(tok) || !/[A-Za-z]/.test(tok)) {
        wrap.appendChild(document.createTextNode(tok))
        continue
      }
      const span = document.createElement('span')
      span.className = 'lw-tap-w'
      span.textContent = tok
      wrap.appendChild(span)
    }
    textNode.parentNode.replaceChild(wrap, textNode)
  }
  return container.innerHTML
}
