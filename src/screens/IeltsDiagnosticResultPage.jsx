import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getIeltsAttempt, getIeltsLastDiagnostic, getIeltsProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { SectionTile } from '../ielts/sections.jsx'
import { bandGap, estimateTerm } from '../ielts/onboarding/onboarding.js'
import { formatDate, formatDuration, formatMonths } from '../ielts/format.js'
import { ArrowForwardIcon, DescriptionIcon, TimerIcon, TrendingUpIcon } from '../ielts/icons.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'

const SKILLS = ['listening', 'reading', 'writing', 'speaking']

/**
 * Итог диагностики (Figma 2.1 «Твой стартовый уровень»): общий band — предварительный, по Listening и Reading
 * (Writing и Speaking ждут ИИ), баллы секций, три слабых типа заданий с ловушками и разбор ответов. Дальше —
 * «Построить план»: экран маршрута.
 */
export default function IeltsDiagnosticResultPage({ token, target, onRoute, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const P = (k, v) => t(`ieltsOb.p.diag.${k}`, v)
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [review, setReview] = useState(false)
  const reviewRef = useRef(null)

  useEffect(() => {
    let alive = true
    const idP = target?.attemptId ? Promise.resolve(target.attemptId) : getIeltsLastDiagnostic(authToken).then((r) => r?.attemptId)
    idP
      .then((id) => {
        if (!id) throw Object.assign(new Error('none'), { status: 404 })
        setIeltsParams({ ieltsAttempt: String(id) })
        return Promise.all([getIeltsAttempt(authToken, id), getIeltsProfile(authToken)])
      })
      .then(([v, p]) => alive && setState({ status: 'ready', v, p }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'none' : 'error' }))
    return () => {
      alive = false
      setIeltsParams({ ieltsAttempt: null })
    }
  }, [authToken, target?.attemptId])

  let body
  if (state.status !== 'ready') {
    body =
      state.status === 'loading' ? (
        <p className="ih-muted">{t('ieltsReading.loading')}</p>
      ) : (
        <EmptyState icon={<TrendingUpIcon size={28} />} title={P('result.notFound')} text={P('result.notFoundText')} />
      )
  } else {
    const { v, p } = state
    const r = v.result
    const b = r.bands
    const target = p.targetBand
    const gap = bandGap(target, b.overall)
    const doc = v.document
    const all = [...(doc.listening?.slots || []).flatMap((s) => s.clips.flatMap((c) => c.items)), ...(doc.reading?.academic?.items || []), ...(doc.reading?.general?.items || [])]
    const byId = Object.fromEntries(all.map((i) => [i.id, i]))
    const rawOf = (k) => r.raw?.[k]
    const daily = p.dailyMinutes || 60
    const form = String(v.testId || '').replace(/^DG-/, '')
    const taken = v.attempt?.finishedAt ? formatDate(v.attempt.finishedAt, lang) : ''
    const examLabel = p.examDate ? formatDate(`${p.examDate}T00:00:00`, lang) : null
    const term = gap != null && gap > 0 ? estimateTerm(gap, daily) : null
    const openReview = () => {
      setReview(true)
      setTimeout(() => reviewRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50)
    }
    // Figma 2.1: шкала секции — доля от 9; у overall — доля от цели
    const share = (x, max) => (x == null || !max ? 0 : Math.max(0, Math.min(1, x / max)))
    body = (
      <div className="ih-dres">
        <header className="ih-dres__head">
          <div>
            <h1>{t('ieltsOb.resultTitle')}</h1>
            <p className="ih-muted">{t('ieltsOb.resultSub', { level: P(`level.${r.level}`), form, date: taken })}</p>
          </div>
          <button type="button" className="ih-btn ih-btn--outline ih-dres__reviewbtn" onClick={openReview}><DescriptionIcon size={18} />{P('result.review')}</button>
        </header>
        <div className="ih-dres__top">
          <section className="ih-dres__overall">
            <span>{t('ieltsOb.overallPrelim')}</span>
            <div className="ih-dres__big">
              <b>{b.overall?.toFixed(1) ?? '—'}</b>
              {target != null && <span>{t('ieltsDash.goalShort', { n: Number(target).toFixed(1) })}</span>}
            </div>
            <i className="ih-dres__bar"><i style={{ width: `${share(b.overall, target || 9) * 100}%` }} /></i>
            <p>
              {gap == null
                ? t('ieltsOb.noTarget')
                : gap <= 0
                  ? t('ieltsOb.gapReached')
                  : term.long
                    ? t('ieltsOb.gapText', { n: gap.toFixed(1) })
                    : t('ieltsOb.gapTerm', { gap: gap.toFixed(1), term: formatMonths(term.months, t, lang), daily: formatDuration(daily, t) })}
            </p>
          </section>
          <div className="ih-dres__skills">
            {SKILLS.map((k) => {
              const raw = rawOf(k)
              const pending = k === 'writing' ? r.writing : k === 'speaking' ? r.speaking : null
              return (
                <section key={k} className={`ih-card ih-dres__skill ih-dres__skill--${k}`}>
                  <div className="ih-dres__skillhead">
                    <SectionTile section={k} size={36} iconSize={18} />
                    <b>{P(`block.${k}`)}</b>
                    {b[k] != null ? (
                      <strong>{b[k].toFixed(1)}</strong>
                    ) : (
                      <span className="ih-dres__ai"><TimerIcon size={14} />{pending?.status === 'skipped' ? P('result.skipped') : t('ieltsOb.waitsAiShort')}</span>
                    )}
                  </div>
                  <i className="ih-dres__bar"><i style={{ width: `${share(b[k], 9) * 100}%` }} /></i>
                  <span className="ih-muted">
                    {b[k] != null
                      ? raw && t('ieltsOb.rawOf', { n: String(raw.correct), total: String(raw.total) })
                      : k === 'writing'
                        ? t('ieltsOb.essaySaved', { n: String(pending?.words ?? 0) })
                        : t('ieltsOb.speakingSaved', { n: String(pending?.answers ?? 0), sec: String(pending?.seconds ?? 0) })}
                  </span>
                </section>
              )
            })}
          </div>
        </div>
        <div className="ih-dres__bottom">
          <section className="ih-card ih-dres__weak">
            <h2>{P('result.weak')}</h2>
            <p className="ih-muted">{P('result.weakHint')}</p>
            {(r.weakTypes || []).length === 0 && <p>{P('result.noWeak')}</p>}
            {(r.weakTypes || []).map((type) => {
              const s = r.byType?.[type] || {}
              const row = (r.items || []).find((x) => x.type === type)
              const trap = (r.items || []).find((x) => x.type === type && x.trap)?.trap
              return (
                <div key={type} className="ih-dres__wrow">
                  <SectionTile section={row?.skill === 'listening' ? 'listening' : 'reading'} size={36} iconSize={18} />
                  <div className="ih-dres__wtext">
                    <b>{P(`types.${type}`)}</b>
                    <span className="ih-muted">{t('ieltsOb.rawOf', { n: String(s.correct ?? 0), total: String(s.total ?? 0) })}</span>
                  </div>
                  {trap && <span className="ih-dres__trap">{P('result.trap')}: {P(`trap.${trap}`)}</span>}
                </div>
              )
            })}
          </section>
          <section className="ih-dres__next">
            <h2>{t('ieltsOb.nextTitle')}</h2>
            <p>{examLabel ? t('ieltsOb.nextTextDate', { date: examLabel }) : t('ieltsOb.nextText')}</p>
            <button type="button" className="ih-cta" onClick={onRoute}>{t('ieltsOb.buildPlan')}<ArrowForwardIcon size={18} /></button>
            <small className="ih-muted">{t('ieltsOb.bandNote')}</small>
          </section>
        </div>
        <details className="ih-card ih-dres__review" open={review} ref={reviewRef} onToggle={(e) => setReview(e.currentTarget.open)}>
          <summary>{P('result.review')}</summary>
          {(r.items || []).map((row, i) => {
            const it = byId[row.itemId] || {}
            return (
              <div key={row.itemId} className={`ih-dres__item ${row.correct ? 'is-ok' : 'is-bad'}`}>
                <b>{i + 1}. </b><span lang="en">{it.prompt}</span>
                <p>
                  {P('result.yours')}: <b lang="en">{String(v.answers?.items?.[row.itemId] ?? '—')}</b> · {P('result.right')}: <b lang="en">{(it.answer || []).join(' / ')}</b>
                </p>
                {!row.correct && it.explanation && <p className="ih-muted">{it.explanation[lang] || it.explanation.ru}</p>}
              </div>
            )
          })}
        </details>
      </div>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="ielts">
      <div className="ih">{body}</div>
    </LearningLayout>
  )
}
