import { useI18n } from '../../i18n.jsx'
import { SUPPORT_WHATSAPP_URL } from '../../lib/support.js'
import { MenuBookIcon, QuizIcon } from '../../ielts/icons.jsx'
import { LockIcon } from '../icons.jsx'

/**
 * Старт SAT до открытия материалов (backend V336, SatAccessInterceptor): три шага — главы об экзамене с целью и датой,
 * диагностика, доступ от менеджера. Пока хоть один не пройден, вкладок хаба нет вовсе: «Сегодня», план и практика без
 * диагностики пусты, а без доступа сервер их и не отдаст. Вид — как замок IELTS (`.ih-locked`), но без маскота IELTS:
 * у SAT своя плашка с иконкой шага.
 */
export default function SatStartView({ me, onOnboarding, onDiagnostic, onResults, onPricing }) {
  const { t } = useI18n()
  const steps = [
    { key: 'onboarding', done: me.onboarded },
    { key: 'diagnostic', done: me.diagnosticDone },
    { key: 'access', done: me.access },
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
        <a className="ih-btn ih-btn--outline" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">{t('sat.lock.contact')}</a>
      </div>
    </div>
  )
}
