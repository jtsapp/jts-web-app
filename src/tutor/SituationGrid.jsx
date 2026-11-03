import { useEffect, useRef, useState } from 'react'
import { SCENARIOS } from './scenarios.js'
import { useLang } from '../i18n/LanguageContext.jsx'

// Сколько обложка заранее начинает качаться до входа в экран.
const COVER_MARGIN = '200px 0px'
// Лицо могло не загрузиться вовсе: дольше сетка его не ждёт.
const HOLD_MS = 4000

// «Проверьте себя в разных ситуациях» — сетка сцен под шапкой страницы тьютора
// (макет 29.10.2026: четыре колонки на компьютере, две на телефоне). Та же
// сетка стоит и под звонком: там нажатие на сцену кладёт трубку и набирает её.
//
// Подпись под названием — первая часть описания сцены (scen.desc.<id> устроено
// «коротко: подробно»): в карточку влезает одна строка, а второго словаря под
// короткие подписи заводить незачем.
export function situationSub(desc = '') {
  const head = String(desc).split(':')[0].trim()
  return head ? head[0].toUpperCase() + head.slice(1) : ''
}

// Своё наблюдение вместо loading="lazy": браузер с ним заранее берёт всё в
// 1250–2500 px от экрана. Замер на проде 04.11.2026, телефон, Slow 4G: 14 обложек
// на 1,48 МБ шли разом с лицом, и его файл на 43 КБ ехал 4,6 с вместо 1,75 с.
// Под звонком те же файлы делили бы канал с голосом. На dev это не видно: там
// HTTP/1.1, и лимит соединений пропускает лицо вперёд.
function Cover({ src, allowed }) {
  const ref = useRef(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (near) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true)
      },
      { rootMargin: COVER_MARGIN },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [near])

  return <img ref={ref} className="tp-scen__img" src={near && allowed ? src : undefined} alt="" />
}

// hold — пока на странице грузится главное лицо, обложки его не обгоняют.
export default function SituationGrid({ onScenario, hold = false }) {
  const { t } = useLang()
  const [waitedEnough, setWaitedEnough] = useState(false)

  useEffect(() => {
    if (!hold) return undefined
    const id = setTimeout(() => setWaitedEnough(true), HOLD_MS)
    return () => clearTimeout(id)
  }, [hold])

  const allowed = !hold || waitedEnough
  return (
    <section className="tp-grid">
      <h2 className="tp-grid__title">{t('dash.gridTitle')}</h2>
      <div className="tp-grid__list t-scenarios">
        {SCENARIOS.map((s) => {
          const key = `scen.desc.${s.id}`
          const desc = t(key)
          return (
            <button className="tp-scen t-scenario" key={s.id} type="button" onClick={() => onScenario?.(s.id)}>
              <Cover src={s.img} allowed={allowed} />
              {s.level && <span className="tp-scen__level">{t('dash.level', { level: s.level })}</span>}
              <span className="tp-scen__text">
                <b>{s.label}</b>
                {desc !== key && <small>{situationSub(desc)}</small>}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
