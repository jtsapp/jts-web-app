import { useI18n } from '../../i18n.jsx'
import { domainName } from '../names.js'

/**
 * Фаза 7 «Самостоятельная подготовка» (ТЗ 21.10): конкретный список дел с цифрами, а не «занимайтесь сами».
 * Строка о третьем месяце — информация, а не продажа: без цены и кнопки «купить», ведёт к куратору (решение ТЗ).
 * Список дел — первым: ученик без доппакета уходит с экрана с планом работы.
 */
export default function SelfPrepPanel({ prep, onErrors, onPractice, onMocks, onCurator }) {
  const { t, lang } = useI18n()
  if (!prep) return null
  return (
    <div className="st-self">
      <h3>{t('sat.self.title')}</h3>
      <ul className="st-self__list">
        <li><button type="button" className="st-link" onClick={onErrors}>{t('sat.self.errors', { n: String(prep.openErrors) })}</button></li>
        <li>
          {prep.weakDomains?.length
            ? <button type="button" className="st-link" onClick={onPractice}>{t('sat.self.weak', { list: prep.weakDomains.map((d) => domainName(d, lang)).join(', ') })}</button>
            : t('sat.self.weakNone')}
        </li>
        <li><button type="button" className="st-link" onClick={onPractice}>{t('sat.self.bank', { n: String(prep.bankLeft) })}</button></li>
        {prep.bluebookLeft?.length > 0 && <li>{t('sat.self.bluebook', { list: prep.bluebookLeft.map((n) => `Test ${n}`).join(', ') })}</li>}
        <li><button type="button" className="st-link" onClick={onMocks}>{t('sat.self.papers')}</button></li>
      </ul>
      {prep.offerChallenge && (
        <p className="st-self__offer">
          {t('sat.self.challenge')}{' '}
          <button type="button" className="st-link" onClick={onCurator}>{t('sat.self.ask')}</button>
        </p>
      )}
    </div>
  )
}
