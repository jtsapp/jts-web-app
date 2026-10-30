import { useEffect, useMemo, useRef, useState } from 'react'
import Breadcrumbs from '../../ui/Breadcrumbs.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import { getIeltsTest } from '../../../api.js'
import { loadToken } from '../../../lib/session.js'
import { useI18n } from '../../../i18n.jsx'
import { TimerIcon } from '../../icons.jsx'
import { GAP, LETTERS, buildPass, checkRound, fillGap, pickLang, roundsForTrack, scorePass, validateDrill } from './drillModel.js'
import { recordDrillRun } from './drillProgress.js'
import { sampleDrill } from './sampleDrills.js'

/**
 * Короткая тренировка Writing (дрилл): вступление → раунды по одному с проверкой и объяснением → итог с ошибками и
 * «Ещё раз». Дрилл — документ банка (getIeltsTest), пробный — из sampleDrills.js без запроса. Рисует любой раунд
 * формата drillModel.js одним компонентом; новый дрилл — данные, а не код.
 */
export default function WritingDrillView({ token, drillId, track, onBack, onBackToLearn, onRecorded, rng }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState(() => {
    const s = sampleDrill(drillId)
    return s ? { status: 'ready', doc: s } : { status: 'loading' }
  })
  useEffect(() => {
    if (sampleDrill(drillId)) return undefined
    let alive = true
    getIeltsTest(token || loadToken(), drillId)
      .then((r) => alive && setState({ status: 'ready', doc: r?.document || r }))
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [token, drillId])

  const [run, setRun] = useState({ phase: 'intro', pass: [], idx: 0, results: [] })
  const doc = state.doc
  const problems = useMemo(() => (doc ? validateDrill(doc) : []), [doc])
  const title = doc ? pickLang(doc.name, lang) || doc.title : ''
  const crumbs = [
    { label: t('ieltsHub.tab.learn'), onClick: onBackToLearn },
    { label: 'Writing', onClick: onBack },
    { label: t('ieltsPractice.tab.writing.drills'), onClick: onBack },
    { label: title || t('ieltsPractice.tab.writing.drills') },
  ]

  if (state.status !== 'ready' || problems.length || !roundsForTrack(doc, track).length) {
    return (
      <div className="ih-wdrill">
        <Breadcrumbs items={crumbs} />
        {state.status === 'loading' ? (
          <p className="ih-muted">{t('ieltsReading.loading')}</p>
        ) : (
          <EmptyState icon={<TimerIcon size={28} />} title={t('ieltsReading.errorTitle')} text={state.status === 'error' ? t('ieltsReading.errorText') : t('ieltsWDrill.broken')} />
        )}
      </div>
    )
  }

  const start = () => setRun({ phase: 'run', pass: buildPass(doc, track, rng), idx: 0, results: [] })
  const answer = (value) =>
    setRun((r) => {
      if (r.results[r.idx]) return r
      const results = r.results.slice()
      results[r.idx] = { ...checkRound(r.pass[r.idx].round, value), value }
      return { ...r, results }
    })
  // запись прохода — не в функции-обновлении: StrictMode зовёт её дважды, и проход записался бы два раза
  const next = () => {
    if (run.idx + 1 < run.pass.length) return setRun({ ...run, idx: run.idx + 1 })
    const { score, total } = scorePass(run.results)
    onRecorded?.(recordDrillRun(doc.id, score, total))
    return setRun({ ...run, phase: 'result' })
  }

  return (
    <div className="ih-wdrill">
      <Breadcrumbs items={crumbs} />
      <header className="ih-wdrill__head">
        <h2>{title}</h2>
        <span className="ih-wdrill__meta">
          {doc.sample && <span className="ih-chip ih-chip--orange ih-chip--sm"><span>{t('ieltsWDrill.sample')}</span></span>}
          <span className="ih-muted">{t('ieltsHub.minutes', { n: String(doc.minutes || 5) })}</span>
        </span>
      </header>

      {run.phase === 'intro' && (
        <section className="ih-card ih-wdrill__card">
          {doc.intro && <p>{pickLang(doc.intro, lang)}</p>}
          <p className="ih-muted">{t('ieltsWDrill.introText', { n: String(Math.min(Number(doc.show) > 0 ? Number(doc.show) : Infinity, roundsForTrack(doc, track).length)) })}</p>
          {doc.sample && <p className="ih-muted">{t('ieltsWDrill.sampleNote')}</p>}
          <div className="ih-wdrill__actions">
            <button type="button" className="ih-btn2 ih-btn2--primary" onClick={start}>{t('ieltsWDrill.start')}</button>
          </div>
        </section>
      )}

      {run.phase === 'run' && (
        <section className="ih-card ih-wdrill__card" key={run.idx}>
          <span className="ih-muted">{t('ieltsWDrill.progress', { n: String(run.idx + 1), total: String(run.pass.length) })}</span>
          <DrillRound item={run.pass[run.idx]} asks={doc.asks} result={run.results[run.idx]} onAnswer={answer} />
          {run.results[run.idx] && (
            <div className="ih-wdrill__actions">
              <button type="button" className="ih-btn2 ih-btn2--primary" onClick={next}>
                {run.idx + 1 < run.pass.length ? t('ieltsWDrill.next') : t('ieltsWDrill.finish')}
              </button>
            </div>
          )}
        </section>
      )}

      {run.phase === 'result' && <DrillResult run={run} onAgain={start} onBack={onBack} />}
    </div>
  )
}

function DrillResult({ run, onAgain, onBack }) {
  const { t, lang } = useI18n()
  const { score, total } = scorePass(run.results)
  const wrong = run.pass.map((item, i) => ({ item, res: run.results[i] })).filter((x) => x.res?.correct === false)
  return (
    <section className="ih-card ih-wdrill__card">
      <h3>{total ? t('ieltsWDrill.score', { n: String(score), total: String(total) }) : t('ieltsWDrill.done')}</h3>
      {total > 0 && <p className="ih-muted">{t(score === total ? 'ieltsWDrill.allRight' : 'ieltsWDrill.reviewMistakes')}</p>}
      {wrong.length > 0 && (
        <ul className="ih-wdrill__mistakes">
          {wrong.map(({ item, res }, i) => (
            <li key={i}>
              {item.round.text && <p lang="en">{item.round.kind === 'gap' || item.round.kind === 'type' ? fillGap(item.round.text, res.expected) : item.round.text}</p>}
              {res.expected && item.round.kind !== 'gap' && item.round.kind !== 'type' && <p lang="en"><b>{t('ieltsReading.rightAnswer')}:</b> {res.expected}</p>}
              {item.round.why && <p className="ih-muted">{pickLang(item.round.why, lang)}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="ih-wdrill__actions">
        <button type="button" className="ih-btn2 ih-btn2--primary" onClick={onAgain}>{t('ieltsWDrill.again')}</button>
        <button type="button" className="ih-btn2 ih-btn2--outline" onClick={onBack}>{t('ieltsWDrill.toList')}</button>
      </div>
    </section>
  )
}

/** Один раунд любого вида: вопрос, материал, ответ и — после проверки — вердикт с объяснением. */
export function DrillRound({ item, asks, result, onAnswer }) {
  const { t, lang } = useI18n()
  const { round } = item
  const ask = pickLang(round.ask, lang) || pickLang(asks?.[round.kind], lang) || t(`ieltsWDrill.ask.${round.kind}`)
  return (
    <div className="ih-wdrill__round">
      <h3>{ask}</h3>
      {(round.kind === 'choice' || round.kind === 'gap' || round.kind === 'weak') && <ChoiceRound item={item} result={result} onAnswer={onAnswer} />}
      {round.kind === 'type' && <TypeRound round={round} result={result} onAnswer={onAnswer} />}
      {round.kind === 'sort' && <SortRound item={item} result={result} onAnswer={onAnswer} />}
      {round.kind === 'html' && <HtmlRound round={round} result={result} onAnswer={onAnswer} />}
      {result && <Verdict round={round} result={result} />}
    </div>
  )
}

function Verdict({ round, result }) {
  const { t, lang } = useI18n()
  const why = pickLang(round.why, lang)
  if (result.correct === null) return why ? <div className="ih-fb"><p>{why}</p></div> : null
  const status = result.correct ? 'ok' : 'wrong'
  return (
    <div className={`ih-fb ih-fb--${status}`}>
      <div className="ih-fb__head">
        <b>{t(`ieltsReading.verdict.${status}`)}</b>
        {!result.correct && result.expected && round.kind !== 'sort' && <span>{t('ieltsReading.rightAnswer')}: <b lang="en">{result.expected}</b></span>}
        {result.total > 0 && <span>{t('ieltsWDrill.score', { n: String(result.score), total: String(result.total) })}</span>}
      </div>
      {why && <p>{why}</p>}
    </div>
  )
}

function ChoiceRound({ item, result, onAnswer }) {
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
              <span lang="en">{round.options[oi]}</span>
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
      <p className="ih-wdrill__text" lang="en">
        {before}
        <input className={`ih-gap${result ? (result.correct ? ' is-ok' : ' is-wrong') : ''}`} value={value} onChange={(e) => setValue(e.target.value)} disabled={!!result} aria-label={t('ieltsWDrill.typeLabel')} autoComplete="off" spellCheck={false} />
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
          return (
            <li key={ii} className={`ih-wdrill__sortrow${state}`}>
              <span lang="en">{it.text}</span>
              <span className="ih-q__pills" role="group" aria-label={it.text}>
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
 * Своя страница упражнения (html методиста) в песочнице: без allow-same-origin у неё чужой origin — ни куки, ни
 * хранилища сайта, ни DOM приложения. Итог она шлёт сама: parent.postMessage({ jtsDrill: 'result', score, total }, '*');
 * принимаем только сообщения своего iframe. Нет итога — «Готово», и раунд не идёт в счёт.
 */
function HtmlRound({ round, result, onAnswer }) {
  const { t } = useI18n()
  const ref = useRef(null)
  useEffect(() => {
    if (result) return undefined
    const onMessage = (e) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return
      const d = e.data
      if (d && typeof d === 'object' && d.jtsDrill === 'result') onAnswer({ score: Number(d.score) || 0, total: Number(d.total) || 0 })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [result, onAnswer])
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
