import { useEffect, useRef, useState } from 'react'
import { segments, overlapsHighlight, MARKER_COLOR } from './highlights.js'
import { CloseIcon, TranslateIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

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
 * Текст(ы) теста. Маркер один, жёлтый: выделил фрагмент в одном абзаце → меню «Выделить · Убрать выделение · В словарь»
 * над выделением; правая кнопка мыши открывает то же меню у курсора, а на уже выделенном слове — «Убрать выделение».
 * mark — подсветка места ответа ({ key, start, end }) в разборе и после подсказки; focusKey — абзац, к которому
 * прокрутить («Показать в тексте»). В экзамене текст не копируется (как в прототипе), выделять можно.
 */
// keyBase — индекс первого показанного текста в документе: в полном тесте виден один текст из трёх, а ключи
// абзацев («<текст>:<абзац>») обязаны совпадать с документом — по ним хранятся маркер и место ответа.
export default function PassagePane({ texts, keyBase = 0, highlights = [], onHighlight, onRemoveHighlight, onClearAll, onSaveWord, mark, focusKey, noCopy, showMarkerBar = true }) {
  const { t } = useI18n()
  const paneRef = useRef(null)
  const [menu, setMenu] = useState(null)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    if (!focusKey || !paneRef.current) return
    const el = paneRef.current.querySelector(`[data-pkey="${focusKey}"]`)
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [focusKey])

  // Выделение мышью → кусок абзаца { key, start, end, word, rect } или null (пусто, через два абзаца, вне текста)
  const selectedPiece = () => {
    const sel = window.getSelection?.()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null
    const range = sel.getRangeAt(0)
    const startBox = range.startContainer.parentElement?.closest('[data-ptext]')
    const endBox = range.endContainer.parentElement?.closest('[data-ptext]')
    // выделение через два абзаца не красим — маркер на экзамене тоже идёт по одному абзацу
    if (!startBox || startBox !== endBox) return null
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
    const host = paneRef.current.getBoundingClientRect()
    return { x: clientX - host.left + paneRef.current.scrollLeft, y: clientY - host.top + paneRef.current.scrollTop - 8 }
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

  return (
    // data-selectable снимает глобальный запрет выделения (styles.css): без него маркер и «В словарь» не работали —
    // выделить текст было нельзя. Копирование по-прежнему гасит NoCopyGuard.
    <div className="ih-passage" ref={paneRef} data-selectable="" onMouseUp={onMouseUp} onContextMenu={onContextMenu} onCopy={noCopy ? (e) => e.preventDefault() : undefined}>
      {showMarkerBar && onHighlight && (
        <div className="ih-marker">
          <span className="ih-marker__chip"><i className="ih-hl-dot ih-hl-dot--1" />{t('ieltsReading.marker.label')}</span>
          <span className="ih-marker__hint">{t('ieltsReading.marker.hint')}</span>
          <button type="button" className="ih-marker__clear" onClick={onClearAll} disabled={!highlights.some((h) => h.key.startsWith(`${keyBase}:`))}>
            {t('ieltsReading.marker.clear')}
          </button>
        </div>
      )}
      {texts.map((text, ti) => (
        <article key={ti} className="ih-passage__text">
          {(text.label || text.title) && (
            <h2>
              {text.label && texts.length > 1 ? <span className="ih-passage__tlabel">{text.label}</span> : null}
              {text.title}
            </h2>
          )}
          {(text.paragraphs || []).map((p, pi) => {
            const key = `${keyBase + ti}:${pi}`
            const mine = highlights.filter((h) => h.key === key)
            const m = mark && mark.key === key ? mark : null
            const segs = segments(p.text || '', mine, m)
            let at = 0
            return (
              <p key={key} data-pkey={key} className={`ih-para ${focusKey === key ? 'is-focus' : ''}`}>
                {p.label && <b className="ih-para__label">{p.label}</b>}
                <span data-ptext={key}>
                  {segs.map((s, i) => {
                    const from = at
                    at += s.text.length
                    return s.color || s.mark ? (
                      // у первого куска места ответа — номер вопроса на полях (Figma 7). Номер рисует ::before из
                      // data-n: текст псевдоэлемента не входит в Range, и смещения маркера не съезжают
                      <mark
                        key={i}
                        data-n={s.mark && m?.n && !segs[i - 1]?.mark ? m.n : undefined}
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
              </p>
            )
          })}
        </article>
      ))}
      {menu && (
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
      )}
    </div>
  )
}
