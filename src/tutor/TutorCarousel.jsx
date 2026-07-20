import { useEffect, useRef, useState } from 'react'
import { TUTORS } from './tutors.js'
import { VolumeIcon } from './TutorIcons.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'

// Мобильная карусель выбора тьютора (Figma «APP DESIGN - mobile», фреймы 91–93).
// Центральный аватар 200px, соседи 111px выглядывают за края. Свайп плавно
// слайдит с масштабом (coverflow); бесконечный цикл — три копии списка, индекс
// после перехода тихо возвращается в среднюю копию (без анимации).
const SLOT = 170 // расстояние центр-к-центру соседних аватаров (Figma)

export default function TutorCarousel({ onChoose, onListen }) {
  const { t } = useLang()
  const n = TUTORS.length
  const slides = [...TUTORS, ...TUTORS, ...TUTORS] // 3 копии для бесшовной прокрутки
  const [idx, setIdx] = useState(n) // старт в средней копии
  const [dx, setDx] = useState(0)
  const [anim, setAnim] = useState(true)
  const drag = useRef(null)

  const active = ((idx % n) + n) % n
  const cur = TUTORS[active]

  const clientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX)
  const onStart = (e) => { drag.current = { x0: clientX(e), d: 0 }; setAnim(false) }
  const onMove = (e) => {
    if (!drag.current) return
    const d = clientX(e) - drag.current.x0
    drag.current.d = d
    setDx(d)
  }
  const onEnd = () => {
    if (!drag.current) return
    const d = drag.current.d
    drag.current = null
    setAnim(true)
    setDx(0)
    if (Math.abs(d) > 40) setIdx((i) => i + (d < 0 ? 1 : -1))
  }

  // После завершения перехода тихо возвращаем индекс в среднюю копию, чтобы
  // список не «кончался» (та же картинка на том же месте — визуально незаметно).
  useEffect(() => {
    if (idx >= n && idx < 2 * n) return
    const tm = setTimeout(() => {
      setAnim(false)
      setIdx(active + n)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)))
    }, 340)
    return () => clearTimeout(tm)
  }, [idx, n, active])

  return (
    <div className="t-car">
      <div
        className="t-car__stage"
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
      >
        {slides.map((tt, i) => {
          const off = i - idx
          const center = off === 0
          const visible = Math.abs(off) <= 1
          return (
            <div
              key={i}
              className={`t-car__slot${center ? ' t-car__slot--center' : ''}`}
              style={{
                transform: `translateX(calc(-50% + ${off * SLOT + dx * 0.5}px)) scale(${center ? 1 : 0.555})`,
                transition: anim ? 'transform 0.34s cubic-bezier(0.3, 0.8, 0.3, 1)' : 'none',
                opacity: visible ? 1 : 0,
                zIndex: center ? 2 : 1,
              }}
            >
              <img src={tt.avatar} alt="" draggable="false" />
            </div>
          )
        })}
      </div>

      <div className="t-car__info" key={cur.key}>
        <div className="t-car__name">{cur.name}</div>
        <div className="t-car__chips">
          {cur.traitColors.map((c, i) => (
            <span className="t-car__chip" key={i} style={{ background: c }}>
              {t(`tutor.${cur.key}.trait${i + 1}`)}
            </span>
          ))}
        </div>
        <p className="t-car__desc">{t(`tutor.${cur.key}.desc`)}</p>
      </div>

      <div className="t-car__actions">
        <button className="t-car__listen" type="button" onClick={() => onListen && onListen(cur.key)}>
          {t(`tutor.${cur.key}.listen`)}
          <VolumeIcon size={20} />
        </button>
        <button className="t-car__choose" type="button" onClick={() => onChoose && onChoose(cur.key)}>
          {t(`tutor.${cur.key}.choose`)}
        </button>
      </div>
    </div>
  )
}
