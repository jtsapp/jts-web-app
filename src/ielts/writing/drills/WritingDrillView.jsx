import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EmptyState from '../../ui/EmptyState.jsx'
import { getIeltsAttempt, getIeltsTest } from '../../../api.js'
import { loadToken } from '../../../lib/session.js'
import { useI18n } from '../../../i18n.jsx'
import { ChevronLeftIcon, MenuBookIcon, TimerIcon } from '../../icons.jsx'
import { categoryLabel } from '../WritingListView.jsx'
import DrillVisual from './DrillVisual.jsx'
import {
  GAP, LETTERS, MIN_TYPED, PASS_PCT, buildSession, checkRound, fillGap, freeChecks, guideSection, partOfType, pickLang, resolveVisual,
  roundsForTrack, sessionSummary, taskText, tasksForDrill, validateDrill, withRetry,
} from './drillModel.js'
import { checkMiniEssay, fetchReview, recordRun, resolveReview, useIeltsReviewCount } from './drillProgress.js'
import { sampleDrill } from './sampleDrills.js'

// Повторение — не больше 12 раундов за раз (как очередь прототипа S.rq.slice(0, 12))
const REVIEW_MAX = 12
export const REVIEW_ID = 'review'
export const ATTEMPT_PREFIX = 'attempt:'

// Документы банка (задания для графиков и текста, дриллы для повторения) — один запрос на id за визит
const docCache = new Map()
function loadDoc(token, id) {
  const s = sampleDrill(id)
  if (s) return Promise.resolve(s)
  if (!docCache.has(id)) {
    const p = getIeltsTest(token, id).then((r) => r?.document || r)
    p.catch(() => docCache.delete(id))
    docCache.set(id, p)
  }
  return docCache.get(id)
}

const roundOk = (r) => validateDrill({ id: 'x', kind: 'drill', module: 'both', title: 'x', rounds: [r] }).length === 0

/**
 * Повторение ошибок: очередь сервера (до 12 раундов, новые сверху) → раунды из своих дриллов или из упражнений
 * разбора (source attempt — result.exercises попытки). Раунд, которого в документе больше нет, пропускается.
 */
async function loadReviewDoc(token) {
  const queue = (await fetchReview(token)).slice(0, REVIEW_MAX)
  const byDoc = new Map()
  for (const q of queue) {
    const key = `${q.source || 'drill'}|${q.testId}`
    if (!byDoc.has(key)) byDoc.set(key, { testId: q.testId, source: q.source || 'drill', ids: [] })
    byDoc.get(key).ids.push(q.roundId)
  }
  const rounds = []
  await Promise.all(
    [...byDoc.values()].map(async (g) => {
      const list = await (g.source === 'attempt'
        ? getIeltsAttempt(token, g.testId).then((a) => a?.result?.exercises || a?.attempt?.result?.exercises || [])
        : loadDoc(token, g.testId).then((d) => d?.rounds || [])
      ).catch(() => [])
      for (const id of g.ids) {
        const r = list.find((x) => x?.id === id)
        if (r && roundOk(r)) rounds.push({ ...r, __ref: { testId: g.testId, source: g.source } })
      }
    }),
  )
  return rounds
}

/**
 * Короткая тренировка Writing (дрилл): вступление → раунды по одному с проверкой и объяснением, ошибка повторяется в
 * конце сессии → итог (процент с первой попытки, «Пройдено» от 80%). Источник раундов по drillId:
 * - id дрилла банка (getIeltsTest) или пробного (sampleDrills.js, без запроса);
 * - 'attempt:<id>' — упражнения разбора работы (result.exercises попытки), «Закрепление: ваши ошибки»;
 * - 'review' — очередь «Повторить ошибки» с сервера.
 * ty — тип задания (фильтр раундов, ТЗ §5.4). Рисует любой раунд формата drillModel.js одним компонентом.
 */
