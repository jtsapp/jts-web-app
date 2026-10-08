import { useEffect, useRef, useState } from 'react'
import TutorThumb from './TutorThumb.jsx'
import { VolumeIcon } from './TutorIcons.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'

// Выбор тьютора на телефоне — карусель по кадру Figma «Web Адаптивка» 4338:1568:
// аватар 200 по центру, соседи 124 (scale 0.62) с прозрачностью 0.5 выглядывают
// из-за краёв экрана, под ним имя, черты, описание, внизу «Послушать голос» и
// «Выбрать <имя>». Листается свайпом и тапом по соседу; точек и стрелок в кадре
// нет — их роль играют выглядывающие соседи.
//
// Здесь только показ и листание: какой нрав уходит дальше, есть ли у тьютора
// визитка и что значит «выбрать» — решает экран выбора, тем же кодом, что и для
// десктопного ряда (иначе два вида одного выбора разъехались бы).
//
// Цикл бесконечный: три копии списка, индекс после перехода тихо
// возвращается в среднюю (та же картинка на том же месте — шва не видно).
// Так было и в прошлой мобильной карусели (до сентября 2026), подход проверен.
const SLOT = 186 // центр-к-центру соседних аватаров в кадре
const SIDE_SCALE = 0.62 // 124 / 200
const SWIPE_MIN = 40 // короче — это тап или дрожь пальца, а не листание
const TAP_SLOP = 6
const EASE_MS = 340

export default function TutorCarousel({
  tutors,
  startKey = '',
  temperOf,
  canListen,
  onListen,
  onChoose,
}) {
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
  const cur = tutors[active]

  // Строка словаря, которой может не быть: у Айзере (dev-only) описания нет, и
  // сырой ключ на экране хуже пустого места.
  const tOpt = (key) => {
    const s = t(key)
    return s === key ? '' : s
  }

  const go = (step) => {
    setAnim(true)
    setIdx((i) => i + step)
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { x0: e.clientX, d: 0 }
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

  const listenable = canListen(cur)
  const soon = Boolean(cur.comingSoon)

  return (
    <div className="t-car">
      <div className="t-car__main">
        <div
          className="t-car__stage"
          role="group"
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
          // Страховка для браузеров без overflow: clip — там сцену прокручивает
          // к сфокусированному соседу сам браузер (см. src/mobile/tutor.css).
          onScroll={(e) => {
            e.currentTarget.scrollLeft = 0
          }}
        >
          {slides.map((tt, i) => {
            const off = i - idx
            const near = Math.abs(off) <= 1
            const side = near && off !== 0
            // Орб — живая канва с rAF, а слотов втрое больше, чем тьюторов:
            // монтируем его только в видимых. Картинки — с запасом в слот, чтобы
            // въезжающий сосед не появлялся пустым кругом.
            const thumb = tt.face === 'orb' ? near : Math.abs(off) <= 2
            return (
              <button
                key={i}
                type="button"
                className={'t-car__slot' + (off === 0 ? ' is-center' : '')}
                style={{
                  transform: `translateX(calc(-50% + ${off * SLOT + dx}px)) scale(${off === 0 ? 1 : SIDE_SCALE})`,
                  opacity: off === 0 ? 1 : side ? 0.5 : 0,
                  transition: anim ? undefined : 'none',
                }}
                tabIndex={side ? 0 : -1}
                aria-hidden={!side}
                aria-label={side ? tt.name : undefined}
                onClick={() => {
                  if (swallowClick.current || !side) return
                  go(off)
                }}
              >
                {thumb && <TutorThumb tutor={tt} className="t-car__img" />}
              </button>
            )
          })}
        </div>

        {/* Подписи всех тьюторов лежат в одной ячейке сетки, видна только
            текущая. Высота блока — по самой длинной, поэтому при листании
            аватар (блок стоит по центру экрана) не прыгает вверх-вниз. */}
        <div className="t-car__infos" aria-live="polite">
          {tutors.map((tt, i) => {
            const desc = tOpt(
              temperOf(tt) === 'harsh' ? `tutor.${tt.key}.desc18` : `tutor.${tt.key}.desc`,
            )
            const on = i === active
            return (
              <div className={'t-car__info' + (on ? ' is-current' : '')} key={tt.key} aria-hidden={!on}>
                <div className="t-car__head">
                  <div className="t-car__name">{tt.name}</div>
                  <div className="t-car__chips">
                    {tt.traitColors.map((color, k) => (
                      <span className="t-car__chip" key={color} style={{ background: color }}>
                        {t(`tutor.${tt.key}.trait${k + 1}`)}
                      </span>
                    ))}
                  </div>
                </div>
                {desc && <p className="t-car__desc">{desc}</p>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="t-car__actions">
        {/* Визитки нет (Айзере) — кнопка не рисуется, но место держит: иначе
            блок над ней съезжал бы на каждом таком тьюторе. */}
        <button
          className={'t-car__listen' + (listenable ? '' : ' is-none')}
          type="button"
          disabled={!listenable}
          onClick={() => onListen(cur)}
        >
          {listenable ? t(`tutor.${cur.key}.listen`) : ''}
          <VolumeIcon size={20} />
        </button>
        <button className="t-car__choose" type="button" disabled={soon} onClick={() => onChoose(cur)}>
          {soon ? t('choose.soon') : t(`tutor.${cur.key}.choose`)}
        </button>
      </div>
    </div>
  )
}
