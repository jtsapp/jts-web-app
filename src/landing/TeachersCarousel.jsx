'use client'

// Лента преподавателей: нативная горизонтальная прокрутка со scroll-snap
// (свайп на телефоне и тачпад работают без JS), кнопки макета листают её на
// ширину видимых карточек, точки телефона показывают, где ты в ленте.
import { useCallback, useEffect, useRef, useState } from 'react'

export default function TeachersCarousel({ t, icons }) {
  const trackRef = useRef(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const [current, setCurrent] = useState(0)

  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 })
    const card = el.children[0]
    if (card) {
      const step = card.getBoundingClientRect().width + 16
      setCurrent(Math.min(t.items.length - 1, Math.round(el.scrollLeft / step)))
    }
  }, [t.items.length])

  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [sync])

  const scrollBy = (dir) => {
    const el = trackRef.current
    const card = el?.children[0]
    if (!el || !card) return
    const step = card.getBoundingClientRect().width + 16
    // Листаем на целое число видимых карточек: остаток экрана, где карточка
    // видна наполовину, не должен проскакивать мимо глаз.
    const visible = Math.max(1, Math.floor((el.clientWidth + 16) / step))
    el.scrollBy({ left: dir * visible * step, behavior: 'smooth' })
  }

  return (
    <div className="ld-teach">
      <div className="ld-teach__track" ref={trackRef} onScroll={sync}>
        {t.items.map((p) => (
          <article key={p.name} className="ld-teacher">
            <div className="ld-teacher__photo">
              <img src={p.photo} width="294" height="280" alt={p.name} loading="lazy" />
              {p.badge && <span className="ld-teacher__badge"><img src={icons.school} width="18" height="18" alt="" />{p.badge}</span>}
            </div>
            <div className="ld-teacher__body">
              <div>
                <h3 className="ld-teacher__name">{p.name}</h3>
                <div className="ld-teacher__exp">{p.exp}</div>
              </div>
              <ul className="ld-teacher__facts">
                {p.facts.map((f) => <li key={f.text}><img src={f.icon} width="16" height="16" alt="" />{f.text}</li>)}
              </ul>
            </div>
          </article>
        ))}
      </div>
      <div className="ld-teach__nav">
        <button type="button" className="ld-teach__btn" aria-label={t.prev} disabled={edge.start} onClick={() => scrollBy(-1)}>
          <img src={icons.prev} width="24" height="24" alt="" />
        </button>
        <button type="button" className="ld-teach__btn ld-teach__btn--dark" aria-label={t.next} disabled={edge.end} onClick={() => scrollBy(1)}>
          <img src={icons.next} width="24" height="24" alt="" />
        </button>
      </div>
      <div className="ld-teach__dots" aria-hidden="true">
        {t.items.map((p, i) => <i key={p.name} className={i === current ? 'is-on' : ''} />)}
      </div>
    </div>
  )
}