export default function WritingDrillView({ token, drillId, track, ty = null, catalog, onBack, onRecorded, onGuide, onReview, onOpenTask, rng }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const mode = drillId === REVIEW_ID ? 'review' : String(drillId || '').startsWith(ATTEMPT_PREFIX) ? 'attempt' : 'drill'
  const attemptId = mode === 'attempt' ? String(drillId).slice(ATTEMPT_PREFIX.length) : null
  const [state, setState] = useState(() => {
    const s = mode === 'drill' && sampleDrill(drillId)
    return s ? { status: 'ready', doc: s } : { status: 'loading' }
  })
  useEffect(() => {
    if (mode === 'drill' && sampleDrill(drillId)) return undefined
    let alive = true
    const load =
      mode === 'review'
        ? loadReviewDoc(authToken).then((rounds) => ({ id: REVIEW_ID, kind: 'drill', module: 'both', title: 'review', rounds, maxFree: 0 }))
        : mode === 'attempt'
          ? getIeltsAttempt(authToken, attemptId).then((a) => {
              const ex = (a?.result?.exercises || a?.attempt?.result?.exercises || []).filter(roundOk)
              return { id: attemptId, kind: 'drill', module: 'both', title: 'attempt', rounds: ex, maxFree: 0 }
            })
          : getIeltsTest(authToken, drillId).then((r) => r?.document || r)
    load.then((doc) => alive && setState({ status: 'ready', doc })).catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, drillId, mode, attemptId])

  const [run, setRun] = useState({ phase: 'intro', queue: [], idx: 0, results: [], ty: null })
  const doc = state.doc
  const problems = useMemo(() => (doc && mode === 'drill' ? validateDrill(doc) : []), [doc, mode])
  const title = mode === 'review' ? t('ieltsWDrill.reviewTitle') : mode === 'attempt' ? t('ieltsWDrill.attemptTitle') : doc ? pickLang(doc.name, lang) || doc.title : ''
  const pool = doc ? roundsForTrack(doc, track) : []
  // фильтр по типу применится, только если раундов этого типа хватает — иначе бейджа нет
  const launchTy = ty && pool.filter((r) => r.ty === ty).length >= MIN_TYPED ? ty : null
  const shownTy = run.phase === 'intro' ? launchTy : run.ty
  const section = mode === 'drill' && doc ? guideSection(doc, shownTy) : null

  const header = (
    <header className="ih-wdrill__head">
      <button type="button" className="ih-wdrill__back" onClick={onBack}>
        <ChevronLeftIcon size={18} />
        <span>{t('ieltsWDrill.back')}</span>
      </button>
      <h2>{title || t('ieltsPractice.tab.writing.drills')}</h2>
      <span className="ih-wdrill__meta">
        {shownTy && <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{typeName(t, shownTy)}</span></span>}
        {doc?.sample && <span className="ih-chip ih-chip--orange ih-chip--sm"><span>{t('ieltsWDrill.sample')}</span></span>}
        {mode === 'drill' && doc && <span className="ih-muted">{t('ieltsHub.minutes', { n: String(doc.minutes || 5) })}</span>}
        {section && onGuide && (
          <button type="button" className="ih-btn2 ih-btn2--outline ih-wdrill__theory" onClick={() => onGuide(section)}>
            <MenuBookIcon size={16} />
            <span>{t('ieltsWDrill.theory')}</span>
          </button>
        )}
      </span>
    </header>
  )

  if (state.status !== 'ready' || problems.length || !pool.length) {
    const emptyReview = state.status === 'ready' && mode === 'review'
    return (
      <div className="ih-wdrill">
        {header}
        {state.status === 'loading' ? (
          <p className="ih-muted">{t('ieltsReading.loading')}</p>
        ) : emptyReview ? (
          <EmptyState icon={<TimerIcon size={28} />} title={t('ieltsWDrill.reviewEmptyTitle')} text={t('ieltsWDrill.reviewEmptyText')} />
        ) : (
          <EmptyState icon={<TimerIcon size={28} />} title={t('ieltsReading.errorTitle')} text={state.status === 'error' ? t('ieltsReading.errorText') : t('ieltsWDrill.broken')} />
        )}
      </div>
    )
  }

  const start = () => {
    const s = buildSession(doc, track, { ty: launchTy, rng, all: mode !== 'drill' })
    setRun({ phase: 'run', queue: s.items, idx: 0, results: [], ty: s.ty })
  }
  const answer = (value, extra) => {
    if (run.results[run.idx]) return
    const item = run.queue[run.idx]
    const res = { ...checkRound(item.round, value), value, ...extra }
    const results = run.results.slice()
    results[run.idx] = res
    setRun({ ...run, results, queue: withRetry(run.queue, run.idx, res) })
    // повторение: верный ответ убирает раунд из очереди ошибок сервера
    if (mode === 'review' && res.correct && item.round.__ref) resolveReview(authToken, [{ testId: item.round.__ref.testId, roundId: item.round.id }])
  }
  // запись прохода — не в функции-обновлении: StrictMode зовёт её дважды, и проход записался бы два раза
  const next = () => {
    if (run.idx + 1 < run.queue.length) return setRun({ ...run, idx: run.idx + 1 })
    const sum = sessionSummary(run.queue, run.results)
    if (mode !== 'review' && sum.total > 0) {
      const id = mode === 'attempt' ? attemptId : doc.id
      recordRun(authToken, id, { ...sum, source: mode === 'attempt' ? 'attempt' : 'drill', sample: !!doc.sample }).then((row) => {
        if (mode === 'drill' && row) onRecorded?.((p) => ({ ...(p || {}), [id]: row }))
      })
    }
    return setRun({ ...run, phase: 'result' })
  }
  const item = run.queue[run.idx]

  return (
    <div className="ih-wdrill">
      {header}

      {run.phase === 'intro' && (
        <section className="ih-card ih-wdrill__card">
          {mode === 'drill' && doc.intro && <p>{pickLang(doc.intro, lang)}</p>}
          {mode === 'attempt' && <p>{t('ieltsWDrill.attemptIntro')}</p>}
          <p className="ih-muted">{t('ieltsWDrill.introText', { n: String(buildCount(doc, pool, mode)) })}</p>
          {doc.sample && <p className="ih-muted">{t('ieltsWDrill.sampleNote')}</p>}
          <div className="ih-wdrill__actions">
            <button type="button" className="ih-btn2 ih-btn2--primary" onClick={start}>{t('ieltsWDrill.start')}</button>
          </div>
        </section>
      )}

      {run.phase === 'run' && item && (
        <section className="ih-card ih-wdrill__card" key={run.idx}>
          <div className="ih-wdrill__progress">
            <span className="ih-muted">
              {t('ieltsWDrill.progress', { n: String(run.idx + 1), total: String(run.queue.length) })}
              {item.retry ? ` · ${t('ieltsWDrill.retry')}` : ''}
            </span>
            <span className="ih-wdrill__bar" aria-hidden="true"><i style={{ width: `${Math.round((run.idx / run.queue.length) * 100)}%` }} /></span>
          </div>
          <DrillRound
            key={`${run.idx}`}
            item={item}
            asks={doc.asks}
            result={run.results[run.idx]}
            onAnswer={answer}
            ctx={{ token: authToken, drillId: mode === 'drill' ? doc.id : null, aiCheck: mode === 'drill' && !!doc.aiCheck }}
          />
          {run.results[run.idx] && (
            <NextButton onClick={next} label={run.idx + 1 < run.queue.length ? t('ieltsWDrill.next') : t('ieltsWDrill.finish')} />
          )}
        </section>
      )}

      {run.phase === 'result' && (
        <DrillResult
          run={run}
          mode={mode}
          related={mode === 'drill' ? tasksForDrill(catalog, doc, run.ty, track) : []}
          token={authToken}
          onAgain={start}
          onBack={onBack}
          onGuide={section && onGuide ? () => onGuide(section) : null}
          onReview={mode !== 'review' ? onReview : null}
          onOpenTask={onOpenTask}
        />
      )}
    </div>
  )
}

