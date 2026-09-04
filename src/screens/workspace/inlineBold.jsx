import { tidyLessonText } from './tidyLessonText.js'

/**
 * Курсовой разбор (`data-why`) приезжает с разметкой внутри: эталон в цитате
 * выделен жирным или курсивом — `"this morning I'm visiting a <b>fashion
 * show</b> with colleagues"`, «After <i>to</i>, only <b>be able to</b> works.».
 * Текст рисовался как есть, и ученик читал теги буквально.
 *
 * Через `dangerouslySetInnerHTML` это не пропускаем: `why` — данные курса, а не
 * наша строка, и открывать в них произвольный HTML ради одного `<b>` дорого.
 * Разбираем только `<b>`/`<strong>` и `<i>`/`<em>`, отдаём готовые узлы; всё
 * остальное остаётся текстом и никуда не исполняется.
 *
 * `tidyLessonText` применяется ПОСЛЕ разбора и только к последнему текстовому
 * куску: он срезает битый хвост вёрстки курса (`… make small talk." >`), и,
 * пройдя первым, съел бы `>` у закрывающего `</b>` — тег переставал
 * распознаваться и печатался ученику как текст.
 */
const INLINE = /<\s*(b|strong|i|em)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi
const STRAY = /<\s*\/?\s*(b|strong|i|em)\s*>/gi

export function inlineBold(value) {
  const text = String(value ?? '')
  const nodes = []
  let last = 0
  let match
  INLINE.lastIndex = 0
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const italic = /^(i|em)$/i.test(match[1])
    nodes.push(
      italic
        ? <em key={`i${match.index}`}>{match[2]}</em>
        : <strong key={`b${match.index}`}>{match[2]}</strong>,
    )
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))

  return nodes.map((node, i) => {
    if (typeof node !== 'string') return node
    // Уцелевшие одиночные теги (незакрытый `<b>`) убираем: показывать их
    // ученику — то же самое, что показывать пару.
    const clean = node.replace(STRAY, '')
    return i === nodes.length - 1 ? tidyLessonText(clean) : clean
  })
}
