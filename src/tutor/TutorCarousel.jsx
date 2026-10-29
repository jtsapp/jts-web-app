import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n/LanguageContext.jsx'

// Выбор тьютора на телефоне — карусель карточек по кадру Figma «Mobile» →
// «AI-тьютор» (7248:17411, 29.10.2026): карточка 322 по центру, соседи 280 с
// прозрачностью 0.5 выглядывают из-за краёв экрана. Листается свайпом и тапом
// по соседу; точек и стрелок в кадре нет — их роль играют выглядывающие соседи.
//
// Здесь только листание: что нарисовано на карточке, решает экран выбора
// (renderCard) — та же карточка стоит и в десктопном ряду, и два вида одного
// выбора не разъедутся.
//
// Цикл бесконечный: три копии списка, индекс после перехода тихо
// возвращается в среднюю (та же картинка на том же месте — шва не видно).
// Так было и в прошлых мобильных каруселях, подход проверен.
const SLOT = 309 // центр-к-центру соседних карточек в кадре: 322/2 + 8 + 280/2
const SIDE_SCALE = 280 / 322
const SWIPE_MIN = 40 // короче — это тап или дрожь пальца, а не листание
const TAP_SLOP = 6
const EASE_MS = 340

export default function TutorCarousel({ tutors, startKey = '', onActive, renderCard }) {
  const { t } = useLang()
  const n = tutors.length
  const slides = [...tutors, ...tutors, ...tutors]
  const [idx, setIdx] = useState(() => n + Math.max(0, tutors.findIndex((tt) => tt.key === startKey)))
  const [dx, setDx] = useState(0)
  const [anim, setAnim] = useState(true)
  const drag = useRef(null)
  // Свайп, отпущенный над соседом, тут же даёт ему click — без отметки карусель
  // шагнула бы дважды.
  const swallowClick = useRef(false)

  const active = ((idx % n) + n) % n
  const activeKey = tutors[active]?.key
  useEffect(() => {
    if (activeKey) onActive?.(activeKey)
    // onActive — новая функция на каждый рендер экрана; важен только сам ключ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const go = (step) => {
    setAnim(true)
    setIdx((i) => i + step)
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Кнопки на самой карточке (18+, «Послушать») — не начало свайпа.
    if (e.target.closest('button')) return
    drag.current = { x0: e.clientX, y0: e.clientY, d: 0 }
    swallowClick.current = false
    setAnim(false)
  }
  const onPointerMove = (e) => {
    const g = drag.current
    if (!g) return
    // Палец ведёт ленту 1:1, но не дальше соседнего слота.
    g.d = Math.max(-SLOT, Math.min(SLOT, e.clientX - g.x0))
    if (Math.abs(g.d) > TAP_SLOP) swallowClick.current = true
    setDx(g.d)
  }
  const onPointerEnd = () => {
    const g = drag.current
    if (!g) return
    drag.current = null
    setAnim(true)
    setDx(0)
    if (Math.abs(g.d) >= SWIPE_MIN) setIdx((i) => i + (g.d < 0 ? 1 : -1))
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else return
    e.preventDefault()
  }

  useEffect(() => {
    if (idx >= n && idx < 2 * n) return
    const tm = setTimeout(() => {
      setAnim(false)
      setIdx(active + n)
    }, EASE_MS)
    return () => clearTimeout(tm)
  }, [idx, n, active])

  // Тихий возврат в среднюю копию идёт без анимации; включаем её обратно через
  // два кадра — к тому времени новая позиция уже отрисована, и слоты не
  // поедут к ней через весь экран.
  useEffect(() => {
    if (anim || drag.current) return
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        if (!drag.current) setAnim(true)
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [anim, idx])

  return (
    <div
      className="t-car"
      role="radiogroup"
      aria-roledescription="carousel"
      aria-label={t('choose.title')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onKeyDown={onKeyDown}
      // Картинку мышью браузер тащит как файл и съедает pointermove.
      onDragStart={(e) => e.preventDefault()}
      // Страховка для браузеров без overflow: clip — там ленту прокручивает к
      // сфокусированному соседу сам браузер.
      onScroll={(e) => {
        e.currentTarget.scrollLeft = 0
      }}
    >
      {slides.map((tt, i) => {
        const off = i - idx
        const near = Math.abs(off) <= 1
        const side = near && off !== 0
        // Карточек втрое больше, чем тьюторов: рисуем только те, что на экране
        // или въедут следующими.
        if (Math.abs(off) > 2) return null
        return (
          <div
            key={i}
            className={'t-car__slot' + (off === 0 ? ' is-center' : '')}
            style={{
              transform: `translateX(calc(-50% + ${off * SLOT + dx}px)) scale(${off === 0 ? 1 : SIDE_SCALE})`,
              opacity: off === 0 ? 1 : side ? 0.5 : 0,
              transition: anim ? undefined : 'none',
            }}
            role="radio"
            aria-checked={off === 0}
            aria-hidden={!near}
            aria-label={tt.name}
            tabIndex={side ? 0 : -1}
            onClick={() => {
              if (swallowClick.current || !side) return
              go(off)
            }}
            onKeyDown={(e) => {
              if (side && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                go(off)
              }
            }}
          >
            {renderCard(tt, off === 0)}
          </div>
        )
      })}
    </div>
  )
}
