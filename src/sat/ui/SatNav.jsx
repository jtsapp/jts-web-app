import { useI18n } from '../../i18n.jsx'
import { CapLogoIcon, MoonLineIcon, NAV_ICONS, SunLineIcon } from '../icons.jsx'

// Навигация «TeenTech SAT» (B12, прототип a4f6a9e1): две группы с иконками — «Study» (учёба) и «Tools» (инструменты).
// «Прогресс» убран (B4): его меры живут на дашборде «Сегодня». «Past papers» — свой экран во всё окно (B6), поэтому
// пункт ведёт не на вкладку, а на экран; на телефоне его в полосе вкладок нет — туда ведёт кнопка из «Пробников».
export const SAT_GROUPS = [
  { key: 'study', items: ['today', 'plan', 'practice', 'mocks', 'materials'] },
  { key: 'tools', items: ['errors', 'vocab', 'guide', 'papers'] },
]

/** Вкладки хаба (без «papers» — это отдельный экран). */
export const SAT_TABS = SAT_GROUPS.flatMap((g) => g.items).filter((k) => k !== 'papers')

/** Группа раздела — подпись над заголовком страницы («Study» / «Tools»). */
export function groupOf(key) {
  return SAT_GROUPS.find((g) => g.items.includes(key))?.key || null
}

export function SatBrand() {
  const { t } = useI18n()
  return (
    <span className="st-brand">
      <span className="st-brand__mark"><CapLogoIcon size={20} /></span>
      <span className="st-brand__text"><b>{t('sat.brand')}</b><small>{t('sat.brandEyebrow')}</small></span>
    </span>
  )
}

/** Колонка навигации SAT (на телефоне — полоса вкладок с прокруткой). */
export default function SatNav({ value, onChange, theme, onTheme }) {
  const { t } = useI18n()
  return (
    <aside className="st-nav" aria-label={t('sat.brand')}>
      <div className="st-nav__head">
        <SatBrand />
        {onTheme && (
          <button type="button" className="st-nav__theme" onClick={onTheme} aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')} title={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}>
            {theme === 'dark' ? <SunLineIcon size={18} /> : <MoonLineIcon size={18} />}
          </button>
        )}
      </div>
      <nav className="st-nav__list" role="tablist" aria-label={t('sat.brand')}>
        {SAT_GROUPS.map((g) => (
          <div key={g.key} className="st-nav__group">
            <span className="st-nav__label">{t(`sat.nav.${g.key}`)}</span>
            {g.items.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`st-tab-${k}`}
                aria-selected={value === k}
                aria-controls={k === 'papers' ? undefined : `st-panel-${k}`}
                className={`st-nav__item ${value === k ? 'is-on' : ''} ${k === 'papers' ? 'is-wide-only' : ''}`}
                onClick={() => onChange(k)}
              >
                {NAV_ICONS[k](20)}
                <span>{t(`sat.tab.${k}`)}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

/** Крошки «TeenTech SAT / Раздел» и крупный заголовок с группой над ним. */
export function SatPageHead({ tab, onHome, children }) {
  const { t } = useI18n()
  const group = groupOf(tab)
  return (
    <header className="st-head">
      <nav className="st-crumbs" aria-label={t('sat.crumbs')}>
        <button type="button" onClick={onHome}>{t('sat.brand')}</button>
        <span aria-hidden="true">/</span>
        <b>{t(`sat.tab.${tab}`)}</b>
      </nav>
      <div className="st-head__row">
        <div>
          <span className="st-head__eyebrow">{group ? t(`sat.nav.${group}`) : t('sat.brand')}</span>
          <h1 className="st-head__title">{t(`sat.tab.${tab}`)}</h1>
        </div>
        <span className="st-spacer" />
        {children}
      </div>
    </header>
  )
}
