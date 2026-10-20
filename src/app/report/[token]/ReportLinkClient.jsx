'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { getFeedbackReportByToken, markFeedbackReportOpened } from '../../../api.js'
import { normalizeReport } from '../../../feedback/reportShape.js'
import { SAMPLE_TOKEN, SAMPLE_REPORT, sampleAllowed } from '../../../feedback/sample.js'
import { reportLabels } from '../../../feedback/labels.js'
import ReportView from '../../../feedback/ReportView.jsx'

// Ошибки ссылки — на языке интерфейса (у родителя без аккаунта это ru по
// умолчанию): язык отчёта до загрузки отчёта неизвестен.
export default function ReportLinkClient({ token }) {
  const { t } = useI18n()
  const [state, setState] = useState({ status: 'loading', report: null, sample: false })
  const [attempt, setAttempt] = useState(0)
  const openedRef = useRef(false)

  // Повтор сбрасывает экран в «загружаем» сам, в обработчике: setState в теле
  // эффекта давал бы лишний проход рендера.
  const retry = () => {
    setState({ status: 'loading', report: null, sample: false })
    setAttempt((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sample = token === SAMPLE_TOKEN && sampleAllowed(window.location.hostname)
        const report = normalizeReport(sample ? SAMPLE_REPORT : await getFeedbackReportByToken(token))
        if (cancelled) return
        setState(report ? { status: 'ok', report, sample } : { status: 'invalid', report: null, sample: false })
      } catch (e) {
        if (cancelled) return
        // 404/403/410 — ссылки нет, отозвана или протухла: одним сообщением,
        // чтобы подбор токенов не отличался по ответу от опечатки.
        const invalid = e?.status === 404 || e?.status === 403 || e?.status === 410
        setState({ status: invalid ? 'invalid' : 'error', report: null, sample: false })
      }
    })()
    return () => { cancelled = true }
  }, [token, attempt])

  // «Открыт» — после того как отчёт на экране, и один раз за визит: отметку
  // видит координатор как «родитель прочитал». Ошибку не показываем.
  useEffect(() => {
    if (state.status !== 'ok' || state.sample || openedRef.current) return
    openedRef.current = true
    markFeedbackReportOpened(token).catch(() => {})
  }, [state, token])

  return (
    <main className="fbp">
      <div className="fbp__inner">
        <div className="fbp__brand">Just to Study</div>
        {state.status === 'loading' && (
          <div className="fbp__msg" aria-busy="true"><p>{t('reports.loading')}</p></div>
        )}
        {state.status === 'invalid' && (
          <div className="fbp__msg"><p>{t('reports.linkInvalid')}</p></div>
        )}
        {state.status === 'error' && (
          <div className="fbp__msg">
            <p>{t('reports.linkError')}</p>
            <button type="button" className="fbp__btn" onClick={retry}>{t('reports.retry')}</button>
          </div>
        )}
        {state.status === 'ok' && (
          <>
            <ReportView report={state.report} />
            <p className="fbp__foot">{reportLabels(state.report.lang).footer}</p>
          </>
        )}
      </div>
    </main>
  )
}
