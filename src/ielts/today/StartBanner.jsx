import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon } from '../icons.jsx'

/**
 * Следующий шаг старта IELTS на «Сегодня»: онбординг → диагностика → маршрут. Пока профиль не настроен, план дня —
 * стартовый, и честнее прямо сказать, чего не хватает, чем показывать цель и прогноз прочерками.
 */
export function startStep(profile) {
  if (!profile) return null
  if (!profile.onboarded) return 'onboarding'
  if (!profile.bands || profile.bands.overall == null) return 'diagnostic'
  if (!profile.route) return 'route'
  return null
}

export default function StartBanner({ step, onGo }) {
  const { t } = useI18n()
  if (!step) return null
  return (
    <section className="ih-card ih-start" data-step={step}>
      <div>
        <b>{t(`ieltsOb.start.${step}.title`)}</b>
        <p>{t(`ieltsOb.start.${step}.text`)}</p>
      </div>
      <button type="button" className="ih-cta" onClick={() => onGo(step)}>
        {t(`ieltsOb.start.${step}.cta`)}
        <ArrowForwardIcon size={18} />
      </button>
    </section>
  )
}
