import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getFeedbackReports } from '../api.js'
import { isTeacher } from '../lib/jwt.js'
import { normalizeReportList } from './reportShape.js'
import { wantsReportSample, SAMPLE_LIST } from './sample.js'

// Карточка «Новый отчёт о прогрессе» на «Главной»: видна, пока у ученика есть
// одобренный отчёт, который он ещё не открыл. Ничего не рисует, если ручки
// нет (404), сеть упала, отчётов нет или все просмотрены — «Главная» не
// ждёт её ответа и не показывает её ошибок.
export default function NewReportCard({ token, onNav }) {
  const { t } = useI18n()
  const [item, setItem] = useState(null)

  useEffect(() => {
    // Отчёты пишут про ученика: у преподавателя и гостя их нет.
    if (!token || isTeacher(token)) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const raw = wantsReportSample() ? SAMPLE_LIST : await getFeedbackReports(token)
        const fresh = normalizeReportList(raw).find((r) => !r.seenAt)
        if (!cancelled) setItem(fresh || null)
      } catch {
        // нет ручки или сети — карточки просто нет
      }
    })()
    return () => { cancelled = true }
  }, [token])

  if (!item) return null
  return (
    <button type="button" className="hm-report" onClick={() => onNav?.('lessons', { tab: 'reports', reportId: item.id })}>
      <span className="hm-report__icon" aria-hidden="true">📊</span>
      <span className="hm-report__text">
        <b>{t('home.report.title')}</b>
        {item.periodNo != null && <span>{t('home.report.text', { n: item.periodNo })}</span>}
      </span>
      <span className="hm-report__go">{t('home.report.open')} →</span>
    </button>
  )
}
