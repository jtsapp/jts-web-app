import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { getIeltsAttempt, getIeltsLastDiagnostic, getIeltsProfile } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import { SectionTile } from '../ielts/sections.jsx'
import { bandGap, estimateTerm } from '../ielts/onboarding/onboarding.js'
import { formatDate, formatDuration, formatMonths } from '../ielts/format.js'
import { ArrowForwardIcon, CheckIcon, CloseIcon, DescriptionIcon, InfoIcon, TimerIcon, TrendingUpIcon } from '../ielts/icons.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'
import { gradeDiagnostic, isGrading } from '../ielts/onboarding/diagGrading.js'
import { DiagSpeakingReview, DiagWritingReview } from '../ielts/onboarding/DiagAiReview.jsx'

const SKILLS = ['listening', 'reading', 'writing', 'speaking']
const REVIEW_SKILLS = ['listening', 'reading']
const AI_SKILLS = ['writing', 'speaking']
// подписи критериев на карточке навыка — коротко, полное название в подсказке
const CRIT_ABBR = { taskResponse: 'TR', coherenceCohesion: 'CC', lexicalResource: 'LR', grammaticalRange: 'GRA', fluencyCoherence: 'FC', pronunciation: 'P' }
const CRIT_ORDER = {
  writing: ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'],
  speaking: ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation'],
}
const SP_SHORT = { fluencyCoherence: 'fc', lexicalResource: 'lr', grammaticalRange: 'gra', pronunciation: 'p' }

/**
 * Разбор ответов по секциям: Listening — по частям записи (часть у вопроса своя), Reading — одним текстом. Нумерация
 * сквозная внутри секции, как на экзамене.
 */
