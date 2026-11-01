import { useState } from 'react'
import { segments, overlapsHighlight, MARKER_COLOR } from './highlights.js'
import { CloseIcon, TranslateIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Маркер IELTS — один на текст теста (PassagePane) и на вопросы справа (IeltsReadingRunPage): на компьютерном
// экзамене выделяются и текст, и вопросы. Кусок текста под маркером — элемент с data-ptext=<ключ>; выделение хранится
// смещениями внутри него ({ key, start, end }), поэтому переживает перерисовку и черновик.

// «В словарь» — для слова или короткой фразы: предложение целиком в словаре бесполезно
const MAX_SAVE_WORDS = 6

// Смещение начала/конца выделения внутри текста абзаца: Range от начала текстового блока до края выделения.
function offsetIn(container, node, offset) {
  const r = document.createRange()
  r.selectNodeContents(container)
  r.setEnd(node, offset)
  return r.toString().length
}

/**
 * Текст под маркером: куски с выделениями ученика (highlights — только этого ключа) и местом ответа (mark).
 * У первого куска места ответа — номер вопроса на полях (Figma 7). Номер рисует ::before из data-n: текст
 * псевдоэлемента не входит в Range, и смещения маркера не съезжают.
 */
export function MarkedText({ k, text, highlights = [], mark = null }) {
  const mine = highlights.filter((h) => h.key === k)
  const segs = segments(text || '', mine, mark)
  // смещение начала каждого куска в тексте — по нему правая кнопка находит маркер под курсором (data-s)
  const starts = segs.reduce((acc, s, i) => [...acc, i ? acc[i - 1] + segs[i - 1].text.length : 0], [])
  return (
    <span data-ptext={k}>
      {segs.map((s, i) => {
        const from = starts[i]
        return s.color || s.mark ? (
          <mark
            key={i}
            data-n={s.mark && mark?.n && !segs[i - 1]?.mark ? mark.n : undefined}
            data-s={from}
            className={`${s.color ? 'ih-hl' : ''} ${s.mark ? 'ih-hl--answer' : ''}`.trim()}
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        )
      })}
    </span>
  )
}

/**
 * Меню маркера над выделением: выделил кусок внутри одного data-ptext → «Выделить · Убрать выделение · В словарь»;
 * правая кнопка мыши — то же меню у курсора, а на уже выделенном слове — «Убрать выделение». hostRef — элемент с
 * position: relative, внутри которого рисуется меню (и на который вешаются onMouseUp/onContextMenu).
 */
export function useMarker({ hostRef, highlights = [], onHighlight, onRemoveHighlight, onSaveWord }) {
  const { t } = useI18n()
  const [menu, setMenu] = useState(null)
  const [saved, setSaved] = useState(null)

  // Выделение мышью → кусок { key, start, end, word, rect } или null (пусто, через два куска, вне текста)
  const selectedPiece = () => {
    const sel = window.getSelection?.()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null
    const range = sel.getRangeAt(0)
    const startBox = range.startContainer.parentElement?.closest('[data-ptext]')
    const endBox = range.endContainer.parentElement?.closest('[data-ptext]')
    // выделение через два абзаца не красим — маркер на экзамене тоже идёт по одному абзацу
    if (!startBox || startBox !== endBox || !hostRef.current?.contains(startBox)) return null
    // края — до границы слова: мышью легко зацепить полслова, а маркер на «m|ost of» читается как ошибка
    const full = startBox.textContent || ''
    let start = offsetIn(startBox, range.startContainer, range.startOffset)
    let end = offsetIn(startBox, range.endContainer, range.endOffset)
    while (start > 0 && /[\w'’-]/.test(full[start - 1]) && /[\w'’-]/.test(full[start])) start--
    while (end < full.length && /[\w'’-]/.test(full[end]) && /[\w'’-]/.test(full[end - 1])) end++
    if (end <= start) return null
    return { key: startBox.dataset.ptext, start, end, word: full.slice(start, end).trim(), rect: range.getBoundingClientRect() }
  }

  const place = (clientX, clientY) => {
    const host = hostRef.current.getBoundingClientRect()
    return { x: clientX - host.left + hostRef.current.scrollLeft, y: clientY - host.top + hostRef.current.scrollTop - 8 }
  }

  const onMouseUp = (e) => {
    if (!onHighlight || e.button === 2) return
    const piece = selectedPiece()
    if (!piece) return setMenu(null)
    setSaved(null)
    setMenu({ ...piece, ...place(piece.rect.left + piece.rect.width / 2, piece.rect.top), canAdd: true, canRemove: overlapsHighlight(highlights, piece) })
  }

  // Правая кнопка: по выделению — «Выделить / Убрать выделение», по уже выделенному слову без выделения — убрать весь
  // маркер под курсором. Вне текста и без маркера — обычное меню браузера.
  const onContextMenu = (e) => {
    if (!onHighlight) return
    const piece = selectedPiece()
    if (piece) {
      e.preventDefault()
      setSaved(null)
      setMenu({ ...piece, ...place(e.clientX, e.clientY), canAdd: true, canRemove: overlapsHighlight(highlights, piece) })
      return
    }
    const markEl = e.target.closest?.('mark.ih-hl[data-s]')
    const box = markEl?.closest('[data-ptext]')
    if (!markEl || !box) return
    const at = Number(markEl.dataset.s)
    const h = highlights.find((x) => x.key === box.dataset.ptext && x.start <= at && x.end > at)
    if (!h) return
    e.preventDefault()
    setSaved(null)
    setMenu({ key: h.key, start: h.start, end: h.end, word: '', ...place(e.clientX, e.clientY), canAdd: false, canRemove: true })
  }

  const paint = () => {
    onHighlight({ key: menu.key, start: menu.start, end: menu.end, color: MARKER_COLOR })
    window.getSelection?.().removeAllRanges()
    setMenu(null)
  }

  const unpaint = () => {
    onRemoveHighlight?.({ key: menu.key, start: menu.start, end: menu.end })
    window.getSelection?.().removeAllRanges()
    setMenu(null)
  }

  const save = async () => {
    const ok = await onSaveWord?.(menu.word)
    setSaved(ok ? 'ok' : 'fail')
    window.getSelection?.().removeAllRanges()
    setTimeout(() => setMenu(null), 900)
  }

  const menuEl = menu && (
    <div className="ih-selmenu" style={{ left: menu.x, top: menu.y }} onMouseUp={(e) => e.stopPropagation()}>
      {menu.canAdd && (
        <button type="button" className="ih-selmenu__act" onClick={paint}>
          <i className="ih-hl-dot ih-hl-dot--1" /> {t('ieltsReading.marker.add')}
        </button>
      )}
      {menu.canRemove && onRemoveHighlight && (
        <button type="button" className="ih-selmenu__act" onClick={unpaint}>
          <CloseIcon size={14} /> {t('ieltsReading.marker.remove')}
        </button>
      )}
      {onSaveWord && menu.word && menu.word.split(/\s+/).length <= MAX_SAVE_WORDS && (
        <>
          <i className="ih-selmenu__sep" />
          <button type="button" className="ih-selmenu__vocab" onClick={save}>
            <TranslateIcon size={16} />
            {saved === 'ok' ? t('ieltsReading.vocab.saved') : saved === 'fail' ? t('ieltsReading.vocab.failed') : t('ieltsReading.vocab.add')}
          </button>
        </>
      )}
    </div>
  )

  return { onMouseUp, onContextMenu, menu: menuEl }
}
