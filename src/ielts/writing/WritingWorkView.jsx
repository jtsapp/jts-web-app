import { useCallback, useEffect, useRef, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import Chip from '../ui/Chip.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { assessIeltsWriting, getIeltsAttempt, getIeltsTest, getIeltsWritingModel, saveIeltsSelfCheck } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { formatDate } from '../format.js'
import { formatClock } from '../reading/run.js'
import { CheckCircleIcon, EditIcon, InfoIcon, TimerIcon } from '../icons.jsx'
import WritingTaskBody from './WritingTaskBody.jsx'
import { CRITERIA, countWords, kindKey, selfCheckFor } from './writing.js'
import { categoryLabel } from './WritingListView.jsx'
import { useI18n } from '../../i18n.jsx'

const CRIT_KEY = { taskResponse: 'tr', coherenceCohesion: 'cc', lexicalResource: 'lr', grammaticalRange: 'gra' }

// Связки модели подсвечиваются в тексте абзаца (первое вхождение) — с объяснением в подсказке, как в прототипе.
function withLinkers(text, linkers, pick) {
  const marks = []
  for (const l of linkers || []) {
    const at = text.indexOf(l.text)
    if (at >= 0 && !marks.some((m) => at < m.end && at + l.text.length > m.start)) marks.push({ start: at, end: at + l.text.length, note: pick(l.note) })
  }
  marks.sort((a, b) => a.start - b.start)
  const out = []
  let pos = 0
  marks.forEach((m, i) => {
    out.push(text.slice(pos, m.start))
    out.push(<mark key={i} className="ih-wlinker" title={m.note} tabIndex={0}>{text.slice(m.start, m.end)}</mark>)
    pos = m.end
  })
  out.push(text.slice(pos))
  return out
}

/**
 * Работа Writing (Figma 10 «работа сдана»): статус ИИ-проверки и band по четырём критериям, ваш текст по абзацам,
 * модельный ответ с разбором и самопроверка. Только что сданная работа (autoGrade) отправляется на оценку сама;
 * не оценённая раньше — по кнопке: оценка тратит квоту IELTS, и без спроса её не запускаем.
 */
// embedded — внутри разбора полного mock (MockReview): без хлебных крошек раздела и без «Написать ещё раз»
/** Абзац с подсвеченными цитатами замечаний: первое вхождение каждой цитаты — <mark> с подсказкой «исправление». */
function markQuotes(text, errors) {
  const list = (errors || []).filter((e) => e?.quote && text.includes(e.quote))
  if (!list.length) return text
  const hits = list.map((e) => ({ at: text.indexOf(e.quote), e })).sort((a, b) => a.at - b.at)
  const out = []
  let pos = 0
  for (const { at, e } of hits) {
    if (at < pos) continue
    if (at > pos) out.push(text.slice(pos, at))
    out.push(<mark key={at} className="ih-wmine__err" title={`${e.issue} → ${e.correction}`}>{e.quote}</mark>)
    pos = at + e.quote.length
  }
  out.push(text.slice(pos))
  return out
}

export default function WritingWorkView({ token, attemptId, autoGrade, onBackToLearn, onWorks, onRetry, onGuide, embedded = false }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const pick = useCallback((o) => (o && typeof o === 'object' ? o[lang] || o.ru || o.en : o), [lang])
  const [state, setState] = useState({ status: 'loading' })
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState(null)
  const [model, setModel] = useState(null)
  const [modelOpen, setModelOpen] = useState(true)
  const [selfcheck, setSelfcheck] = useState(null)
  const [answers, setAnswers] = useState({})
  const autoDone = useRef(false)

  const load = useCallback(() => {
    return getIeltsAttempt(authToken, attemptId)
      .then((v) => {
        setState({ status: 'ready', view: v })
        setAnswers(v.answers?.selfCheck || {})
        return v
      })
      .catch((e) => setState({ status: e?.status === 404 ? 'missing' : 'error' }))
  }, [authToken, attemptId])

  const grade = useCallback(async () => {
    setGrading(true)
    setGradeError(null)
    try {
      const v = await assessIeltsWriting(authToken, attemptId, lang)
      setState({ status: 'ready', view: v })
    } catch (e) {
      setGradeError(e?.code || 'failed')
      await load()
    } finally {
      setGrading(false)
    }
  }, [authToken, attemptId, lang, load])

  useEffect(() => {
    let alive = true
    load().then((v) => {
      if (!alive || !v) return
      getIeltsWritingModel(authToken, v.testId).then((m) => alive && setModel(m)).catch(() => {})
      getIeltsTest(authToken, 'WR-SELFCHECK').then((r) => alive && setSelfcheck(r.document)).catch(() => {})
      if (autoGrade && !autoDone.current && v.result?.status === 'pending_ai') {
        autoDone.current = true
        grade()
      }
    })
    return () => {
      alive = false
    }
    // grade зависит от языка — повторно грузить работу из-за смены языка незачем
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, attemptId])

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBackToLearn }, { label: 'Writing', onClick: onBackToLearn }, { label: t('ieltsLearn.writing.works'), onClick: onWorks }]
  if (state.status !== 'ready')
    return (
      <div className="ih-wwork">
        {!embedded && <Breadcrumbs items={crumbs} />}
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<EditIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>
    )

  const v = state.view
  const doc = v.document
  const r = v.result || {}
  // подробный разбор грейдера (по критериям, абзацам, лексика, шаги); у старых работ его нет — блок не рисуется
  const det = r.details || null
  const text = String(v.answers?.text || '')
  const paras = text.split(/\n\s*\n+/).filter((p) => p.trim())
  const status = grading ? 'grading' : r.status
  const kind = kindKey(doc)
  const sc = selfCheckFor(selfcheck, kind)
  const scTotal = sc.reduce((a, c) => a + c.questions.length, 0)

  const answer = (key, val) => {
    const next = { ...answers, [key]: answers[key] === val ? undefined : val }
    Object.keys(next).forEach((k) => next[k] === undefined && delete next[k])
    setAnswers(next)
    saveIeltsSelfCheck(authToken, attemptId, next).catch(() => {})
  }

  return (
    <div className="ih-wwork">
      {!embedded && <Breadcrumbs items={crumbs} />}
      {/* без заголовка страница оценки не говорила, какое это эссе: у ученика их несколько на одну тему */}
      <div className="ih-rlist__head">
        <div>
          <h2>{doc.title}</h2>
          <p>{[doc.kind === 'task2' ? 'Task 2' : 'Task 1', categoryLabel(t, doc.kind, doc.category || doc.visual || doc.register || doc.essayType), formatDate(v.attempt.finishedAt, lang)].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {status === 'done' ? (
        <section className="ih-card ih-wscore">
          <div className="ih-wscore__band">
            <span>{t('ieltsWriting.band')}</span>
            <b>{v.attempt.band?.toFixed(1)}</b>
          </div>
          <div className="ih-wscore__crit">
            {CRITERIA.map((c) => (
              <div key={c}>
                <b>{Number(r.criteria?.[c]).toFixed(1)}</b>
                <span>{t(`ieltsWriting.crit.${c}${c === 'taskResponse' && kind !== 't2' ? '1' : ''}`)}</span>
              </div>
            ))}
          </div>
          {r.feedback && <p className="ih-wscore__fb">{r.feedback}</p>}
          {!embedded && (
            <div className="ih-wscore__actions">
              <PillButton variant="primary" onClick={() => onRetry(v.testId)}>{t('ieltsWriting.p.work.again')}</PillButton>
            </div>
          )}
        </section>
      ) : (
        <section className={`ih-wstatus ${status === 'failed' || gradeError ? 'is-bad' : ''}`} role="status">
          <span className="ih-wstatus__icon"><TimerIcon size={22} /></span>
          <div>
            <b>{status === 'grading' ? t('ieltsWriting.gradingTitle') : t('ieltsWriting.p.work.pendingTitle')}</b>
            <p>{status === 'grading' ? t('ieltsWriting.gradingText') : gradeError ? t(`ieltsWriting.gradeError.${['quota', 'grading_unavailable', 'already'].includes(gradeError) ? gradeError : 'other'}`) : t('ieltsWriting.pendingText')}</p>
          </div>
          {status !== 'grading' && (
            <button type="button" className="ih-btn ih-btn--dark" onClick={grade}>{t('ieltsWriting.gradeNow')}</button>
          )}
        </section>
      )}

      {status === 'done' && det && (det.criteriaNotes?.length > 0 || det.nextSteps?.length > 0) && (
        <section className="ih-card ih-wdet">
          <h3>{t('ieltsWriting.d.title')}</h3>
          {det.criteriaNotes?.length > 0 && (
            <div className="ih-wdet__crits">
              {det.criteriaNotes.map((c) => (
                <article key={c.criterion} className="ih-wdet__crit">
                  <header>
                    <b>{t(`ieltsWriting.crit.${c.criterion}${c.criterion === 'taskResponse' && kind !== 't2' ? '1' : ''}`)}</b>
                    <span className="ih-wdet__band">{r.criteria?.[c.criterion] != null ? Number(r.criteria[c.criterion]).toFixed(1) : '—'}</span>
                  </header>
                  <p><small>{t('ieltsWriting.d.why')}</small>{c.why}</p>
                  {c.nextBand && <p className="ih-wdet__next"><small>{t('ieltsWriting.d.next')}</small>{c.nextBand}</p>}
                </article>
              ))}
            </div>
          )}
          {(det.strengths?.length > 0 || det.nextSteps?.length > 0) && (
            <div className="ih-wdet__two">
              {det.strengths?.length > 0 && (
                <div className="ih-wdet__list is-good">
                  <h4>{t('ieltsWriting.d.strengths')}</h4>
                  <ul>{det.strengths.map((s, i) => <li key={i}><CheckCircleIcon size={16} />{s}</li>)}</ul>
                </div>
              )}
              {det.nextSteps?.length > 0 && (
                <div className="ih-wdet__list is-next">
                  <h4>{t('ieltsWriting.d.steps')}</h4>
                  <ol>{det.nextSteps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
                </div>
              )}
            </div>
          )}
          {det.vocabulary?.length > 0 && (
            <div className="ih-wdet__vocab">
              <h4>{t('ieltsWriting.d.vocab')}</h4>
              {det.vocabulary.map((v, i) => (
                <div key={i} className="ih-wdet__word">
                  <s lang="en">{v.word}</s>
                  <span lang="en">→ {v.better.join(' · ')}</span>
                  {v.note && <small>{v.note}</small>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {status === 'done' && (r.errors?.length > 0 || r.rewrites?.length > 0) && (
        <section className="ih-card ih-wfix">
          <h3>{t('ieltsWriting.errorsTitle')}</h3>
          {(r.errors || []).map((e, i) => (
            <div key={i} className="ih-wfix__row">
              <span className="ih-chip ih-chip--muted ih-chip--sm"><span>{t(`ieltsWriting.critShort.${e.criterion}`)}</span></span>
              <p lang="en"><s>{e.quote}</s> → <b>{e.correction}</b></p>
              <p className="ih-muted">{e.issue}</p>
            </div>
          ))}
          {(r.rewrites || []).length > 0 && <h3>{t('ieltsWriting.rewritesTitle')}</h3>}
          {(r.rewrites || []).map((w, i) => (
            <div key={`w${i}`} className="ih-wfix__row" lang="en">
              <p className="ih-muted">{w.original}</p>
              <p><b>{w.improved}</b></p>
            </div>
          ))}
        </section>
      )}

      <div className="ih-wwork__grid">
        <section className="ih-card ih-wmine">
          <header>
            <h3>{t('ieltsWriting.yourText')}</h3>
            <span className="ih-muted">{formatDate(v.attempt.finishedAt, lang)}</span>
          </header>
          <div className="ih-wmine__chips">
            <Chip tone={r.underLength ? 'orange' : 'green'} size="sm">{t('ieltsWriting.p.work.words', { words: t('ieltsWriting.wordsN', { n: String(r.words ?? countWords(text)) }), min: String(r.minWords ?? '') })}</Chip>
            <Chip tone="neutral" size="sm">{t('ieltsWriting.p.work.paragraphs', { n: String(paras.length) })}</Chip>
            {v.attempt.timeSec != null && <Chip tone="neutral" size="sm" icon={<TimerIcon size={14} />}>{t('ieltsWriting.timeOf', { time: formatClock(v.attempt.timeSec), n: String(Math.round((r.timeLimitSec || 2400) / 60)) })}</Chip>}
          </div>
          {paras.map((p, i) => {
            const note = det?.paragraphs?.find((x) => x.index === i + 1)
            return (
              <div key={i} className="ih-wmine__para">
                <span>{t('ieltsWriting.p.work.paragraph', { n: String(i + 1), words: t('ieltsWriting.wordsN', { n: String(countWords(p)) }) })}{note?.role ? ` · ${note.role}` : ''}</span>
                {/* места замечаний подсвечены прямо в тексте — видно, где именно ошибка */}
                <p lang="en">{markQuotes(p, status === 'done' ? r.errors : null)}</p>
                {note?.comment && <p className="ih-wmine__note"><InfoIcon size={14} />{note.comment}</p>}
              </div>
            )
          })}
          <details className="ih-wmine__task">
            <summary>{t('ieltsWriting.p.work.showTask')}</summary>
            <WritingTaskBody task={doc} />
          </details>
        </section>

        <section className="ih-card ih-wmodel">
          <header>
            <h3>{t('ieltsWriting.p.model.title')}</h3>
            {model && <span className="ih-chip ih-chip--solid ih-chip--sm"><span>band {model.band}</span></span>}
            <span className="ih-run__spacer" />
            {model && <button type="button" className="ih-linkbtn" onClick={() => setModelOpen((o) => !o)}>{modelOpen ? t('ieltsWriting.hide') : t('ieltsWriting.show')}</button>}
          </header>
          {!model && <p className="ih-muted">{t('ieltsWriting.noModel')}</p>}
          {model && modelOpen && (
            <>
              {model.text.map((p, i) => {
                const a = model.analysis?.paragraphs?.[i]
                return (
                  <div key={i} className="ih-wmodel__para">
                    {a?.role && <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{t(`ieltsWriting.p.role.${a.role}`)}</span></span>}
                    <p lang="en">{withLinkers(p, model.analysis?.linkers, pick)}</p>
                    {a?.note && <p className="ih-wmodel__note"><InfoIcon size={14} />{pick(a.note)}</p>}
                  </div>
                )
              })}
              {model.analysis?.strengths?.length > 0 && (
                <div className="ih-wmodel__strengths">
                  <h4>{t('ieltsWriting.p.model.strengths')}</h4>
                  {model.analysis.strengths.map((s, i) => (
                    <div key={i}>
                      <b>{pick(s.title)}</b>
                      <p>{pick(s)}</p>
                      {s.example && <p className="ih-muted" lang="en">«{s.example}»</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {sc.length > 0 && (
        <section className="ih-card ih-wsc">
          <header>
            <h3>{t('ieltsWriting.p.sc.title')}</h3>
            <span className="ih-run__spacer" />
            <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{t('ieltsWriting.p.sc.count', { n: String(Object.keys(answers).length), total: String(scTotal) })}</span></span>
          </header>
          <div className="ih-wsc__grid">
            {sc.map((c) => (
              <div key={c.key} className="ih-wsc__crit">
                <b>{t(`ieltsWriting.critName.${c.key}`)}</b>
                <p className="ih-muted">{pick(c.what)}</p>
                {c.questions.map((q) => {
                  const key = `${c.key}.${q.key}`
                  const val = answers[key]
                  return (
                    <div key={key} className="ih-wsc__q">
                      <p>{pick(q.q)}</p>
                      <div className="ih-wsc__ans" role="radiogroup" aria-label={pick(q.q)}>
                        {['yes', 'no', 'unsure'].map((x) => (
                          <button key={x} type="button" role="radio" aria-checked={val === x} className={val === x ? `is-on is-${x}` : ''} onClick={() => answer(key, x)}>
                            {t(`ieltsWriting.p.sc.ans.${x}`)}
                          </button>
                        ))}
                      </div>
                      {(val === 'no' || val === 'unsure') && q.tip && (
                        <p className="ih-wsc__tip">
                          {pick(q.tip)}
                          {q.guide && <button type="button" className="ih-linkbtn" onClick={onGuide}>{t('ieltsWriting.openGuide')}</button>}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <p className="ih-muted">{t('ieltsWriting.p.sc.noBand')}</p>
        </section>
      )}
    </div>
  )
}
