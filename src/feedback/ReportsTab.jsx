import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getFeedbackReports, getFeedbackReport, markFeedbackReportSeen } from '../api.js'
import { normalizeReport, normalizeReportList } from './reportShape.js'
import { wantsReportSample, SAMPLE_LIST, SAMPLE_REPORTS } from './sample.js'
import ReportView from './ReportView.jsx'

// Вкладка «Отчёты» в «Уроках»: отчёты о прогрессе, которые преподаватель
// пишет раз в 30 дней, а координатор одобряет. Отчёт — про живые уроки с
// преподавателем, поэтому он рядом с расписанием, а не отдельным пунктом
// меню (решение 20.10.2026). Раскладка одна на все ширины: список, по клику —
// отчёт на его месте с кнопкой «Все отчёты».
const LOCALES = { ru: 'ru-RU', en: 'en-GB', kk: 'kk-KZ' }

function formatDay(iso, lang) {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(LOCALES[lang] || 'ru-RU', { day: 'numeric', month: 'long' })
}

// Отчёты, открытые за этот визит, — «не новые» в любом списке, даже в том,
// что пришёл позже: из уведомления отчёт и список грузятся одновременно, и
// снимок списка мог быть сделан до отметки.
function withSeen(items, seen) {
  return items.map((x) => (!x.seenAt && seen.has(String(x.id)) ? { ...x, seenAt: new Date().toISOString() } : x))
}

export default function ReportsTab({ token, initialReportId = null }) {
  const { t, lang } = useI18n()
  const [list, setList] = useState(null) // null — грузим
  const [listError, setListError] = useState(false)
  const [openId, setOpenId] = useState(initialReportId)
  const [report, setReport] = useState(null)
  const [reportError, setReportError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const seenRef = useRef(new Set())

  const [listAttempt, setListAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = wantsReportSample() ? SAMPLE_LIST : await getFeedbackReports(token)
        if (!cancelled) setList(withSeen(normalizeReportList(raw), seenRef.current))
      } catch (e) {
        if (cancelled) return
        // 404 — ручки на бэкенде ещё нет (веб вышел раньше): для ученика это
        // то же, что «отчётов нет», а не поломка.
        if (e?.status === 404) setList([])
        else setListError(true)
      }
    })()
    return () => { cancelled = true }
  }, [token, listAttempt])

  const retryList = () => {
    setListError(false)
    setList(null)
    setListAttempt((n) => n + 1)
  }

  // Сброс прошлого отчёта — в обработчиках (openReport, retry), а не здесь:
  // setState в теле эффекта давал бы лишний проход рендера.
  const openReport = (id) => {
    setReport(null)
    setReportError(false)
    setOpenId(id)
  }
  const retryReport = () => {
    setReportError(false)
    setAttempt((n) => n + 1)
  }

  useEffect(() => {
    if (openId == null) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const raw = wantsReportSample() ? SAMPLE_REPORTS[openId] : await getFeedbackReport(token, openId)
        const r = normalizeReport(raw)
        if (cancelled) return
        if (r) setReport(r)
        else setReportError(true)
      } catch {
        if (!cancelled) setReportError(true)
      }
    })()
    return () => { cancelled = true }
  }, [openId, token, attempt])

  // «Просмотрен» — после показа, один раз за визит вкладки: снимает метку
  // «Новый» и карточку на «Главной». Ошибку не показываем — уйдёт при
  // следующем открытии.
  useEffect(() => {
    if (!report || report.id == null || seenRef.current.has(String(report.id))) return
    seenRef.current.add(String(report.id))
    setList((prev) => prev && withSeen(prev, seenRef.current))
    if (wantsReportSample()) return
    markFeedbackReportSeen(token, report.id).catch(() => {})
  }, [report, token])

  if (openId != null) {
    return (
      <div className="fbl">
        <button type="button" className="fbl__back" onClick={() => setOpenId(null)}>{t('reports.back')}</button>
        {reportError ? (
          <div className="fbl__empty">
            <p>{t('reports.reportError')}</p>
            <button type="button" className="fbl__retry" onClick={retryReport}>{t('reports.retry')}</button>
          </div>
        ) : report ? (
          <ReportView report={report} />
        ) : (
          <div className="fbl__loading" aria-busy="true">{t('reports.loading')}</div>
        )}
      </div>
    )
  }

  if (listError) {
    return (
      <div className="fbl">
        <div className="fbl__empty">
          <b>{t('reports.loadError')}</b>
          <button type="button" className="fbl__retry" onClick={retryList}>{t('reports.retry')}</button>
        </div>
      </div>
    )
  }

  if (list == null) {
    return <div className="fbl"><div className="fbl__loading" aria-busy="true">{t('reports.loading')}</div></div>
  }

  if (list.length === 0) {
    return (
      <div className="fbl">
        <div className="fbl__empty">
          <b>{t('reports.emptyTitle')}</b>
          <p>{t('reports.emptyText')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fbl">
      <ul className="fbl__list">
        {list.map((r) => (
          <li key={r.id}>
            <button type="button" className={`fbl__item ${r.seenAt ? '' : 'fbl__item--new'}`} onClick={() => openReport(r.id)}>
              <span className="fbl__title">
                {r.periodNo ? t('reports.month', { n: r.periodNo }) : t('reports.title')}
                {!r.seenAt && <span className="fbl__new">{t('reports.new')}</span>}
              </span>
              <span className="fbl__meta">
                {[r.teacherName, r.level, formatDay(r.publishedAt, lang)].filter(Boolean).join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
