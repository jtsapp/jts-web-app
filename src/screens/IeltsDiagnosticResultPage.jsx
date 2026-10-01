import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getIeltsAttempt, getIeltsLastDiagnostic, getIeltsProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { SectionTile } from '../ielts/sections.jsx'
import { bandGap } from '../ielts/onboarding/onboarding.js'
import { ArrowForwardIcon, TrendingUpIcon } from '../ielts/icons.jsx'
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
    body = (
      <div className="ih-dres">
        <header className="ih-dres__head">
          <h1>{t('ieltsOb.resultTitle')}</h1>
          <span className="ih-chip ih-chip--violet ih-chip--md"><span>{P(`level.${r.level}`)}</span></span>
        </header>
        <section className="ih-card ih-dres__overall">
          <div className="ih-wscore__band">
            <span>{t('ieltsOb.overallPrelim')}</span>
            <b>{b.overall?.toFixed(1) ?? '—'}</b>
            {target != null && <span>{t('ieltsOb.goalChip', { n: Number(target).toFixed(1) })}</span>}
          </div>
          <p>{gap != null ? (gap > 0 ? t('ieltsOb.gapText', { n: gap.toFixed(1) }) : t('ieltsOb.gapReached')) : t('ieltsOb.noTarget')}</p>
        </section>
        <div className="ih-dres__skills">
          {SKILLS.map((k) => {
            const raw = rawOf(k)
            const pending = k === 'writing' ? r.writing : k === 'speaking' ? r.speaking : null
            return (
              <section key={k} className="ih-card ih-dres__skill">
                <div className="ih-dres__skillhead"><SectionTile section={k} size={36} iconSize={18} /><b>{P(`block.${k}`)}</b></div>
                {b[k] != null ? (
                  <>
                    <strong>{b[k].toFixed(1)}</strong>
                    {raw && <span className="ih-muted">{t('ieltsOb.rawOf', { n: String(raw.correct), total: String(raw.total) })}</span>}
                  </>
                ) : (
                  <>
                    <span className="ih-chip ih-chip--orange ih-chip--sm"><span>{pending?.status === 'skipped' ? P('result.skipped') : t('ieltsOb.waitsAi')}</span></span>
                    <span className="ih-muted">
                      {k === 'writing' ? t('ieltsOb.essaySaved', { n: String(pending?.words ?? 0) }) : t('ieltsOb.speakingSaved', { n: String(pending?.answers ?? 0), sec: String(pending?.seconds ?? 0) })}
                    </span>
                  </>
                )}
              </section>
            )
          })}
        </div>
        <section className="ih-card ih-dres__weak">
          <h2>{P('result.weak')}</h2>
          <p className="ih-muted">{P('result.weakHint')}</p>
          {(r.weakTypes || []).length === 0 && <p>{P('result.noWeak')}</p>}
          {(r.weakTypes || []).map((type) => {
            const s = r.byType?.[type] || {}
            const trap = (r.items || []).find((x) => x.type === type && x.trap)?.trap
            return (
              <div key={type} className="ih-dres__wrow">
                <b>{P(`types.${type}`)}</b>
                <span>{t('ieltsOb.rawOf', { n: String(s.correct ?? 0), total: String(s.total ?? 0) })}</span>
                {trap && <span className="ih-chip ih-chip--orange ih-chip--sm"><span>{P('result.trap')}: {P(`trap.${trap}`)}</span></span>}
              </div>
            )
          })}
        </section>
        <section className="ih-card ih-dres__next">
          <div>
            <h2>{t('ieltsOb.nextTitle')}</h2>
            <p>{t('ieltsOb.nextText')}</p>
          </div>
          <button type="button" className="ih-cta" onClick={onRoute}>{t('ieltsOb.buildPlan')}<ArrowForwardIcon size={18} /></button>
        </section>
        <details className="ih-card ih-dres__review">
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
        <p className="ih-muted">{t('ieltsOb.estimateHonest')}</p>
      </div>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} token={token} onNav={onNav} onProfile={onProfile} active="ielts">
      <div className="ih">{body}</div>
    </LearningLayout>
  )
}
