import { PICK_TUTORS } from './tutors.js'
import { ExpandMoreIcon, TuneIcon } from './TutorIcons.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'

// Шапка страницы тьютора — фиолетовый блок макета 29.10.2026 (мобильный
// Block1 и десктопный «Tutor»): сверху «Другие тьюторы» и «Управление
// тьютором», под ними имя и уровень, ниже — что положат внутрь: на дашборде
// лицо с карточкой настроек, в звонке лицо с репликами и полосой микрофона.
// Один компонент на оба экрана, потому что для ученика это одна страница:
// «Начать разговор» меняет только середину блока.
//
// «Другие тьюторы» ведёт на экран выбора (решение владельца 29.10.2026), а не
// раскрывает список: стрелка в макете — только знак, что там есть ещё.
export default function TutorHero({ tutor = {}, level, onOthers, onManage, className = '', children }) {
  const { t } = useLang()
  // В кружках — остальные тьюторы, как в макете: три, без текущего.
  const others = PICK_TUTORS.filter((tt) => tt.key !== tutor.key).slice(0, 3)
  return (
    <section className={'tp-hero' + (className ? ' ' + className : '')}>
      <img className="tp-hero__texture" src="/tutor/v2/hero-texture.webp" alt="" aria-hidden="true" />
      <div className="tp-hero__top">
        <button className="tp-hero__others" type="button" onClick={onOthers}>
          <span className="tp-hero__stack" aria-hidden="true">
            {others.map((tt) => (
              <span className="tp-hero__face" key={tt.key} style={tt.tint ? { background: tt.tint } : undefined}>
                <img src={tt.portrait || tt.avatar} alt="" />
              </span>
            ))}
          </span>
          <span className="tp-hero__otherslabel">{t('dash.others')}</span>
          <ExpandMoreIcon size={24} />
        </button>
        <button className="tp-hero__manage t-dash__manage" type="button" onClick={onManage}>
          <TuneIcon size={24} />
          <span>{t('dash.manage')}</span>
        </button>
      </div>
      <div className="tp-hero__name">
        <h1>{tutor.name}</h1>
        {level && <span className="tp-hero__level">{t('dash.level', { level })}</span>}
      </div>
      <div className="tp-hero__body">{children}</div>
    </section>
  )
}
