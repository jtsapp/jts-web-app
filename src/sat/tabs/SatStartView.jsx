import { useI18n } from '../../i18n.jsx'
import { MenuBookIcon, QuizIcon } from '../../ielts/icons.jsx'
import { LockIcon } from '../icons.jsx'

/**
 * Старт SAT до открытия материалов (backend V341, SatAccessInterceptor): два шага — главы об экзамене с целью и датой,
 * и диагностика. После них материалы открываются сами (2026-10-15, SatAccessService.startDone), менеджер не нужен. Пока
 * шаги не пройдены, вкладок хаба нет вовсе: «Сегодня», план и практика без диагностики пусты. Вид — как замок IELTS (`.ih-locked`), но без маскота IELTS:
 * у SAT своя плашка с иконкой шага.
 */
export default function SatStartView({ me, onOnboarding, onDiagnostic, onResults, onPricing }) {
  const { t } = useI18n()
  const steps = [
    { key: 'onboarding', done: me.onboarded },
    { key: 'diagnostic', done: me.diagnosticDone },
  ]
  const next = steps.find((s) => !s.done)?.key || 'access'
  const Icon = next === 'onboarding' ? MenuBookIcon : next === 'diagnostic' ? QuizIcon : LockIcon
  return (
    <div className="ih-locked st-start">
      <span className={`st-start__icon is-${next}`} aria-hidden="true"><Icon size={34} /></span>
      <h2>{t(`sat.lock.${next}.title`)}</h2>
      <p>{t(`sat.lock.${next}.text`)}</p>
      <ol className="ih-locked__steps">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? 'is-done' : s.key === next ? 'is-now' : ''}>{t(`sat.lock.step.${s.key}`)}</li>
        ))}
      </ol>
      <div className="ih-locked__actions">
        {next === 'onboarding' && <button type="button" className="ih-btn ih-btn--primary" onClick={onOnboarding}>{t('sat.lock.toOnboarding')}</button>}
        {next === 'diagnostic' && <button type="button" className="ih-btn ih-btn--primary" onClick={onDiagnostic}>{t('sat.lock.toDiagnostic')}</button>}
        {next === 'access' && me.diagnosticDone && <button type="button" className="ih-btn ih-btn--primary" onClick={onResults}>{t('sat.lock.results')}</button>}
        {next === 'access' && <button type="button" className="ih-btn ih-btn--outline" onClick={onPricing}>{t('sat.lock.pricing')}</button>}
      </div>
    </div>
  )
}
