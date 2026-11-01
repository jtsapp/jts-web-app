import { useEffect, useRef, useState } from 'react'
import { MarkedText, useMarker } from './marker.jsx'
import { useI18n } from '../../i18n.jsx'

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
  // на телефоне мыши и правой кнопки нет — подсказка про палец (меню и снятие выделения по нажатию работают и там)
  const [touch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches)

  useEffect(() => {
    if (!focusKey || !paneRef.current) return
    const el = paneRef.current.querySelector(`[data-pkey="${focusKey}"]`)
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [focusKey])

  const marker = useMarker({ hostRef: paneRef, highlights, onHighlight, onRemoveHighlight, onSaveWord })

  return (
    // data-selectable снимает глобальный запрет выделения (styles.css): без него маркер и «В словарь» не работали —
    // выделить текст было нельзя. Копирование по-прежнему гасит NoCopyGuard.
    <div className="ih-passage" ref={paneRef} data-selectable="" onMouseUp={marker.onMouseUp} onContextMenu={marker.onContextMenu} onCopy={noCopy ? (e) => e.preventDefault() : undefined}>
      {showMarkerBar && onHighlight && (
        <div className="ih-marker">
          <span className="ih-marker__chip"><i className="ih-hl-dot ih-hl-dot--1" />{t('ieltsReading.marker.label')}</span>
          <span className="ih-marker__hint">{t(touch ? 'ieltsReading.marker.hintTouch' : 'ieltsReading.marker.hint')}</span>
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
            const m = mark && mark.key === key ? mark : null
            return (
              <p key={key} data-pkey={key} className={`ih-para ${focusKey === key ? 'is-focus' : ''}`}>
                {p.label && <b className="ih-para__label">{p.label}</b>}
                <MarkedText k={key} text={p.text} highlights={highlights} mark={m} />
              </p>
            )
          })}
        </article>
      ))}
      {marker.menu}
    </div>
  )
}
