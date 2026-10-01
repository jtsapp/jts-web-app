import { useEffect, useRef, useState } from 'react'
import { segments, MARKER_COLORS } from './highlights.js'
import { TranslateIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Смещение начала/конца выделения внутри текста абзаца: Range от начала текстового блока до края выделения.
function offsetIn(container, node, offset) {
  const r = document.createRange()
  r.selectNodeContents(container)
  r.setEnd(node, offset)
  return r.toString().length
}

/**
 * Текст(ы) теста. Маркер: выделил фрагмент в одном абзаце → меню «три цвета · В словарь» над выделением.
 * mark — подсветка места ответа ({ key, start, end }) в разборе и после подсказки; focusKey — абзац, к которому
 * прокрутить («Показать в тексте»). В экзамене текст не копируется (как в прототипе), выделять можно.
 */
// keyBase — индекс первого показанного текста в документе: в полном тесте виден один текст из трёх, а ключи
// абзацев («<текст>:<абзац>») обязаны совпадать с документом — по ним хранятся маркер и место ответа.
export default function PassagePane({ texts, keyBase = 0, highlights = [], onHighlight, onClearAll, onSaveWord, mark, focusKey, noCopy, showMarkerBar = true }) {
  const { t } = useI18n()
  const paneRef = useRef(null)
  const [menu, setMenu] = useState(null)
  const [saved, setSaved] = useState(null)

  useEffect(() => {
    if (!focusKey || !paneRef.current) return
    const el = paneRef.current.querySelector(`[data-pkey="${focusKey}"]`)
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [focusKey])

  const onMouseUp = () => {
    if (!onHighlight) return
    const sel = window.getSelection?.()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return setMenu(null)
    const range = sel.getRangeAt(0)
    const startBox = range.startContainer.parentElement?.closest('[data-ptext]')
    const endBox = range.endContainer.parentElement?.closest('[data-ptext]')
    // выделение через два абзаца не красим — маркер на экзамене тоже идёт по одному абзацу
    if (!startBox || startBox !== endBox) return setMenu(null)
    // края — до границы слова: мышью легко зацепить полслова, а маркер на «m|ost of» читается как ошибка
    const full = startBox.textContent || ''
    let start = offsetIn(startBox, range.startContainer, range.startOffset)
    let end = offsetIn(startBox, range.endContainer, range.endOffset)
    while (start > 0 && /[\w'’-]/.test(full[start - 1]) && /[\w'’-]/.test(full[start])) start--
    while (end < full.length && /[\w'’-]/.test(full[end]) && /[\w'’-]/.test(full[end - 1])) end++
    if (end <= start) return setMenu(null)
    const rect = range.getBoundingClientRect()
    const host = paneRef.current.getBoundingClientRect()
    setSaved(null)
    setMenu({
      key: startBox.dataset.ptext,
      start,
      end,
      word: full.slice(start, end).trim(),
      x: rect.left - host.left + paneRef.current.scrollLeft + rect.width / 2,
      y: rect.top - host.top + paneRef.current.scrollTop - 8,
    })
  }

  const paint = (color) => {
    onHighlight({ key: menu.key, start: menu.start, end: menu.end, color })
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
    <div className="ih-passage" ref={paneRef} data-selectable="" onMouseUp={onMouseUp} onCopy={noCopy ? (e) => e.preventDefault() : undefined}>
      {showMarkerBar && onHighlight && (
        <div className="ih-marker">
          <span>{t('ieltsReading.marker.label')}</span>
          {MARKER_COLORS.map((c) => (
            <span key={c} className="ih-marker__chip">
              <i className={`ih-hl-dot ih-hl-dot--${c}`} />
              {t(`ieltsReading.marker.c${c}`)}
            </span>
          ))}
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
            return (
              <p key={key} data-pkey={key} className={`ih-para ${focusKey === key ? 'is-focus' : ''}`}>
                {p.label && <b className="ih-para__label">{p.label}</b>}
                <span data-ptext={key}>
                  {segments(p.text || '', mine, m).map((s, i) =>
                    s.color || s.mark ? (
                      <mark key={i} className={`${s.color ? `ih-hl--${s.color}` : ''} ${s.mark ? 'ih-hl--answer' : ''}`.trim()}>
                        {s.text}
                      </mark>
                    ) : (
                      <span key={i}>{s.text}</span>
                    ),
                  )}
                </span>
              </p>
            )
          })}
        </article>
      ))}
      {menu && (
        <div className="ih-selmenu" style={{ left: menu.x, top: menu.y }} onMouseUp={(e) => e.stopPropagation()}>
          {MARKER_COLORS.map((c) => (
            <button key={c} type="button" className={`ih-hl-dot ih-hl-dot--${c}`} aria-label={t(`ieltsReading.marker.c${c}`)} onClick={() => paint(c)} />
          ))}
          {onSaveWord && menu.word.split(/\s+/).length <= 4 && (
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
