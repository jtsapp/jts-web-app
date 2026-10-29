import { SCENARIOS } from './scenarios.js'
import { useLang } from '../i18n/LanguageContext.jsx'

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

export default function SituationGrid({ onScenario }) {
  const { t } = useLang()
  return (
    <section className="tp-grid">
      <h2 className="tp-grid__title">{t('dash.gridTitle')}</h2>
      <div className="tp-grid__list t-scenarios">
        {SCENARIOS.map((s) => {
          const key = `scen.desc.${s.id}`
          const desc = t(key)
          return (
            <button className="tp-scen t-scenario" key={s.id} type="button" onClick={() => onScenario?.(s.id)}>
              <img className="tp-scen__img" src={s.img} alt="" loading="lazy" />
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
