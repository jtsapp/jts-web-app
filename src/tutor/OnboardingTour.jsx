import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/LanguageContext.jsx'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// Раскладка поповера: у элемента справа — слева от него, иначе снизу/сверху.
// Если элемент такой высокий, что поповер не помещается ни там, ни там (частый
// случай на телефоне), прибиваем поповер к низу экрана — раньше он ложился
// прямо на подсвеченный элемент или упирался в статусбар.
function placePopover(rect, popW, popH) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const m = 16
  if (!rect) return { left: (vw - popW) / 2, top: (vh - popH) / 2 }
  const spaceLeft = rect.left
  const spaceBelow = vh - rect.bottom
  const centeredLeft = clamp(rect.left + rect.width / 2 - popW / 2, m, vw - popW - m)
  if (rect.left > vw * 0.55 && spaceLeft > popW + m) {
    return {
      left: rect.left - popW - m,
      top: clamp(rect.top, m, vh - popH - m),
    }
  }
  if (spaceBelow > popH + m) {
    return { left: centeredLeft, top: rect.bottom + m }
  }
  if (rect.top - popH - m > m) {
    return { left: centeredLeft, top: rect.top - popH - m }
  }
  return { left: centeredLeft, top: vh - popH - m }
}

// Гайд-тур: затемняет экран, «прожигает» дырку на текущем элементе (по CSS-селектору),
// рядом рисует поповер с текстом, прогрессом и кнопкой «ОК». По шагам вперёд; в конце
// ставит флаг в localStorage и вызывает onFinish.
export default function OnboardingTour({ steps, onFinish, storageKey }) {
  const t = useT()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const step = steps[i]

  useLayoutEffect(() => {
    if (!step) return undefined
    // Скроллим мгновенно и запираем прокрутку страницы: под туром она жила
    // своей жизнью — прожектор и поповер уезжали с подсвеченного элемента.
    const el = document.querySelector(step.selector)
    el?.scrollIntoView({ block: 'center', behavior: 'auto' })
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const measure = () => {
      const node = document.querySelector(step.selector)
      setRect(node ? node.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      document.documentElement.style.overflow = prevOverflow
      window.removeEventListener('resize', measure)
    }
  }, [step])

  const finish = () => {
    try {
      if (storageKey) localStorage.setItem(storageKey, '1')
    } catch {
      /* localStorage недоступен — просто закрываем */
    }
    onFinish?.()
  }
  const next = () => (i + 1 < steps.length ? setI(i + 1) : finish())

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'Enter' || e.key === ' ') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!step) return null

  const pad = 10
  const hole = rect
    ? {
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null
  const pos = placePopover(hole, 300, 210)
  const last = i + 1 === steps.length

  // Портал в body: обёртка смены экранов (.scr-in) анимируется transform'ом и
  // становится containing block — position: fixed внутри неё ехал вместе со
  // скроллом страницы (поповер обрезался краем экрана).
  return createPortal(
    <div className="t-tour" role="dialog" aria-modal="true" aria-label={step.title}>
      {hole ? (
        <div className="t-tour__hole" style={hole} />
      ) : (
        <div className="t-tour__veil" />
      )}

      <div className="t-tour__pop" style={{ left: pos.left, top: pos.top }}>
        <b className="t-tour__title">{step.title}</b>
        <p className="t-tour__text">{step.text}</p>

        <div className="t-tour__bar">
          <span style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="t-tour__foot">
          <button className="t-tour__skip" type="button" onClick={finish}>
            {t('tour.skip')}
          </button>
          <div className="t-tour__right">
            <span className="t-tour__count">
              {i + 1}/{steps.length}
            </span>
            <button className="t-tour__ok" type="button" onClick={next}>
              {last ? t('tour.done') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
