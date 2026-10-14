import { useI18n } from '../../i18n.jsx'
import GeGoalBanner from './GeGoalBanner.jsx'

// Образец блока цели под блюром — «так будет выглядеть твой маршрут». Числа выдуманы и потому закрыты: прочитать их
// нельзя (блюр), а скринридеру и клавиатуре они не достаются вовсе (aria-hidden + inert).
const SAMPLE = {
  targetLevel: 'B2',
  deadlineWindow: '3-6m',
  deadline: { state: 'days', daysRemaining: 120, date: '2027-02-15', approximate: false },
  journey: { start: 'A2', current: { level: 'B1', percent: 40 } },
}

/**
 * Закрытый роадмап «Главной» (решение руководителя 14.10.2026): до теста уровня верхний блок «точка А → точка Б»
 * размыт и просит пройти тест. Закрыт только он — остальная «Главная» и меню работают.
 */
export default function GeLockedRoadmap({ onStart }) {
  const { t } = useI18n()
  return (
    <section className="ge-locked" aria-labelledby="ge-locked-title">
      <div className="ge-locked__preview" aria-hidden="true" inert>
        <GeGoalBanner profile={SAMPLE} option={null} planLine={null} week={0} />
      </div>
      <div className="ge-locked__veil">
        <span className="ge-locked__lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <h2 id="ge-locked-title" className="ge-locked__title">
          {t('geHome.locked.title')}
        </h2>
        <p className="ge-locked__sub">{t('geHome.locked.sub')}</p>
        <button type="button" className="hm-placement__cta ge-locked__cta" onClick={() => onStart?.()}>
          {t('geHome.locked.cta')}
        </button>
      </div>
    </section>
  )
}
