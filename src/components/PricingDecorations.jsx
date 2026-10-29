import { useI18n } from '../i18n.jsx'
import { BONUSES, INCLUDED } from '../data/pricing.js'

// Original pricing artwork and feature blocks, retained with the published catalog.
export function PricingExtras({ category }) {
  const { t } = useI18n()
  if (category !== 'GENERAL' && category !== 'GENERAL_GROUP') return null
  const individual = category === 'GENERAL'
  const features = individual
    ? [{ icon: 'teacher', key: 'pricing.ind.f1' }, { icon: 'calendar', key: 'pricing.ind.f2' }, { icon: 'mic', key: 'pricing.ind.f3' }]
    : [{ icon: 'mic', key: 'pricing.group.f1' }, { icon: 'gift', key: 'pricing.group.f2' }]
  return <div className="pr-extras">
    <ul className="pr-feats">{features.map(({icon, key}) => <li key={key}><PricingFeatureIcon kind={icon} />{t(key)}</li>)}</ul>
    <PricingBonuses list={individual ? BONUSES.individual : BONUSES.group} t={t} />
  </div>
}

export function PricingIncluded() {
  const { t } = useI18n()
  return <section className="pr-inc">
    <h2 className="pr-inc__title"><PricingCheckMark />{t('pricing.included')}</h2>
    <div className="pr-inc__grid">{INCLUDED.map((feature) => <div className="pr-inc__cell" key={feature.id}>
      <PricingFeatureIcon kind={feature.icon} />
      <span><b>{t(feature.title)}</b><i>{t(feature.sub)}</i></span>
    </div>)}</div>
  </section>
}

function PricingBonuses({ list, t }) {
  return (
    <div className="pr-bonus">
      <div className="pr-bonus__body">
        <div className="pr-bonus__title">
          <GiftMark />
          {t('pricing.bonus')}
        </div>
        <ul>
          {list.map((b) => (
            <li key={b.id}>{b.label}</li>
          ))}
        </ul>
      </div>
      {/* Логотипы — украшение блока, а не список: подписи уже слева, и второй
          раз называть их скринридеру незачем. */}
      <div className="pr-bonus__art" aria-hidden="true">
        {list.map((b) => (
          <img key={b.id} src={b.icon} alt="" />
        ))}
        <img className="pr-bonus__gift" src="/assets/demo/gift.png" alt="" />
      </div>
    </div>
  )
}

export function PricingSectionIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (kind === 'self') return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
  if (kind === 'group') return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 19a5.6 5.6 0 0 0-2-4.2" /></svg>
  return <svg {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>
}

function PricingFeatureIcon({ kind }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (kind) {
    case 'teacher':
    case 'manager':
      return <svg {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></svg>
    case 'calendar':
      return <svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" /></svg>
    case 'mic':
      return <svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
    case 'gift':
      return <svg {...p}><rect x="3.5" y="9" width="17" height="11" rx="2" /><path d="M3.5 13.5h17M12 9v11" /><path d="M12 9S10.5 4.5 8 4.5a2.2 2.2 0 0 0 0 4.5M12 9s1.5-4.5 4-4.5a2.2 2.2 0 0 1 0 4.5" /></svg>
    case 'program':
      return <svg {...p}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'practice':
      return <svg {...p}><path d="M4 12a8 8 0 1 1 3 6.2" /><path d="M4 19v-5h5" /></svg>
    case 'vocab':
      return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
    case 'dialogs':
      return <svg {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6A1.5 1.5 0 0 1 14.5 13H8l-4 3z" /><path d="M18 9h.5A1.5 1.5 0 0 1 20 10.5v6A1.5 1.5 0 0 1 18.5 18H14l-2 2v-2" /></svg>
    case 'selfstudy':
      return <svg {...p}><path d="M12 6c-2-1.3-4.5-1.3-7-1v13c2.5-.3 5-.3 7 1 2-1.3 4.5-1.3 7-1V5c-2.5-.3-5-.3-7 1Z" /><path d="M12 6v13" /></svg>
    default:
      return <svg {...p}><circle cx="12" cy="12" r="8.5" /></svg>
  }
}

export function PricingCheckMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path d="m8 12.3 2.7 2.7L16 9.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GiftMark() {
  return <PricingFeatureIcon kind="gift" />
}

