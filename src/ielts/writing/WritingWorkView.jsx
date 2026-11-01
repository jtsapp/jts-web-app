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
import { WritingDevelop, WritingImprove } from './WritingCoach.jsx'
import { CRITERIA, countWords, kindKey, selfCheckFor } from './writing.js'
import { categoryLabel } from './WritingListView.jsx'
import { CRIT_CODE, annotate, capBanners, errorView, taskCategory, weakDrills } from './writingReview.js'
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
export function markQuotes(text, errors) {
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

/** Пометка ошибки в тексте: цвет критерия и номер карточки; клик или Enter — к карточке. */
function ErrMark({ text, n, crit, title, onOpen }) {
  return (
    <mark
      className={`ih-wrev__mark is-${crit}`}
      role="button"
      tabIndex={0}
      title={title}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
    >
      {text}
      <sup>{n}</sup>
    </mark>
  )
}

/** Карточка ошибки: номер, критерий, тип, абзац, ✗ цитата, ✓ исправление, что не так, правило. */
function ErrCard({ e, n, found, hl, critName, t }) {
  const v = errorView(e)
  const code = CRIT_CODE[v.criterion]
  return (
    <article id={`ih-werr-${n}`} className={`ih-wrev__err is-${code} ${hl ? 'is-hl' : ''}`} tabIndex={-1}>
      <header>
        <span className="ih-wrev__num">{n}</span>
        <span className="ih-chip ih-chip--neutral ih-chip--sm"><span>{critName(v.criterion)}</span></span>
        {v.type && <span className="ih-chip ih-chip--muted ih-chip--sm"><span>{t(`ieltsWReview.type.${v.type}`)}</span></span>}
        {v.para > 0 && <span className="ih-muted">{t('ieltsWReview.wherePara', { n: String(v.para) })}</span>}
        {!found && <span className="ih-muted">{t('ieltsWReview.general')}</span>}
      </header>
      {found && <p className="ih-wrev__bad" lang="en">✗ {v.quote}</p>}
      {v.fix && <p className="ih-wrev__good" lang="en">{found ? '✓' : '→'} {v.fix}</p>}
      {v.why && <p><b>{t('ieltsWReview.whatWrong')}:</b> {v.why}</p>}
      {v.rule && <p><b>{t('ieltsWReview.rule')}:</b> {v.rule}</p>}
    </article>
  )
}

// onPractice(attemptId) — «Закрепление» (упражнения по ошибкам в плеере тренировок), onDrill(testId, ty) —
// тренировка под слабый критерий, onGuide(section?) — «Как писать» (глава типа задания). drills — строки каталога
// Writing: тренировки, которых нет в банке, не предлагаются (без каталога — не предлагаются вовсе).
export default function WritingWorkView({ token, attemptId, autoGrade, onBackToLearn, onWorks, onRetry, onGuide, onPractice, onDrill, drills = null, embedded = false }) {
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
  const [critFilter, setCritFilter] = useState('all')
  const [hl, setHl] = useState(null)
  const autoDone = useRef(false)
  const hlTimer = useRef(null)
  useEffect(() => () => clearTimeout(hlTimer.current), [])

  // пометка в тексте → её карточка: фильтр снимается, карточка прокручивается в вид и мигает
  const openError = useCallback((n) => {
    setCritFilter('all')
    setHl(n)
    clearTimeout(hlTimer.current)
    hlTimer.current = setTimeout(() => setHl(null), 2200)
    setTimeout(() => {
      const el = document.getElementById(`ih-werr-${n}`)
      if (!el) return
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch {
        /* jsdom */
      }
      el.focus?.({ preventScroll: true })
    }, 0)
  }, [])

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
  const done = status === 'done'
  const kind = kindKey(doc)
  const sc = selfCheckFor(selfcheck, kind)
  const scTotal = sc.reduce((a, c) => a + c.questions.length, 0)
  const critName = (c) => t(`ieltsWriting.crit.${c}${c === 'taskResponse' && kind !== 't2' ? '1' : ''}`)

  // разбор (ТЗ §9.4): пометки в тексте, ошибки по критериям, ограничения, закрепление и тренировки
  const errors = done && Array.isArray(r.errors) ? r.errors : []
  const { parts, placed } = annotate(paras, errors)
  const errCount = (c) => errors.filter((e) => errorView(e).criterion === c).length
  const caps = done ? capBanners(r.caps) : []
  const exercises = done && Array.isArray(r.exercises) ? r.exercises : []
  const ty = taskCategory(doc)
  const drillRows = Array.isArray(drills) ? drills.filter((x) => x?.kind === 'drill') : null
  const weak = done && drillRows ? weakDrills(r.criteria, kind, new Set(drillRows.map((x) => x.id))) : []
  const drillTitle = (id) => {
    const row = drillRows?.find((x) => x.id === id)
    return pick(row?.name) || row?.title || id
  }
  const guideSection = ty ? `${kind}.${ty}` : kind
  const notes = det?.criteriaNotes || []

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

      {/* 1. ограничения балла — коды бэкенда; у работ, оценённых до них, баннеров нет */}
      {caps.map((c) => (
        <p key={c} className={`ih-wrev__cap ${c === 'copied_intro' ? 'is-note' : ''}`} role="note">
          <InfoIcon size={18} />
          {t(`ieltsWReview.cap.${c}`, { crit: critName('taskResponse') })}
        </p>
      ))}

      {done ? (
        <section className="ih-card ih-wscore">
          <div className="ih-wscore__band">
            <span>{t('ieltsWriting.band')}</span>
            <b>{v.attempt.band?.toFixed(1)}</b>
          </div>
          {/* 2. четыре полосы критериев: балл, число замечаний и цвет критерия — тот же, что у пометок в тексте */}
          <div className="ih-wrev__bars">
            {CRITERIA.map((c) => {
              const band = Number(r.criteria?.[c])
              return (
                <div key={c} className={`ih-wrev__bar is-${CRIT_CODE[c]}`}>
                  <div className="ih-wrev__barhead">
                    <i className="ih-wrev__dot" aria-hidden="true" />
                    <span>{critName(c)}</span>
                    {errors.length > 0 && <small className="ih-muted">{t('ieltsWReview.issues', { n: String(errCount(c)) })}</small>}
                    <b>{Number.isFinite(band) ? band.toFixed(1) : '—'}</b>
                  </div>
                  <div className="ih-wrev__track"><i className={band < 6 ? 'is-low' : ''} style={{ width: `${Math.max(0, Math.min(9, band || 0)) / 9 * 100}%` }} /></div>
                </div>
              )
            })}
          </div>
          {r.feedback && <p className="ih-wscore__fb">{r.feedback}</p>}
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

      {/* 3. закрепление: упражнения по ошибкам этой работы — в плеере тренировок */}
      {exercises.length > 0 && !embedded && onPractice && (
        <section className="ih-card ih-wrev__practice">
          <div>
            <h3>{t('ieltsWReview.practiceTitle')}</h3>
            <p className="ih-muted">{t('ieltsWReview.practiceSub', { n: String(exercises.length) })}</p>
          </div>
          <PillButton variant="primary" onClick={() => onPractice(attemptId)}>{t('ieltsWReview.practiceBtn', { n: String(exercises.length) })}</PillButton>
        </section>
      )}

      {/* 4. ваш текст с пометками и образец рядом */}
      <div className="ih-wwork__grid">
        <section className="ih-card ih-wmine">
          <header>
            <h3>{errors.length ? t('ieltsWReview.annotated') : t('ieltsWriting.yourText')}</h3>
            <span className="ih-muted">{formatDate(v.attempt.finishedAt, lang)}</span>
          </header>
          <div className="ih-wmine__chips">
            <Chip tone={r.underLength ? 'orange' : 'green'} size="sm">{t('ieltsWriting.p.work.words', { words: t('ieltsWriting.wordsN', { n: String(r.words ?? countWords(text)) }), min: String(r.minWords ?? '') })}</Chip>
            {r.copied > 0 && <Chip tone="orange" size="sm">{t('ieltsWReview.copied', { n: String(r.copied) })}</Chip>}
            <Chip tone="neutral" size="sm">{t('ieltsWriting.p.work.paragraphs', { n: String(paras.length) })}</Chip>
            {v.attempt.timeSec != null && <Chip tone="neutral" size="sm" icon={<TimerIcon size={14} />}>{t('ieltsWriting.timeOf', { time: formatClock(v.attempt.timeSec), n: String(Math.round((r.timeLimitSec || 2400) / 60)) })}</Chip>}
          </div>
          {placed.size > 0 && (
            <>
              <p className="ih-muted ih-wrev__sub">{t('ieltsWReview.annotatedSub')}</p>
              <div className="ih-wrev__legend">
                {CRITERIA.map((c) => <span key={c} className={`is-${CRIT_CODE[c]}`}><i className="ih-wrev__dot" aria-hidden="true" />{critName(c)}</span>)}
              </div>
            </>
          )}
          {paras.map((p, i) => {
            const note = det?.paragraphs?.find((x) => x.index === i + 1)
            return (
              <div key={i} className="ih-wmine__para">
                <span>{t('ieltsWriting.p.work.paragraph', { n: String(i + 1), words: t('ieltsWriting.wordsN', { n: String(countWords(p)) }) })}{note?.role ? ` · ${note.role}` : ''}</span>
                <p lang="en">
                  {parts[i].map((s, k) =>
                    s.i == null ? (
                      s.text
                    ) : (
                      <ErrMark key={k} text={s.text} n={s.i + 1} crit={CRIT_CODE[errorView(errors[s.i]).criterion]} title={errorView(errors[s.i]).fix} onOpen={() => openError(s.i + 1)} />
                    ),
                  )}
                </p>
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

      {/* 5. разбор по критериям: фильтр, почему такой балл, что поднимет, карточки ошибок */}
      {done && (notes.length > 0 || errors.length > 0) && (
        <section className="ih-card ih-wrev__crit">
          <h3>{t('ieltsWReview.byCrit')}</h3>
          {errors.length > 0 && (
            <div className="ih-wrev__chips" role="group" aria-label={t('ieltsWReview.byCrit')}>
              {['all', ...CRITERIA].map((c) => (
                <button key={c} type="button" className={`ih-wrev__chip ${c === 'all' ? '' : `is-${CRIT_CODE[c]}`}`} aria-pressed={critFilter === c} onClick={() => setCritFilter(c)}>
                  {c !== 'all' && <i className="ih-wrev__dot" aria-hidden="true" />}
                  {c === 'all' ? t('ieltsWReview.all') : critName(c)}
                  <span>{c === 'all' ? errors.length : errCount(c)}</span>
                </button>
              ))}
            </div>
          )}
          {CRITERIA.filter((c) => critFilter === 'all' || critFilter === c).map((c) => {
            const note = notes.find((x) => x.criterion === c)
            const mine = errors.map((e, i) => [e, i]).filter(([e]) => errorView(e).criterion === c)
            if (!note && !mine.length) return null
            return (
              <div key={c} className={`ih-wrev__block is-${CRIT_CODE[c]}`}>
                <header>
                  <b>{critName(c)}</b>
                  <span className="ih-wdet__band">{r.criteria?.[c] != null ? Number(r.criteria[c]).toFixed(1) : '—'}</span>
                </header>
                {note?.why && <p><small>{t('ieltsWriting.d.why')}</small>{note.why}</p>}
                {note?.nextBand && <p className="ih-wdet__next"><small>{t('ieltsWriting.d.next')}</small>{note.nextBand}</p>}
                {mine.map(([e, i]) => <ErrCard key={i} e={e} n={i + 1} found={placed.has(i)} hl={hl === i + 1} critName={critName} t={t} />)}
              </div>
            )
          })}
        </section>
      )}

      {/* 6. тренировки под слабые места (критерии ниже 6.5) и теория этого типа */}
      {done && !embedded && (weak.length > 0 || onGuide) && (
        <section className="ih-card ih-wrev__drills">
          <h3>{t('ieltsWReview.drillsFor')}</h3>
          <div className="ih-wrev__drillrow">
            {weak.map((id) => (
              <button key={id} type="button" className="ih-btn ih-btn--outline" onClick={() => onDrill?.(id, ty)}>{drillTitle(id)}</button>
            ))}
            <button type="button" className="ih-linkbtn" onClick={() => onGuide?.(guideSection)}>{t('ieltsWReview.theory')}</button>
          </div>
        </section>
      )}

      {/* 7. что получилось · лексика · что делать дальше */}
      {done && det && (det.strengths?.length > 0 || det.nextSteps?.length > 0 || det.vocabulary?.length > 0) && (
        <section className="ih-card ih-wdet">
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
              {det.vocabulary.map((w, i) => (
                <div key={i} className="ih-wdet__word">
                  <s lang="en">{w.word}</s>
                  <span lang="en">→ {w.better.join(' · ')}</span>
                  {w.note && <small>{w.note}</small>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* «наставник»: как развить это эссе и как улучшить его по предложениям или целиком (у старых работ — нет) */}
      {done && <WritingDevelop tips={det?.developmentTips} />}
      {done && <WritingImprove sentences={det?.sentences} essay={det?.improvedEssay} paragraphs={paras} kind={kind} />}

      {/* по предложениям (WritingImprove) уже переписан весь текст — 1–4 старых переписывания рядом его бы дублировали */}
      {done && !det?.sentences?.length && (r.rewrites || []).length > 0 && (
        <section className="ih-card ih-wfix">
          <h3>{t('ieltsWriting.rewritesTitle')}</h3>
          {r.rewrites.map((w, i) => (
            <div key={`w${i}`} className="ih-wfix__row" lang="en">
              <p className="ih-muted">{w.original}</p>
              <p><b>{w.improved}</b></p>
            </div>
          ))}
        </section>
      )}

      {done && !embedded && (
        <div className="ih-wrev__again">
          <PillButton variant="primary" onClick={() => onRetry(v.testId)}>{t('ieltsWriting.p.work.again')}</PillButton>
        </div>
      )}

      {/* 8. самопроверка */}
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
                          {q.guide && <button type="button" className="ih-linkbtn" onClick={() => onGuide?.()}>{t('ieltsWriting.openGuide')}</button>}
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
