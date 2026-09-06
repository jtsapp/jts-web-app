'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { sentences, norm } from '../../practice/reading/engine.js'
import { lookup, displayWord } from '../../practice/reading/dict.js'
import { translateWord } from '../../lib/wordTranslate.js'
import { speak } from '../../practice/workbook/voice.js'

// Текст статьи: абзац → предложения → слова. Разбивка нужна дважды — по
// предложениям идёт подсветка озвучки, по словам работает тап-перевод.
export default function ReadingArticle({ text, dict, ensureDict, speakingIndex }) {
  const { t } = useI18n()
  const [pop, setPop] = useState(null) // { at: {left, top}, word, entry, state }
  const hostRef = useRef(null)

  // Плоский список предложений в порядке чтения — тот же индекс, что у
  // подсветки: озвучка идёт по нему.
  const paragraphs = useMemo(() => text.text.map((p) => sentences(p)), [text])
  const flatIndex = useMemo(() => {
    const map = []
    paragraphs.forEach((par, pi) => par.forEach((_, si) => map.push(pi + ':' + si)))
    return map
  }, [paragraphs])

  const onWord = useCallback(
    (evt, raw) => {
      const el = evt.currentTarget
      const host = hostRef.current
      if (!host) return
      // Координаты — ОТНОСИТЕЛЬНО статьи, а не окна: карточка лежит внутри неё
      // и едет вместе с текстом. У фиксированной позиции пришлось бы закрывать
      // карточку на скролле, и её сносил доводочный скролл браузера сразу
      // после тапа — карточка не успевала показаться вовсе.
      const r = el.getBoundingClientRect()
      const h = host.getBoundingClientRect()
      const at = { left: r.left - h.left, top: r.bottom - h.top + 8 }

      const local = lookup(raw, dict, text.words)
      setPop({ at, word: raw, entry: local, state: local ? 'ready' : 'loading' })

      // Слово произносим сразу — прототип делал так же: тап это и «что это»,
      // и «как звучит». После setState: осечка синтеза не должна убить карточку.
      speak([displayWord(raw)])
      if (local) return

      // Словарь мог быть ещё не скачан — сначала догружаем его, и только если
      // слова нет и там, идём в общий сетевой переводчик приложения.
      ensureDict()
        .then((d) => {
          const hit = lookup(raw, d, text.words)
          if (hit) {
            setPop((p) => (p && p.word === raw ? { ...p, entry: hit, state: 'ready' } : p))
            return null
          }
          return translateWord(displayWord(raw), 'ru')
        })
        .then((res) => {
          if (!res) return
          setPop((p) =>
            p && p.word === raw
              ? { ...p, entry: { en: displayWord(raw), ru: res.tr || '', kz: null, source: 'net' }, state: res.tr ? 'ready' : 'empty' }
              : p,
          )
        })
        .catch(() => setPop((p) => (p && p.word === raw ? { ...p, state: 'empty' } : p)))
    },
    [dict, ensureDict, text.words],
  )

  // Закрываем карточку по клику мимо, Escape и по смене размеров: смещение
  // посчитано от ширины статьи и после ресайза врёт. На скролл НЕ закрываем —
  // карточка внутри статьи и едет вместе с ней.
  useEffect(() => {
    if (!pop) return undefined
    const away = (e) => {
      // target бывает текстовым узлом — у него нет closest(); нормализуем до
      // элемента, иначе карточка закрывалась бы от клика по собственному тексту.
      const node = e.target instanceof Element ? e.target : e.target && e.target.parentElement
      if (!node || !node.closest('.rd-pop')) setPop(null)
    }
    const esc = (e) => e.key === 'Escape' && setPop(null)
    const off = () => setPop(null)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', off)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', off)
    }
  }, [pop])

  return (
    <div className="rd-articlewrap" ref={hostRef}>
      <article className="rd-article" lang="en">
        {paragraphs.map((par, pi) => (
          <p key={pi}>
            {par.map((s, si) => {
              const idx = flatIndex.indexOf(pi + ':' + si)
              return (
                <span key={si} className={`rd-s${idx === speakingIndex ? ' is-speaking' : ''}`}>
                  {s.split(/(\s+)/).map((tok, ti) =>
                    /\s+/.test(tok) || !tok || !/[A-Za-z]/.test(tok) ? (
                      <span key={ti}>{tok}</span>
                    ) : (
                      <span
                        key={ti}
                        className={`rd-w${pop && pop.word === tok ? ' is-active' : ''}`}
                        role="button"
                        tabIndex={0}
                        data-w={norm(tok)}
                        onClick={(e) => onWord(e, tok)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onWord(e, tok)
                          }
                        }}
                      >
                        {tok}
                      </span>
                    ),
                  )}{' '}
                </span>
              )
            })}
          </p>
        ))}
      </article>

      {pop && <WordPop pop={pop} host={hostRef} onClose={() => setPop(null)} t={t} />}
    </div>
  )
}

function WordPop({ pop, host, onClose, t }) {
  const ref = useRef(null)
  // Стартуем от слова; влезает ли карточка по ширине — известно только после
  // отрисовки, поэтому левый край доводим эффектом.
  const [left, setLeft] = useState(pop.at.left)

  useEffect(() => {
    const el = ref.current
    const box = host.current
    if (!el || !box) return
    const max = Math.max(0, box.clientWidth - el.offsetWidth - 4)
    setLeft(Math.max(0, Math.min(pop.at.left, max)))
  }, [pop, host])

  const e = pop.entry
  return (
    <div
      className="rd-pop"
      ref={ref}
      style={{ left, top: pop.at.top }}
      role="dialog"
      aria-label={t('reading.translation')}
    >
      <button type="button" className="rd-pop__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
      <div className="rd-pop__head">
        <span className="rd-pop__en" lang="en">{e ? e.en : displayWord(pop.word)}</span>
        <button
          type="button"
          className="rd-say"
          onClick={() => speak([e ? e.en : displayWord(pop.word)])}
          aria-label={`🔊 ${e ? e.en : pop.word}`}
        >
          🔊
        </button>
      </div>
      {e && e.tr && <div className="rd-pop__tr">{e.tr}</div>}
      {pop.state === 'loading' && <div className="rd-pop__row rd-pop__hint">…</div>}
      {pop.state === 'empty' && <div className="rd-pop__row rd-pop__hint">{t('reading.noTranslation')}</div>}
      {pop.state === 'ready' && e && (
        <>
          <div className="rd-pop__row"><span className="rd-flag">RU</span><span lang="ru">{e.ru}</span></div>
          {/* Казахский есть только у курируемых слоёв: сетевой переводчик его
              портит, и пустая строка честнее плохого перевода. */}
          {e.kz && <div className="rd-pop__row"><span className="rd-flag">KZ</span><span lang="kk">{e.kz}</span></div>}
        </>
      )}
    </div>
  )
}
