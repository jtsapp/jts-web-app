import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { apply } from './highlight.js'

/**
 * Текст задания или вопроса из банка (HTML: <p>, <u>, таблицы, списки) с подсветкой маркера. Разметку ставим сами,
 * а не через React: маркер разрезает текстовые узлы, и React, сверяя своё дерево, ломался бы на чужих <mark>.
 * Поэтому корень перерисовывается целиком при каждом изменении текста или подсветки — текст короткий, это дёшево.
 * Контент — из банка бэкенда, который принимает только провалидированный импорт методиста (SatDocument).
 */
const HtmlBlock = forwardRef(function HtmlBlock({ html, ranges, className, onMarkTap, as: Tag = 'div' }, ref) {
  const el = useRef(null)
  useImperativeHandle(ref, () => el.current)
  const key = JSON.stringify(ranges || [])

  useLayoutEffect(() => {
    const root = el.current
    if (!root) return
    root.innerHTML = html || ''
    apply(root, ranges)
    // ranges сравниваем строкой: новый массив с тем же содержимым не должен перерисовывать текст
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, key])

  const onClick = (e) => {
    const mark = e.target.closest?.('mark.st-hl')
    if (mark && onMarkTap) onMarkTap(Number(mark.dataset.at))
  }

  // data-selectable: глобальный запрет выделения (styles.css) иначе убивает маркер — как у PassagePane IELTS
  return <Tag ref={el} className={className} data-selectable="" onClick={onClick} />
})

export default HtmlBlock
