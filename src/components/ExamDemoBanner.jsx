import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getContentQuotaUsage, getDemoAccess } from '../api.js'
import { loadToken } from '../lib/session.js'
import { usageRows } from '../lib/examQuota.js'

/**
 * Плашка «демо-версия» над разделом экзамена (IELTS, SAT — SAT-SYNC-PLAN E2): что осталось по каждому ограниченному
 * типу («Практика: 12 из 30») и путь к полному доступу. Лимиты — дефолты демо-квот и персональные значения из админки
 * (GET /mobile/content-quota/usage?area=SAT|IELTS). demo — признак раздела (у SAT /me отдаёт demo: true, когда раздел
 * открыт только демо-доступом); без него смотрим общий демо-статус аккаунта (мемоизирован в api.js, как у сайдбара).
 */
export default function ExamDemoBanner({ exam, token, demo, onPricing }) {
  const { t } = useI18n()
  const [isDemo, setIsDemo] = useState(false)
  const [rows, setRows] = useState([])
  useEffect(() => {
    const tk = token || loadToken()
    if (!tk) return undefined
    let alive = true
    const known = demo ? Promise.resolve({ isDemo: true }) : getDemoAccess(tk)
    known
      .then((d) => {
        if (!alive || !d?.isDemo) return
        setIsDemo(true)
        return getContentQuotaUsage(tk, exam === 'ielts' ? 'IELTS' : 'SAT').then((u) => alive && setRows(usageRows(u)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token, demo, exam])
  if (!isDemo) return null
  return (
    <div className="exam-demo" role="note">
      <span className="exam-demo__tag">{t('exam.demo.tag')}</span>
      <span className="exam-demo__text">{t(`exam.demo.text.${exam}`)}</span>
      {rows.length > 0 && (
        <span className="exam-demo__left">
          {rows.map((r) => (
            <span key={r.contentType} className={`exam-demo__chip ${r.remaining <= 0 ? 'is-out' : ''}`}>
              {t('exam.demo.left', { name: t(`exam.type.${r.contentType}`), n: String(r.remaining), limit: String(r.limit) })}
            </span>
          ))}
        </span>
      )}
      {onPricing && (
        <button type="button" className="exam-demo__btn" onClick={onPricing}>{t('exam.demo.cta')}</button>
      )}
    </div>
  )
}

/** Сообщение вместо экрана, когда квота демо исчерпана: понятно и с выходом, а не белый лист или «Ошибка 500». */
export function QuotaNotice({ text, onBack, onPricing }) {
  const { t } = useI18n()
  return (
    <div className="exam-quota" role="alert">
      <h2>{t('exam.quota.title')}</h2>
      <p>{text || t('exam.quota.text')}</p>
      <div className="exam-quota__acts">
        {onBack && <button type="button" className="ih-btn ih-btn--outline" onClick={onBack}>{t('exam.quota.back')}</button>}
        {onPricing && <button type="button" className="ih-cta" onClick={onPricing}>{t('exam.demo.cta')}</button>}
      </div>
    </div>
  )
}
