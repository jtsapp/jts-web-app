import { useI18n } from '../../i18n.jsx'
import { BoltIcon } from '../../ielts/icons.jsx'

/**
 * AI-тьютор (Figma SAT 25) — по решению A плана пока заглушка: раскладка макета (лимит запросов, переписка,
 * быстрые вопросы, поле ввода) видна, но ничего не делает и помечена «скоро». Рабочая версия — флаг SAT_AI и
 * серверный роут src/app/api/sat/tutor с дневным лимитом (как arcadeBudget), см. docs/sat/PLAN.md §4.
 */
export default function AiTutorPanel() {
  const { t } = useI18n()
  const chips = ['sat.ai.chip1', 'sat.ai.chip2', 'sat.ai.chip3']
  return (
    <div className="st-ai" aria-disabled="true">
      <p className="st-ai__limit"><BoltIcon size={16} />{t('sat.ai.soon')}</p>
      <div className="st-ai__chat">
        <span className="st-ai__me">{t('sat.ai.sampleQ')}</span>
        <div className="st-ai__bot">
          <b>{t('sat.ai.name')}</b>
          <p>{t('sat.ai.sampleA')}</p>
        </div>
      </div>
      <div className="st-ai__chips">
        {chips.map((k) => <button key={k} type="button" className="st-ai__chip is-locked" disabled>{t(k)}</button>)}
      </div>
      <span className="st-spacer" />
      <div className="st-ai__input">
        <input type="text" disabled placeholder={t('sat.ai.placeholder')} aria-label={t('sat.ai.placeholder')} />
      </div>
      <p className="st-ai__foot">{t('sat.ai.foot')}</p>
    </div>
  )
}
