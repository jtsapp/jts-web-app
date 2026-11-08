import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { apply } from './highlight.js'
import { InkHighlighterIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// сколько держится подсказка после выделения пальцем: наведения на телефоне нет, иначе её не увидеть вовсе
const FLASH_MS = 2500

/** Метка, в которую попадает смещение at: data-at — начало каждой метки, отрезок может быть разрезан на несколько. */
function markAt(root, at) {
  let best = null
  for (const m of root.querySelectorAll('mark.st-hl')) if (Number(m.dataset.at) <= at) best = m
  return best
}

/**
 * Текст задания или вопроса из банка (HTML: <p>, <u>, таблицы, списки) с подсветкой маркера. Разметку ставим сами,
 * а не через React: маркер разрезает текстовые узлы, и React, сверяя своё дерево, ломался бы на чужих <mark>.
 * Поэтому корень перерисовывается целиком при каждом изменении текста или подсветки — текст короткий, это дёшево.
 * Контент — из банка бэкенда, который принимает только провалидированный импорт методиста (SatDocument).
 *
 * Если подсветку можно снять (onMarkTap), под меткой при наведении и фокусе — подсказка «Клик по выделению — снять»
 * («NEW 2», 17:3625: снятие кликом было, но о нём никто не знал). flash = { at, n } — показать её один раз после
 * выделения пальцем (n — новый на каждое выделение) и убрать через 2,5 с.
 */
const HtmlBlock = forwardRef(function HtmlBlock({ html, ranges, className, onMarkTap, flash, as: Tag = 'div' }, ref) {
  const { t } = useI18n()
  const el = useRef(null)
  // tip.key — для какого текста и подсветки он посчитан: после перерисовки корня старая метка уже не в документе
  const [tip, setTip] = useState(null)
  useImperativeHandle(ref, () => el.current)
  const key = JSON.stringify(ranges || [])
  const drawn = `${html || ''}\u0000${key}`

  useLayoutEffect(() => {
    const root = el.current
    if (!root) return
    root.innerHTML = html || ''
    apply(root, ranges)
    // метка фокусируется с клавиатуры: подсказку видно по Tab, снятие — по Enter
    if (onMarkTap) for (const m of root.querySelectorAll('mark.st-hl')) m.tabIndex = 0
    // ranges сравниваем строкой: новый массив с тем же содержимым не должен перерисовывать текст
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, key])

  const show = (mark) => {
    const root = el.current
    if (!onMarkTap || !root || !mark) return
    // подсказка — соседка корня, поэтому её координаты считаются от того же предка, что и у корня
    const host = root.offsetParent || root.ownerDocument.body
    const hr = host.getBoundingClientRect()
    const rects = mark.getClientRects()
    const first = rects[0] || mark.getBoundingClientRect()
    const lastRect = rects[rects.length - 1] || first
    setTip({ key: drawn, left: first.left - hr.left + host.scrollLeft, top: lastRect.bottom - hr.top + host.scrollTop + 6 })
  }

  // выделили пальцем — подсказка один раз, сама прячется
  useEffect(() => {
    if (!flash || !el.current) return undefined
    show(markAt(el.current, flash.at))
    const id = setTimeout(() => setTip(null), FLASH_MS)
    return () => clearTimeout(id)
    // показываем на каждое новое выделение (n), а не на каждую перерисовку
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash?.n])

  // при прокрутке подсказка отстала бы от метки — проще спрятать
  const visible = tip && tip.key === drawn
  useEffect(() => {
    if (!visible) return undefined
    const hide = () => setTip(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [visible])

  const markOf = (e) => e.target.closest?.('mark.st-hl')
  const onClick = (e) => {
    const mark = markOf(e)
    if (mark && onMarkTap) onMarkTap(Number(mark.dataset.at))
  }
  const onKeyDown = (e) => {
    const mark = markOf(e)
    if (!mark || !onMarkTap || (e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    // иначе Enter заодно нажал бы «Проверить» / «Далее» экрана вопроса
    e.stopPropagation()
    onMarkTap(Number(mark.dataset.at))
  }
  const onOver = (e) => {
    const mark = markOf(e)
    if (mark) show(mark)
  }
  const onOut = (e) => {
    if (markOf(e) && !e.relatedTarget?.closest?.('mark.st-hl')) setTip(null)
  }

  // data-selectable: глобальный запрет выделения (styles.css) иначе убивает маркер — как у PassagePane IELTS
  return (
    <>
      <Tag ref={el} className={className} data-selectable="" onClick={onClick} onKeyDown={onKeyDown}
        onMouseOver={onOver} onMouseOut={onOut} onFocus={onOver} onBlur={() => setTip(null)} />
      {visible && (
        <span className="st-hltip" role="tooltip" style={{ left: tip.left, top: tip.top }}>
          <InkHighlighterIcon size={16} />{t('sat.run.hlRemove')}
        </span>
      )}
    </>
  )
})

export default HtmlBlock