function DiagReview({ r, v, byId, readingTitle, P, t, lang, sec, setSec, grading }) {
  const rows = r.items || []
  // Writing и Speaking — те же вкладки, что Listening и Reading: разбор ИИ лежит рядом, а не отдельным блоком ниже
  const skills = [...REVIEW_SKILLS.filter((k) => rows.some((x) => x.skill === k)), ...AI_SKILLS]
  const list = rows.filter((x) => x.skill === sec)
  const doc = v.document || {}
  const spQuestions = [
    ...(doc.speaking?.part1 || []).map((q) => ({ id: q.id, text: q.text })),
    ...(doc.speaking?.cueCard ? [{ id: doc.speaking.cueCard.id, text: `${doc.speaking.cueCard.topic} ${doc.speaking.cueCard.explain || ''}`.trim() }] : []),
  ]
  const groups = []
  for (const row of list) {
    const it = byId[row.itemId] || {}
    const key = sec === 'listening' ? `Part ${it.part ?? 1}` : readingTitle || 'Reading'
    let g = groups.find((x) => x.key === key)
    if (!g) groups.push((g = { key, rows: [] }))
    g.rows.push(row)
  }
  const tabs = (
    <div className="ih-mrev__secs ih-dres__secs" role="tablist">
      {skills.map((k) => {
        const raw = r.raw?.[k]
        const aiSec = AI_SKILLS.includes(k) ? r[k] : null
        const sub = raw
          ? t('ieltsOb.rawOf', { n: String(raw.correct), total: String(raw.total) })
          : r.bands?.[k] != null
            ? r.bands[k].toFixed(1)
            : aiSec?.status === 'skipped'
              ? P('result.skipped')
              : aiSec?.status === 'failed' || grading[k] === 'err'
                ? t('ieltsOb.gradeFailed')
                : grading[k] === 'run'
                  ? t('ieltsOb.grading')
                  : t('ieltsOb.waitsAiShort')
        return (
          <button key={k} type="button" role="tab" aria-selected={k === sec} className={`ih-mrev__sec${k === sec ? ' is-on' : ''}`} onClick={() => setSec(k)}>
            <SectionTile section={k} size={32} iconSize={16} />
            <span>
              <b>{P(`block.${k}`)}</b>
              <small>{sub}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
  let n = 0
  if (sec === 'writing' || sec === 'speaking')
    return (
      <>
        {tabs}
        {sec === 'writing' ? (
          <DiagWritingReview sec={r.writing} text={v.answers?.writing} question={doc.writing?.question} grading={grading.writing} />
        ) : (
          <DiagSpeakingReview sec={r.speaking} questions={spQuestions} grading={grading.speaking} />
        )}
      </>
    )
  return (
    <>
      {tabs}
      {groups.map((g) => (
        <div key={g.key} className="ih-dres__group">
          <h3>
            <span>{g.key}</span>
            <small>{t('ieltsOb.rawOf', { n: String(g.rows.filter((x) => x.correct).length), total: String(g.rows.length) })}</small>
          </h3>
          {g.rows.map((row) => {
            const it = byId[row.itemId] || {}
            const mine = v.answers?.items?.[row.itemId]
            n += 1
            return (
              <div key={row.itemId} className={`ih-dres__item ${row.correct ? 'is-ok' : 'is-bad'}`}>
                <span className="ih-dres__num" aria-label={P(row.correct ? 'result.correct' : 'result.wrong')}>
                  {row.correct ? <CheckIcon size={14} /> : <CloseIcon size={14} />}{n}
                </span>
                <div className="ih-dres__itembody">
                  <p className="ih-dres__prompt" lang="en">{it.prompt}</p>
                  <div className="ih-dres__answers">
                    <span className={`ih-dres__ans ${row.correct ? 'is-ok' : 'is-bad'}`}>
                      <small>{P('result.yours')}</small>
                      <b lang="en">{mine != null && String(mine).trim() !== '' ? String(mine) : P('result.noAnswer')}</b>
                    </span>
                    {!row.correct && (
                      <span className="ih-dres__ans is-right">
                        <small>{P('result.right')}</small>
                        <b lang="en">{(it.answer || []).join(' / ')}</b>
                      </span>
                    )}
                    {row.spellingOnly && <span className="ih-dres__tag">{P('result.spellingOnly')}</span>}
                  </div>
                  {!row.correct && it.quote && (
                    <p className="ih-dres__quote"><small>{P('result.where')}</small><span lang="en">«{it.quote}»</span></p>
                  )}
                  {!row.correct && it.explanation && (
                    <p className="ih-dres__why"><small>{P('result.why')}</small>{it.explanation[lang] || it.explanation.ru}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}

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
  // вкладка разбора: L/R — ответы по вопросам, W/S — разбор ИИ; открывается и с карточки навыка
  const [revSec, setRevSec] = useState(null)
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

  // Writing и Speaking оцениваются здесь, после сдачи: ждут оценки — запускаем, по готовности перечитываем попытку.
  // Состояние секции на экране: run — идёт оценка, err — не удалась (повторить можно кнопкой)
  const [grading, setGrading] = useState({})
  const attemptId = state.v?.attempt?.id
  const runGrade = (k) => {
    const p = gradeDiagnostic(authToken, attemptId, k, lang)
    if (!p) return false
    setGrading((g) => ({ ...g, [k]: 'run' }))
    p.then(() => getIeltsAttempt(authToken, attemptId))
      .then((v) => {
        setState((cur) => (cur.v?.attempt?.id === attemptId ? { ...cur, v } : cur))
        setGrading((g) => ({ ...g, [k]: null }))
      })
      .catch(() => setGrading((g) => ({ ...g, [k]: 'err' })))
    return true
  }
  useEffect(() => {
    if (state.status !== 'ready' || !attemptId) return
    for (const k of AI_SKILLS) {
      const st = state.v.result?.[k]?.status
      if (grading[k] || (st !== 'pending_ai' && !(st === 'grading' && isGrading(attemptId, k)))) continue
      runGrade(k)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, attemptId])

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
    // текст Reading — тот трек, из которого вопросы в ответах (у формы их два)
    const readIds = new Set((r.items || []).filter((x) => x.skill === 'reading').map((x) => x.itemId))
    const readingTitle = [doc.reading?.academic, doc.reading?.general].find((blk) => blk?.items?.some((i) => readIds.has(i.id)))?.title
    const daily = p.dailyMinutes || 60
    const form = String(v.testId || '').replace(/^DG-/, '')
    const taken = v.attempt?.finishedAt ? formatDate(v.attempt.finishedAt, lang) : ''
    const examLabel = p.examDate ? formatDate(`${p.examDate}T00:00:00`, lang) : null
    const term = gap != null && gap > 0 ? estimateTerm(gap, daily) : null
    const firstSec = REVIEW_SKILLS.find((k) => (r.items || []).some((x) => x.skill === k)) || 'writing'
    const openReview = (k) => {
      setRevSec(typeof k === 'string' ? k : revSec || firstSec)
      setReview(true)
      setTimeout(() => reviewRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 50)
    }
    // Figma 2.1: шкала секции — доля от 9; у overall — доля от цели
    // короткая диагностика: по 5–6 вопросов на секцию, 5 из 5 даёт 9.0 — балл помечается примерным
    const short = r.level === 'light'
    const share = (x, max) => (x == null || !max ? 0 : Math.max(0, Math.min(1, x / max)))
    body = (
      <div className="ih-dres">
        <header className="ih-dres__head">
          <div>
            <h1>{t('ieltsOb.resultTitle')}</h1>
            <p className="ih-muted">{t('ieltsOb.resultSub', { level: P(`level.${r.level}`), form, date: taken })}</p>
          </div>
          <button type="button" className="ih-btn ih-btn--outline ih-dres__reviewbtn" onClick={() => openReview()}><DescriptionIcon size={18} />{P('result.review')}</button>
        </header>
        <div className="ih-dres__top">
          <section className="ih-dres__overall">
            <span>{b.overallPrelim === false ? t('ieltsOb.overallFinal') : t('ieltsOb.overallPrelim')}{short ? ' · ≈' : ''}</span>
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
            {short && <p className="ih-dres__estimate"><InfoIcon size={14} />{t('ieltsOb.shortEstimate')}</p>}
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
                      <strong title={short && raw ? t('ieltsOb.shortEstimateShort') : undefined}>{short && raw ? '≈' : ''}{b[k].toFixed(1)}</strong>
                    ) : (
                      <span className="ih-dres__ai">
                        <TimerIcon size={14} />
                        {pending?.status === 'skipped'
                          ? P('result.skipped')
                          : grading[k] === 'run'
                            ? t('ieltsOb.grading')
                            : grading[k] === 'err' || pending?.status === 'failed'
                              ? t('ieltsOb.gradeFailed')
                              : t('ieltsOb.waitsAiShort')}
                      </span>
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
                  {b[k] == null && pending && pending.status !== 'skipped' && grading[k] !== 'run' && (grading[k] === 'err' || pending.status === 'failed') && (
                    <button type="button" className="ih-btn ih-btn--outline ih-dres__retry" onClick={() => runGrade(k) || setGrading((g) => ({ ...g, [k]: 'lost' }))}>
                      {t('ieltsOb.gradeRetry')}
                    </button>
                  )}
                  {grading[k] === 'lost' && <small className="ih-muted">{t('ieltsOb.gradeLost')}</small>}
                  {pending?.status === 'done' && pending.criteria && (
                    <div className="ih-dres__crit">
                      {/* порядок критериев — экзаменационный: jsonb в базе ключи переставляет */}
                      {CRIT_ORDER[k].filter((c) => c in pending.criteria).map((c) => [c, pending.criteria[c]]).map(([c, val]) => (
                        <span key={c} title={t(k === 'writing' ? `ieltsWriting.crit.${c}` : `ieltsSpeaking.p.crit.${SP_SHORT[c]}`)}>
                          <small>{CRIT_ABBR[c]}</small>
                          <b>{val != null ? Number(val).toFixed(1) : '—'}</b>
                        </span>
                      ))}
                    </div>
                  )}
                  {(raw || pending?.status === 'done') && (
                    <button type="button" className="ih-link ih-dres__open" onClick={() => openReview(k)}>
                      {pending?.errors?.length ? t('ieltsOb.reviewErrors', { n: String(pending.errors.length) }) : t('ieltsOb.reviewOpen')}
                      <ArrowForwardIcon size={14} />
                    </button>
                  )}
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
          {review && <DiagReview r={r} v={v} byId={byId} readingTitle={readingTitle} P={P} t={t} lang={lang} sec={revSec || firstSec} setSec={setRevSec} grading={grading} />}
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