const buildCount = (doc, pool, mode) => {
  if (mode !== 'drill') return pool.length
  const show = Number(doc.show) > 0 ? Number(doc.show) : 10
  const maxFree = doc.maxFree != null ? Number(doc.maxFree) : 2
  const notFree = pool.filter((r) => r.kind !== 'free').length
  return Math.min(show, notFree + Math.min(maxFree, pool.length - notFree))
}

function typeName(t, ty) {
  return categoryLabel(t, partOfType(ty) === 't2' ? 'task2' : 'task1', ty) || ty
}

// «Дальше» получает фокус сразу после проверки — с клавиатуры ответ и переход идут без лишних Tab
function NextButton({ onClick, label }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div className="ih-wdrill__actions">
      <button ref={ref} type="button" className="ih-btn2 ih-btn2--primary" onClick={onClick}>{label}</button>
    </div>
  )
}

function DrillResult({ run, mode, related, token, onAgain, onBack, onGuide, onReview, onOpenTask }) {
  const { t, lang } = useI18n()
  const sum = sessionSummary(run.queue, run.results)
  const { count: reviewCount } = useIeltsReviewCount(token)
  const wrong = run.queue.map((item, i) => ({ item, res: run.results[i] })).filter((x) => !x.item.retry && x.res?.correct === false)
  return (
    <section className="ih-card ih-wdrill__card">
      {sum.total ? (
        <div className="ih-wdrill__score">
          <b className="ih-wdrill__pct">{sum.pct}%</b>
          <div>
            <h3>{t('ieltsWDrill.firstTry', { n: String(sum.score), total: String(sum.total) })}</h3>
            <span className={`ih-chip ih-chip--sm ${sum.passed ? 'ih-chip--green' : 'ih-chip--orange'}`}>
              <span>{sum.passed ? t('ieltsWDrill.passed') : t('ieltsWDrill.notPassed', { n: String(PASS_PCT) })}</span>
            </span>
          </div>
        </div>
      ) : (
        <h3>{t('ieltsWDrill.done')}</h3>
      )}
      {sum.total > 0 && <p className="ih-muted">{t(sum.score === sum.total ? 'ieltsWDrill.allRight' : 'ieltsWDrill.reviewMistakes')}</p>}
      {wrong.length > 0 && (
        <ul className="ih-wdrill__mistakes">
          {wrong.map(({ item, res }, i) => (
            <li key={i}>
              {item.round.text && <p lang="en">{item.round.kind === 'gap' || item.round.kind === 'type' ? fillGap(item.round.text, res.expected) : item.round.text}</p>}
              {item.round.kind !== 'gap' && item.round.kind !== 'type' && item.round.kind !== 'free' && <Expected round={item.round} result={res} />}
              {item.round.why && <p className="ih-muted">{pickLang(item.round.why, lang)}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="ih-wdrill__actions">
        <button type="button" className="ih-btn2 ih-btn2--primary" onClick={onAgain}>{mode === 'drill' ? t('ieltsWDrill.againNew') : t('ieltsWDrill.again')}</button>
        {onGuide && <button type="button" className="ih-btn2 ih-btn2--outline" onClick={onGuide}>{t('ieltsWDrill.theory')}</button>}
        {onReview && reviewCount > 0 && (
          <button type="button" className="ih-btn2 ih-btn2--outline" onClick={onReview}>{t('ieltsWDrill.reviewCard.title', { n: String(reviewCount) })}</button>
        )}
        <button type="button" className="ih-btn2 ih-btn2--outline" onClick={onBack}>{t('ieltsWDrill.toList')}</button>
      </div>
      {related.length > 0 && onOpenTask && (
        <div className="ih-wdrill__apply">
          <b>{t('ieltsWDrill.apply')}</b>
          <div className="ih-wdrill__actions">
            {related.map((task) => (
              <button key={task.id} type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onOpenTask(task.id)}>
                <span lang="en">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/** Задание и график раунда: свой график, ссылка на график задания или график задания task; текст задания — для free. */
function useRoundAssets(round, token) {
  const refId = round.visual?.ref || null
  const taskId = round.task || null
  const [docs, setDocs] = useState({})
  useEffect(() => {
    let alive = true
    for (const id of [refId, taskId].filter(Boolean)) {
      loadDoc(token, id)
        .then((d) => alive && setDocs((m) => ({ ...m, [id]: d })))
        .catch(() => null)
    }
    return () => {
      alive = false
    }
  }, [refId, taskId, token])
  const task = taskId ? docs[taskId] : null
  const chart = round.visual ? resolveVisual(round.visual, refId ? docs[refId]?.chart : null) : task?.chart || null
  return { chart, task }
}

/** Один раунд любого вида: вопрос, материал, ответ и — после проверки — вердикт с объяснением. */
export function DrillRound({ item, asks, result, onAnswer, ctx = {} }) {
  const { t, lang } = useI18n()
  const { round } = item
  const { chart, task } = useRoundAssets(round, ctx.token)
  const ask = pickLang(round.ask, lang) || pickLang(asks?.[round.kind], lang) || t(`ieltsWDrill.ask.${round.kind}`)
  return (
    <div className="ih-wdrill__round">
      <h3>{ask}</h3>
      {round.kind === 'free' && task?.question && <p className="ih-wdrill__task" lang="en">{taskText(task)}</p>}
      {round.kind !== 'pick' && <DrillVisual chart={chart} />}
      {(round.kind === 'choice' || round.kind === 'gap' || round.kind === 'weak') && <ChoiceRound item={item} result={result} onAnswer={onAnswer} />}
      {round.kind === 'type' && <TypeRound round={round} result={result} onAnswer={onAnswer} />}
      {round.kind === 'sort' && <SortRound item={item} result={result} onAnswer={onAnswer} />}
      {round.kind === 'order' && <OrderRound item={item} result={result} onAnswer={onAnswer} />}
      {round.kind === 'match' && <MatchRound item={item} result={result} onAnswer={onAnswer} />}
      {round.kind === 'spot' && <SpotRound round={round} result={result} onAnswer={onAnswer} />}
      {round.kind === 'pick' && <PickRound round={round} chart={chart} result={result} onAnswer={onAnswer} />}
      {round.kind === 'free' && <FreeRound round={round} source={taskText(task)} result={result} onAnswer={onAnswer} ctx={ctx} />}
      {round.kind === 'html' && <HtmlRound round={round} result={result} onAnswer={onAnswer} />}
      {result && <Verdict item={item} chart={chart} result={result} />}
    </div>
  )
}

/** Верный ответ вида раунда: порядок списком, пары, исправление слова, точки графика. */
function Expected({ round, result, chart }) {
  const { t, lang } = useI18n()
  let body = null
  if (round.kind === 'order') body = <ol lang="en">{round.items.map((x, i) => <li key={i}>{pickLang(x, lang)}</li>)}</ol>
  else if (round.kind === 'match') body = <ul lang="en">{round.pairs.map((p, i) => <li key={i}>{pickLang(p[0], lang)} → {pickLang(p[1], lang)}</li>)}</ul>
  else if (round.kind === 'pick') {
    const x = chart?.x || []
    body = <span lang="en">{round.answer.map((i) => x[i] ?? i + 1).join(', ')}</span>
  } else if (round.kind === 'spot') {
    body = (
      <span lang="en">
        <s>{round.tokens[round.wrong]}</s> → <b>{round.accept[0]}</b>
      </span>
    )
  } else if (result?.expected) body = <b lang="en">{result.expected}</b>
  if (!body) return null
  return (
    <div className="ih-wdrill__expected">
      <span>{t('ieltsReading.rightAnswer')}:</span> {body}
    </div>
  )
}

function Verdict({ item, chart, result }) {
  const { t, lang } = useI18n()
  const { round } = item
  const why = pickLang(round.why, lang)
  if (result.correct === null) return why ? <div className="ih-fb" role="status"><p>{why}</p></div> : null
  const status = result.correct ? 'ok' : 'wrong'
  const label = round.kind === 'free' ? t(result.correct ? 'ieltsWDrill.free.ok' : 'ieltsWDrill.free.bad') : t(`ieltsReading.verdict.${status}`)
  return (
    <div className={`ih-fb ih-fb--${status}`} role="status">
      <div className="ih-fb__head">
        <b><span aria-hidden="true">{result.correct ? '✓' : '✗'}</span> <span>{label}</span></b>
        {result.total > 0 && <span>{t('ieltsWDrill.score', { n: String(result.score), total: String(result.total) })}</span>}
      </div>
      {!result.correct && round.kind !== 'sort' && round.kind !== 'free' && <Expected round={round} result={result} chart={chart} />}
      {why && <p>{why}</p>}
      {!result.correct && !item.retry && round.kind !== 'free' && <p className="ih-muted">{t('ieltsWDrill.willReturn')}</p>}
    </div>
  )
}

function ChoiceRound({ item, result, onAnswer }) {
  const { lang } = useI18n()
  const { round, order } = item
  const keyIdx = LETTERS.indexOf(String(round.key))
  const text = round.kind === 'gap' && result ? fillGap(round.text, round.options[keyIdx]) : round.text
  return (
    <>
      {text && <p className="ih-wdrill__text" lang="en">{text}</p>}
      <div className="ih-q__opts" role="group">
        {order.map((oi, pos) => {
          const state = !result ? '' : oi === keyIdx ? ' is-ok' : oi === Number(result.value) ? ' is-wrong' : ''
          return (
            <button key={oi} type="button" disabled={!!result} className={`ih-opt${state}`} onClick={() => onAnswer(oi)}>
              <i>{LETTERS[pos]}</i>
              <span lang="en">{pickLang(round.options[oi], lang)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function TypeRound({ round, result, onAnswer }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [before, after] = String(round.text).split(GAP)
  const submit = (e) => {
    e.preventDefault()
    if (value.trim() && !result) onAnswer(value)
  }
  return (
    <form className="ih-wdrill__type" onSubmit={submit}>
      {round.hint && <p className="ih-wdrill__hint"><b>{t('ieltsWDrill.hint')}:</b> <span lang="en">{round.hint}</span></p>}
      <p className="ih-wdrill__text" lang="en">
        {before}
        <input className={`ih-gap${result ? (result.correct ? ' is-ok' : ' is-wrong') : ''}`} value={value} onChange={(e) => setValue(e.target.value)} disabled={!!result} aria-label={t('ieltsWDrill.typeLabel')} autoComplete="off" autoCapitalize="off" spellCheck={false} />
        {after}
      </p>
      {!result && (
        <div className="ih-wdrill__actions">
          <button type="submit" className="ih-btn2 ih-btn2--primary" disabled={!value.trim()}>{t('ieltsWDrill.check')}</button>
        </div>
      )}
    </form>
  )
}

function SortRound({ item, result, onAnswer }) {
  const { t, lang } = useI18n()
  const { round, order } = item
  const [placed, setPlaced] = useState({})
  const all = round.items.every((_, i) => placed[i])
  const wrong = new Set(result?.wrongItems || [])
  return (
    <>
      <ul className="ih-wdrill__sort">
        {order.map((ii) => {
          const it = round.items[ii]
          const state = result ? (wrong.has(ii) ? ' is-wrong' : ' is-ok') : ''
          const text = pickLang(it.text, lang)
          return (
            <li key={ii} className={`ih-wdrill__sortrow${state}`}>
              <span lang="en">{text}</span>
              <span className="ih-q__pills" role="group" aria-label={text}>
                {round.bins.map((b) => (
                  <button key={b.key} type="button" disabled={!!result} aria-pressed={placed[ii] === b.key} className={`ih-pill${placed[ii] === b.key ? ' is-on' : ''}`} onClick={() => setPlaced((p) => ({ ...p, [ii]: b.key }))}>
                    {pickLang(b.label, lang) || b.key}
                  </button>
                ))}
              </span>
              {result && wrong.has(ii) && <span className="ih-wdrill__fix">→ {pickLang(round.bins.find((b) => b.key === it.bin)?.label, lang)}</span>}
            </li>
          )
        })}
      </ul>
      {!result && (
        <div className="ih-wdrill__actions">
          <button type="button" className="ih-btn2 ih-btn2--primary" disabled={!all} onClick={() => onAnswer(placed)}>{t('ieltsWDrill.check')}</button>
        </div>
      )}
    </>
  )
}

/**
 * Расставить по порядку: мышью — за всю строку, пальцем и пером — только за ручку ⠿ (у неё touch-action: none,
 * иначе страница прокручивалась бы вместо перетаскивания); с клавиатуры — кнопки ↑ ↓ (фокус едет вместе со строкой).
 * Указатель ведут слушатели окна, а не строки: React переставляет узлы списка, и захват указателя строкой терялся бы.
 */
function OrderRound({ item, result, onAnswer }) {
  const { t, lang } = useI18n()
  const { round } = item
  const [order, setOrder] = useState(() => item.order.slice())
  const orderRef = useRef(order)
  useEffect(() => {
    orderRef.current = order
  }, [order])
  const listRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const focusRef = useRef(null)

  useEffect(() => {
    if (focusRef.current == null) return
    const { idx, dir } = focusRef.current
    focusRef.current = null
    const pos = order.indexOf(idx)
    const btn = listRef.current?.querySelector(`[data-pos="${pos}"][data-dir="${dir}"]`)
    ;(btn && !btn.disabled ? btn : listRef.current?.querySelector(`[data-pos="${pos}"][data-dir="${-dir}"]`))?.focus()
  }, [order])

  const move = (pos, dir) => {
    const o = order.slice()
    ;[o[pos], o[pos + dir]] = [o[pos + dir], o[pos]]
    focusRef.current = { idx: o[pos + dir], dir }
    setOrder(o)
  }

  const onPointerDown = (e, idx) => {
    if (result || e.target.closest('button')) return
    if (e.pointerType !== 'mouse' && !e.target.closest('.ih-wdrill__grip')) return
    e.preventDefault()
    setDragging(idx)
    const onMove = (ev) => {
      const rows = [...(listRef.current?.children || [])]
      const o = orderRef.current.slice()
      let pos = o.indexOf(idx)
      while (pos > 0) {
        const r = rows[pos - 1].getBoundingClientRect()
        if (ev.clientY < r.top + r.height / 2) {
          ;[o[pos - 1], o[pos]] = [o[pos], o[pos - 1]]
          pos--
        } else break
      }
      while (pos < o.length - 1) {
        const r = rows[pos + 1].getBoundingClientRect()
        if (ev.clientY > r.top + r.height / 2) {
          ;[o[pos + 1], o[pos]] = [o[pos], o[pos + 1]]
          pos++
        } else break
      }
      if (o.some((v, i) => v !== orderRef.current[i])) {
        orderRef.current = o
        setOrder(o)
      }
    }
    const onUp = () => {
      setDragging(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const shown = result ? result.value : order
  const wrong = new Set(result?.wrongItems || [])
  return (
    <>
      {!result && <p className="ih-muted ih-wdrill__note">{t('ieltsWDrill.order.hint')}</p>}
      {round.text && <p className="ih-wdrill__text" lang="en">{round.text}</p>}
      <ol className="ih-wdrill__order" ref={listRef}>
        {shown.map((idx, pos) => {
          const text = pickLang(round.items[idx], lang)
          const state = result ? (wrong.has(pos) ? ' is-wrong' : ' is-ok') : dragging === idx ? ' is-dragging' : ''
          return (
            <li key={idx} className={`ih-wdrill__orderrow${state}`} onPointerDown={(e) => onPointerDown(e, idx)}>
              {!result && <span className="ih-wdrill__grip" aria-hidden="true">⠿</span>}
              <b className="ih-wdrill__num">{pos + 1}</b>
              <span lang="en" className="ih-wdrill__ordertext">{text}</span>
              {!result && (
                <span className="ih-wdrill__mv">
                  <button type="button" className="ih-wdrill__mvbtn" data-pos={pos} data-dir={-1} disabled={pos === 0} aria-label={t('ieltsWDrill.order.up', { text })} onClick={() => move(pos, -1)}>↑</button>
                  <button type="button" className="ih-wdrill__mvbtn" data-pos={pos} data-dir={1} disabled={pos === shown.length - 1} aria-label={t('ieltsWDrill.order.down', { text })} onClick={() => move(pos, 1)}>↓</button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {!result && (
        <div className="ih-wdrill__actions">
          <button type="button" className="ih-btn2 ih-btn2--primary" onClick={() => onAnswer(order.slice())}>{t('ieltsWDrill.check')}</button>
        </div>
      )}
    </>
  )
}

/** Сопоставить пары: к каждому левому — выпадающий список правых (в перемешанном порядке). */
function MatchRound({ item, result, onAnswer }) {
  const { t, lang } = useI18n()
  const { round, order } = item
  const [asg, setAsg] = useState({})
  const all = round.pairs.every((_, i) => asg[i] != null && asg[i] !== '')
  const wrong = new Set(result?.wrongItems || [])
  return (
    <>
      {round.text && <p className="ih-wdrill__text" lang="en">{round.text}</p>}
      <ul className="ih-wdrill__sort">
        {round.pairs.map((p, li) => {
          const left = pickLang(p[0], lang)
          const state = result ? (wrong.has(li) ? ' is-wrong' : ' is-ok') : ''
          return (
            <li key={li} className={`ih-wdrill__sortrow ih-wdrill__matchrow${state}`}>
              <b lang="en">{left}</b>
              <select
                className="ih-wdrill__select"
                aria-label={left}
                disabled={!!result}
                value={asg[li] ?? ''}
                onChange={(e) => setAsg((a) => ({ ...a, [li]: e.target.value === '' ? '' : Number(e.target.value) }))}
              >
                <option value="">{t('ieltsWDrill.match.pick')}</option>
                {order.map((ri) => (
                  <option key={ri} value={ri}>{pickLang(round.pairs[ri][1], lang)}</option>
                ))}
              </select>
              {result && wrong.has(li) && <span className="ih-wdrill__fix" lang="en">→ {pickLang(p[1], lang)}</span>}
            </li>
          )
        })}
      </ul>
      {!result && (
        <div className="ih-wdrill__actions">
          <button type="button" className="ih-btn2 ih-btn2--primary" disabled={!all} onClick={() => onAnswer(asg)}>{t('ieltsWDrill.check')}</button>
        </div>
      )}
    </>
  )
}

/** Найти ошибку: нажать слово; не то слово — сразу «неверно», то — вписать исправление. */
function SpotRound({ round, result, onAnswer }) {
  const { t, lang } = useI18n()
  const [hit, setHit] = useState(null)
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  useEffect(() => {
    if (hit === round.wrong && !result) inputRef.current?.focus()
  }, [hit, round.wrong, result])
  const tap = (i) => {
    if (hit != null || result) return
    setHit(i)
    if (i !== round.wrong) onAnswer({ hit: i })
  }
  const submit = (e) => {
    e.preventDefault()
    if (value.trim() && !result) onAnswer({ hit, text: value })
  }
  return (
    <>
      <div className="ih-wdrill__tokens" role="group" aria-label={t('ieltsWDrill.spot.tokens')} lang="en">
        {round.tokens.map((w, i) => {
          const state = hit == null ? '' : i === round.wrong && (result || hit === i) ? ' is-ok' : i === hit ? ' is-wrong' : ''
          return (
            <button key={i} type="button" className={`ih-wdrill__tok${state}`} disabled={hit != null || !!result} aria-pressed={hit === i} onClick={() => tap(i)}>
              {w}
            </button>
          )
        })}
      </div>
      {hit == null && !result && <p className="ih-muted ih-wdrill__note">{t('ieltsWDrill.spot.tap')}</p>}
      {hit === round.wrong && !result && (
        <form className="ih-wdrill__type" onSubmit={submit}>
          <label className="ih-wdrill__note" htmlFor="ih-wdrill-spot">{pickLang(round.fix, lang) || t('ieltsWDrill.spot.fix')}</label>
          <div className="ih-wdrill__actions">
            <input id="ih-wdrill-spot" ref={inputRef} className="ih-gap" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} lang="en" />
            <button type="submit" className="ih-btn2 ih-btn2--primary" disabled={!value.trim()}>{t('ieltsWDrill.check')}</button>
          </div>
        </form>
      )}
    </>
  )
}

/** Отметить ключевые точки графика (TaskVisual в режиме pick): ответ — набор индексов x. */
function PickRound({ round, chart, result, onAnswer }) {
  const { t } = useI18n()
  const [picked, setPicked] = useState(() => new Set())
  const onPick = useCallback(
    (i) => {
      if (result) return
      setPicked((s) => {
        const n = new Set(s)
        if (n.has(i)) n.delete(i)
        else n.add(i)
        return n
      })
    },
    [result],
  )
  if (!chart) return <p className="ih-muted">{t('ieltsReading.loading')}</p>
  return (
    <>
      <DrillVisual chart={chart} pick={{ picked: result ? new Set(result.value) : picked, onPick: result ? null : onPick, marks: result?.marks || {} }} />
      {!result && (
        <div className="ih-wdrill__actions">
          <button type="button" className="ih-btn2 ih-btn2--primary" disabled={!picked.size} onClick={() => onAnswer([...picked].sort((a, b) => a - b))}>{t('ieltsWDrill.check')}</button>
          <span className="ih-muted" aria-live="polite">{t('ieltsWDrill.pick.count', { n: String(picked.size) })}</span>
        </div>
      )}
    </>
  )
}

const CHECK_LABEL = {
  length: (t, c) => t('ieltsWDrill.free.length', { n: String(c.n), min: String(c.min), max: String(c.max) }),
  overlap: (t, c) => t('ieltsWDrill.free.overlap', { pct: String(c.pct) }),
  digits: (t) => t('ieltsWDrill.free.digits'),
  starts: (t, c) => t('ieltsWDrill.free.starts', { list: c.starts.join(' / ') }),
}

function CheckList({ checks }) {
  const { t } = useI18n()
  return (
    <ul className="ih-wdrill__checks">
      {checks.map((c) => (
        <li key={c.key} className={c.ok ? 'is-ok' : 'is-wrong'}>
          <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> {CHECK_LABEL[c.key](t, c)}
        </li>
      ))}
    </ul>
  )
}

/**
 * Своё предложение: под полем — живые автопроверки (длина, совпадение с заданием по 3-словиям, цифры, начало); после
 * «Проверить» — они же итогом, самопроверка по чек-листу (галочки ставит сам ученик) и образец. Дрилл с aiCheck —
 * ещё «Проверить ИИ» (мини-эссе, дневная квота).
 */
function FreeRound({ round, source, result, onAnswer, ctx }) {
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const [ticks, setTicks] = useState({})
  const [ai, setAi] = useState({ status: 'idle' })
  const live = freeChecks(round, text, source)
  const askAi = () => {
    setAi({ status: 'loading' })
    checkMiniEssay(ctx.token, { testId: ctx.drillId, roundId: round.id, text: result.value.text, uiLang: lang })
      .then((r) => setAi({ status: 'ready', r }))
      .catch((e) => setAi({ status: 'error', code: e?.code }))
  }
  return (
    <>
      <textarea
        className="ih-wdrill__free"
        value={result ? result.value.text : text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!result}
        aria-label={t('ieltsWDrill.typeLabel')}
        placeholder={t('ieltsWDrill.free.placeholder')}
        lang="en"
        spellCheck={false}
        rows={4}
      />
      {!result && (
        <>
          <CheckList checks={live} />
          <div className="ih-wdrill__actions">
            <button type="button" className="ih-btn2 ih-btn2--primary" disabled={!text.trim()} onClick={() => onAnswer({ text, taskText: source })}>{t('ieltsWDrill.check')}</button>
          </div>
        </>
      )}
      {result && (
        <div className="ih-wdrill__selfcheck">
          <CheckList checks={result.checks} />
          <b>{t('ieltsWDrill.free.self')}</b>
          <ul className="ih-wdrill__ticks">
            {round.checklist.map((c, i) => (
              <li key={i}>
                <label>
                  <input type="checkbox" checked={!!ticks[i]} onChange={(e) => setTicks((m) => ({ ...m, [i]: e.target.checked }))} /> {pickLang(c, lang)}
                </label>
              </li>
            ))}
          </ul>
          {round.model && (
            <p className="ih-wdrill__model">
              <b>{t('ieltsWDrill.free.model')}</b> <span lang="en">{round.model}</span>
            </p>
          )}
          {ctx.aiCheck && round.id && ctx.drillId && (
            <div className="ih-wdrill__ai">
              {ai.status === 'idle' && <button type="button" className="ih-btn2 ih-btn2--outline" onClick={askAi}>{t('ieltsWDrill.ai.check')}</button>}
              {ai.status === 'loading' && <p className="ih-muted" role="status">{t('ieltsWDrill.ai.loading')}</p>}
              {ai.status === 'error' && <p className="ih-wdrill__fix" role="status">{t(ai.code === 'quota' ? 'ieltsWDrill.ai.quota' : 'ieltsWDrill.ai.error')}</p>}
              {ai.status === 'ready' && (
                <div role="status">
                  <ul className="ih-wdrill__checks">
                    {(ai.r.verdict || []).map((v, i) => (
                      <li key={i} className={v.ok ? 'is-ok' : 'is-wrong'}>
                        <span aria-hidden="true">{v.ok ? '✓' : '✗'}</span> {pickLang(v.item, lang)}
                        {v.note && <span className="ih-muted"> — {v.note}</span>}
                      </li>
                    ))}
                  </ul>
                  {ai.r.summary && <p>{ai.r.summary}</p>}
                  {ai.r.better && (
                    <p className="ih-wdrill__model">
                      <b>{t('ieltsWDrill.ai.better')}</b> <span lang="en">{ai.r.better}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/**
 * Своя страница упражнения (html методиста) в песочнице: без allow-same-origin у неё чужой origin — ни куки, ни
 * хранилища сайта, ни DOM приложения. Итог она шлёт сама: parent.postMessage({ jtsDrill: 'result', score, total }, '*');
 * принимаем только сообщения своего iframe. Нет итога — «Готово», и раунд не идёт в счёт.
 */
function HtmlRound({ round, result, onAnswer }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const answerRef = useRef(onAnswer)
  useEffect(() => {
    answerRef.current = onAnswer
  })
  useEffect(() => {
    if (result) return undefined
    const onMessage = (e) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return
      const d = e.data
      if (d && typeof d === 'object' && d.jtsDrill === 'result') answerRef.current({ score: Number(d.score) || 0, total: Number(d.total) || 0 })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [result])
  return (
    <>
      <iframe ref={ref} className="ih-wdrill__frame" title={t('ieltsWDrill.ask.html')} sandbox="allow-scripts" srcDoc={round.html} style={{ height: Number(round.height) > 0 ? Number(round.height) : 420 }} />
      {!result && (
        <div className="ih-wdrill__actions">
          <button type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onAnswer(null)}>{t('ieltsWDrill.htmlDone')}</button>
        </div>
      )}
    </>
  )
}
