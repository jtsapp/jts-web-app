import { useRef, useState } from 'react'
import { TUTORS } from './tutors.js'
import { VolumeIcon } from './TutorIcons.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'

// Мобильная карусель выбора тьютора (Figma «APP DESIGN - mobile», фреймы 91–93).
// Центральный аватар 200px, соседи 111px выглядывают по краям. Свайп влево/вправо
// листает по кругу (modulo — «бесконечно»). Имя/теги/описание/кнопки — активного.
export default function TutorCarousel({ onChoose, onListen }) {
  const { t } = useLang()
  const n = TUTORS.length
  const [active, setActive] = useState(0)
  const [dx, setDx] = useState(0)
  const drag = useRef(null)

  const at = (i) => TUTORS[((i % n) + n) % n]
  const cur = TUTORS[active]
  const go = (dir) => setActive((a) => (((a + dir) % n) + n) % n)

  const px = (e) => (e.touches ? e.touches[0].clientX : e.clientX)
  const start = (e) => { drag.current = { x0: px(e), d: 0 } }
  const move = (e) => {
    if (!drag.current) return
    const d = px(e) - drag.current.x0
    drag.current.d = d
    setDx(Math.max(-70, Math.min(70, d)))
  }
  const end = () => {
    if (!drag.current) return
    const d = drag.current.d
    drag.current = null
    setDx(0)
    if (Math.abs(d) > 40) go(d < 0 ? 1 : -1)
  }

  return (
    <div className="t-car">
      <div
        className="t-car__stage"
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        style={{ transform: `translateX(${dx * 0.4}px)` }}
      >
        <div className="t-car__ava t-car__ava--side t-car__ava--prev">
          <img src={at(active - 1).avatar} alt="" draggable="false" />
        </div>
        <div className="t-car__ava t-car__ava--side t-car__ava--next">
          <img src={at(active + 1).avatar} alt="" draggable="false" />
        </div>
        <div className="t-car__ava t-car__ava--cur" key={cur.key}>
          <img src={cur.avatar} alt="" draggable="false" />
        </div>
      </div>

      <div className="t-car__name">{cur.name}</div>

      <div className="t-car__chips">
        {cur.traitColors.map((c, i) => (
          <span className="t-car__chip" key={i} style={{ background: c }}>
            {t(`tutor.${cur.key}.trait${i + 1}`)}
          </span>
        ))}
      </div>

      <p className="t-car__desc">{t(`tutor.${cur.key}.desc`)}</p>

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
