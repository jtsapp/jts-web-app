import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon, CheckCircleIcon, ChevronLeftIcon } from '../../ielts/icons.jsx'
import { NoCircleIcon, StopwatchIcon, TargetIcon, NotesIcon } from '../icons.jsx'
import { pick } from '../model/profile.js'
import { displayWord, matchRound, readGames, saveGame, shortDef, shuffle } from '../model/vocab.js'

const QUIZ_LEN = 10
// время раунда — от отметки старта; вынесено из компонента, чтобы его тело оставалось чистым
const since = (t0) => Date.now() - t0
const fmtMs = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

/**
 * Упражнения словаря (Нет в Figma: адаптация прототипа vocab.js — matchGame, clozeGame, registerGame). Три игры в том
 * порядке, в каком слово учится: «Пары» — узнать (слово к определению, шесть пар на время), «Пропуск» — настоящий тип
 * вопроса SAT (предложение и четыре близких синонима), «Регистр» — фраза как сказали бы и слово, сохраняющее смысл в
 * эссе. Игры НЕ трогают расписание карточек: верный ответ через две минуты после карточки ничего не говорит о том, что
 * слово вспомнится через три недели. Их счёт — на устройстве.
 */
export default function Games({ deck, games }) {
  const { t } = useI18n()
  const [game, setGame] = useState(null)
  const [stats, setStats] = useState(() => readGames())
  const done = (kind, patch) => setStats(saveGame(kind, patch))

  if (game === 'match') return <MatchGame deck={deck} best={stats.match.bestMs} onDone={(ms) => done('match', { plays: stats.match.plays + 1, bestMs: stats.match.bestMs == null ? ms : Math.min(stats.match.bestMs, ms) })} onBack={() => setGame(null)} />
  if (game) {
    const s = stats[game]
    return <QuizGame kind={game} items={games?.[game] || []} onAnswer={(ok) => done(game, { asked: s.asked + 1, correct: s.correct + (ok ? 1 : 0) })} onBack={() => setGame(null)} />
  }

  const line = (k) => {
    if (k === 'match') return stats.match.plays ? t('sat.vg.best', { time: fmtMs(stats.match.bestMs) }) : t('sat.vg.notPlayed')
    const s = stats[k]
    return s.asked ? t('sat.vg.lifetime', { pct: String(Math.round((s.correct / s.asked) * 100)), n: String(s.asked) }) : t('sat.vg.notPlayed')
  }
  return (
    <div className="st-vg">
      <div className="st-vg__cards">
        {[['match', StopwatchIcon], ['cloze', NotesIcon], ['register', TargetIcon]].map(([k, Icon]) => (
          <button key={k} type="button" className="st-card st-vg__card" onClick={() => setGame(k)}>
            <span className="st-vg__icon"><Icon size={22} /></span>
            <b>{t(`sat.vg.${k}`)}</b>
            <span>{t(`sat.vg.${k}Desc`)}</span>
            <small>{line(k)}</small>
          </button>
        ))}
      </div>
      <p className="st-muted">{t('sat.vg.noSchedule')}</p>
    </div>
  )
}

function GameHead({ title, lead, extra, onBack }) {
  const { t } = useI18n()
  return (
    <div className="st-vg__head">
      <button type="button" className="ih-round" aria-label={t('sat.vg.back')} title={t('sat.vg.back')} onClick={onBack}><ChevronLeftIcon size={20} /></button>
      <div>
        <h3>{title}</h3>
        <p className="st-muted">{lead}</p>
      </div>
      <span className="st-spacer" />
      {extra}
    </div>
  )
}

