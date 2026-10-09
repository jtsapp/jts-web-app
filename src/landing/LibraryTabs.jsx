'use client'

// «Библиотека и практика»: список разделов слева, карточка раздела справа
// (на телефоне — лента чипов над карточкой). Полоска под активным пунктом в
// макете — таймер: разделы листаются сами, пока посетитель не выбрал раздел
// руками.
import { useEffect, useRef, useState } from 'react'

const AUTO_MS = 6000

const pad = (n) => String(n).padStart(2, '0')

export default function LibraryTabs({ label, sections, checkIcon }) {
  const [active, setActive] = useState(0)
  // Выбрал сам — автолистание больше не перехватывает раздел из-под руки.
  const [manual, setManual] = useState(false)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  // Таймер стоит, пока блок за экраном: иначе посетитель долистывает до него
  // уже на пятом разделе и не видит начала.
  const [inView, setInView] = useState(false)
  const rootRef = useRef(null)
  const chipsRef = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const auto = !manual && !reduced

  // Лента чипов на телефоне доезжает до активного. Двигаем только её
  // scrollLeft: scrollIntoView прокрутил бы и саму страницу к разделу, пока
  // посетитель читает что-то другое.
  useEffect(() => {
    const box = chipsRef.current
    const chip = box?.children[active]
    if (!box || !chip || box.scrollWidth <= box.clientWidth) return
    box.scrollTo({ left: chip.offsetLeft - box.offsetLeft - 16, behavior: 'smooth' })
  }, [active])

  const pick = (i) => {
    setManual(true)
    setActive(i)
  }

  const onKey = (e) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (active + step + sections.length) % sections.length
    pick(next)
    e.currentTarget.children[next]?.focus()
  }

  return (
    <div
      className="ld-lib"
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ld-lib__list">
        <div className="ld-lib__caption">
          <span>{label}</span>
          <b>{pad(active + 1)} / {pad(sections.length)}</b>
        </div>
        <div className="ld-lib__tabs" role="tablist" aria-label={label} ref={chipsRef} onKeyDown={onKey}>
          {sections.map((s, i) => {
            const on = i === active
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={'ld-tab-' + s.id}
                aria-selected={on}
                aria-controls={'ld-panel-' + s.id}
                tabIndex={on ? 0 : -1}
                className={'ld-lib__tab' + (on ? ' is-on' : '')}
                onClick={() => pick(i)}
              >
                <span className="ld-lib__row">
                  <img className="ld-lib__icon" src={s.icon} alt="" />
                  <span className="ld-lib__name">{s.name}</span>
                  <span className="ld-lib__meta">{s.meta}</span>
                </span>
                {on && (
                  <span className="ld-lib__timer">
                    <i
                      key={active}
                      className={auto ? 'is-running' : ''}
                      style={{ animationDuration: AUTO_MS + 'ms', animationPlayState: paused || !inView ? 'paused' : 'running' }}
                      onAnimationEnd={() => auto && setActive((a) => (a + 1) % sections.length)}
                    />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Все карточки лежат в одной ячейке сетки: высота блока — по самой
          высокой, и автолистание не дёргает страницу под читателем. */}
      <div className="ld-lib__panels">
        {sections.map((s, i) => {
          const on = i === active
          return (
            <article
              key={s.id}
              id={'ld-panel-' + s.id}
              role="tabpanel"
              aria-labelledby={'ld-tab-' + s.id}
              aria-hidden={!on}
              className={'ld-lib__panel' + (on ? ' is-on' : '')}
            >
              <img className="ld-lib__shot" src={s.img} width="780" height="360" alt="" loading={i === 0 ? 'eager' : 'lazy'} />
              <div className="ld-lib__body">
                <div className="ld-lib__about">
                  <div className="ld-lib__chips">
                    <span className="ld-chip">{s.chips[0]}</span>
                    <span className="ld-chip ld-chip--soft">{s.chips[1]}</span>
                  </div>
                  <h3 className="ld-lib__title">{s.title}</h3>
                  <p className="ld-lib__text">{s.text}</p>
                </div>
                <ul className="ld-lib__bullets">
                  {s.bullets.map((b) => (
                    <li key={b}><img src={checkIcon} width="22" height="22" alt="" />{b}</li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
