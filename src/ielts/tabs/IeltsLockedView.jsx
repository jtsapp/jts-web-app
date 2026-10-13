import { SUPPORT_WHATSAPP_URL } from '../../lib/support.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Материалы IELTS закрыты, пока менеджер не откроет доступ (backend V324, ручка /plan/me → access). Онбординг и
 * диагностика открыты: по ним строится план и менеджер видит заявку. Замок стоит и на сервере — экран лишь объясняет,
 * что происходит и что делать дальше, вместо пустых вкладок с ошибками.
 */
export default function IeltsLockedView({ onboarded, diagnosticDone, onOpenOnboarding, onOpenDiagnostic, onOpenResult }) {
  const { t } = useI18n()
  return (
    <div className="ih-locked">
      <img className="ih-locked__mascot" src="/ielts/mascot/cheer.webp" alt="" aria-hidden="true" width="140" height="140" />
      <h2>{t(onboarded ? 'ieltsLocked.title' : 'ieltsLocked.titleStart')}</h2>
      <p>{t(!onboarded ? 'ieltsLocked.textStart' : diagnosticDone ? 'ieltsLocked.textDone' : 'ieltsLocked.text')}</p>
      <ol className="ih-locked__steps">
        <li className={onboarded ? 'is-done' : ''}>{t('ieltsLocked.step1')}</li>
        {/* диагностика пройдена — шаг отмечен, а кнопка ведёт к итогу: раньше экран снова звал в неё, будто её не было */}
        <li className={diagnosticDone ? 'is-done' : ''}>{t('ieltsLocked.step2')}</li>
        <li>{t('ieltsLocked.step3')}</li>
      </ol>
      <div className="ih-locked__actions">
        {onboarded && diagnosticDone ? (
          <button type="button" className="ih-btn ih-btn--primary" onClick={onOpenResult}>{t('ieltsLocked.result')}</button>
        ) : onboarded ? (
          <button type="button" className="ih-btn ih-btn--primary" onClick={onOpenDiagnostic}>{t('ieltsLocked.diagnostic')}</button>
        ) : (
          <button type="button" className="ih-btn ih-btn--primary" onClick={onOpenOnboarding}>{t('ieltsLocked.onboarding')}</button>
        )}
        <a className="ih-btn ih-btn--outline" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">{t('ieltsLocked.contact')}</a>
      </div>
    </div>
  )
}