/** «Пары»: нажмите слово, затем его определение. Шесть пар, секундомер; промах подсвечивается и сбрасывается. */
function MatchGame({ deck, best, onDone, onBack }) {
  const { t } = useI18n()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000) + 1)
  const round = useMemo(() => matchRound(deck, seed), [deck, seed])
  const [picked, setPicked] = useState(null)
  const [solved, setSolved] = useState([])
  const [miss, setMiss] = useState(null)
  const [ms, setMs] = useState(0)
  const [result, setResult] = useState(null)
  const start = useRef(0)

  useEffect(() => {
    start.current = Date.now()
    const id = setInterval(() => setMs(since(start.current)), 250)
    return () => clearInterval(id)
  }, [seed])

  const tryDef = (id) => {
    if (!picked || solved.includes(id)) return
    if (picked === id) {
      const next = [...solved, id]
      setSolved(next)
      setPicked(null)
      if (next.length === round.words.length) {
        const time = since(start.current)
        setResult(time)
        onDone(time)
      }
    } else {
      setMiss(id)
      setTimeout(() => setMiss(null), 420)
      setPicked(null)
    }
  }
  const again = () => {
    setSeed((s) => s + 1)
    setSolved([])
    setPicked(null)
    setResult(null)
    setMs(0)
  }

  if (round.words.length < 2) return <p className="st-muted">{t('sat.vg.noWords')}</p>
  return (
    <div className="st-card st-vg__game">
      <GameHead title={t('sat.vg.match')} lead={t('sat.vg.matchLead')} onBack={onBack}
        extra={<span className="st-vg__clock"><StopwatchIcon size={18} />{fmtMs(result ?? ms)}</span>} />
      {result != null ? (
        <div className="st-vg__done">
          <CheckCircleIcon size={28} />
          <b>{t('sat.vg.matchDone', { time: fmtMs(result) })}</b>
          {best != null && <span className="st-muted">{t('sat.vg.best', { time: fmtMs(Math.min(best, result)) })}</span>}
          <button type="button" className="ih-cta" onClick={again}>{t('sat.vg.again')}</button>
        </div>
      ) : (
        <div className="st-vg__match">
          <div className="st-vg__col">
            {round.words.map((w) => (
              <button key={w.id} type="button" className={`st-vg__tile ${picked === w.id ? 'is-on' : ''} ${solved.includes(w.id) ? 'is-done' : ''}`}
                disabled={solved.includes(w.id)} onClick={() => setPicked(w.id)}>
                {displayWord(w.word)}
              </button>
            ))}
          </div>
          <div className="st-vg__col">
            {round.defs.map((w) => (
              <button key={w.id} type="button" className={`st-vg__tile is-def ${solved.includes(w.id) ? 'is-done' : ''} ${miss === w.id ? 'is-miss' : ''}`}
                disabled={solved.includes(w.id)} onClick={() => tryDef(w.id)}>
                {shortDef(w)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** «Пропуск» и «Регистр»: десять вопросов, четыре слова, после ответа — почему не подходят остальные. */
function QuizGame({ kind, items, onAnswer, onBack }) {
  const { t, lang } = useI18n()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000) + 1)
  const set = useMemo(() => shuffle(items, seed).slice(0, QUIZ_LEN).map((it, i) => ({ ...it, options: shuffle(it.options, seed + i + 1) })), [items, seed])
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [right, setRight] = useState(0)
  const [over, setOver] = useState(false)

  if (!set.length) return <p className="st-muted">{t('sat.vg.noItems')}</p>
  const it = set[i]
  const choose = (o) => {
    if (chosen) return
    setChosen(o)
    const ok = o === it.answer
    if (ok) setRight((r) => r + 1)
    onAnswer(ok)
  }
  const next = () => {
    if (i + 1 >= set.length) setOver(true)
    else {
      setI(i + 1)
      setChosen(null)
    }
  }
  const again = () => {
    setSeed((s) => s + 1)
    setI(0)
    setChosen(null)
    setRight(0)
    setOver(false)
  }

  return (
    <div className="st-card st-vg__game">
      <GameHead title={t(`sat.vg.${kind}`)} lead={t(`sat.vg.${kind}Lead`)} onBack={onBack}
        extra={!over && <span className="st-vg__clock">{t('sat.vg.progress', { n: String(i + 1), total: String(set.length) })}</span>} />
      {over ? (
        <div className="st-vg__done">
          <TargetIcon size={28} />
          <b>{t('sat.vg.score', { correct: String(right), total: String(set.length) })}</b>
          <button type="button" className="ih-cta" onClick={again}>{t('sat.vg.again')}</button>
        </div>
      ) : (
        <div key={it.id} className="st-vg__quiz ih-enter">
          {kind === 'register' ? (
            <div className="st-vg__reg">
              <p><small>{t('sat.vg.casual')}</small>{it.casual}</p>
              <p><small>{t('sat.vg.formal')}</small>{it.formal}</p>
            </div>
          ) : (
            <p className="st-vg__sentence">{it.sentence}</p>
          )}
          <div className="st-vg__opts">
            {it.options.map((o) => {
              const state = chosen ? (o === it.answer ? 'is-right' : o === chosen ? 'is-wrong' : '') : ''
              return (
                <button key={o} type="button" className={`st-vg__opt ${state}`} disabled={!!chosen} onClick={() => choose(o)}>
                  {displayWord(o)}
                  {state === 'is-right' && <CheckCircleIcon size={18} />}
                  {state === 'is-wrong' && <NoCircleIcon size={18} />}
                </button>
              )
            })}
          </div>
          {chosen && (
            <div className={`st-vg__note ${chosen === it.answer ? 'is-right' : 'is-wrong'}`}>
              <b>{chosen === it.answer ? t('sat.vg.right') : t('sat.vg.wrong', { word: displayWord(it.answer) })}</b>
              <p>{pick(it.note, lang)}</p>
              <button type="button" className="ih-cta" onClick={next}>{i + 1 >= set.length ? t('sat.vg.finish') : t('sat.vg.next')}<ArrowForwardIcon size={18} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
