import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { addSatVocabWord, deleteSatVocabWord, getSatVocab, gradeSatVocab, setSatVocabGoal } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { PlusIcon } from '../icons.jsx'
import Flashcards from '../vocab/Flashcards.jsx'
import WordList from '../vocab/WordList.jsx'
import Games from '../vocab/Games.jsx'
import AddWordDialog from '../vocab/AddWordDialog.jsx'
import { GOALS, buildDeck, counts, displayWord, queue, status } from '../model/vocab.js'
import { errorText } from '../../lib/examQuota.js'

const VIEWS = ['cards', 'words', 'games']

/**
 * «Словарь» (Figma SAT 18): карточки SM-2 по колоде JTS (514 слов) и своим словам, дневная цель, «Мои слова» и
 * кнопка «+ Слово». Колода — статика (public/sat/vocab/deck.json), расписание и свои слова — на сервере
 * (/mobile/sat/vocab), очередь дня считает экран. Третья вкладка — упражнения (Нет в Figma, адаптация прототипа).
 */
export default function VocabTab() {
  const { t } = useI18n()
  const token = loadToken()
  const [view, setView] = useState('cards')
  const [base, setBase] = useState(null)
  const [games, setGames] = useState(null)
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  // «сейчас» очереди: фиксируется при каждой оценке, а не на каждом рендере — иначе очередь пересобиралась бы сама
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    fetch('/sat/vocab/deck.json').then((r) => r.json()).then((d) => alive && setBase(d.cards)).catch(() => alive && setError(t('sat.study.netError')))
    fetch('/sat/vocab/games.json').then((r) => r.json()).then((d) => alive && setGames(d)).catch(() => {})
    getSatVocab(token).then((s) => alive && setState(s)).catch((e) => alive && setError(errorText(e, t)))
    return () => {
      alive = false
    }
  }, [token, t])

  // карточка «Снова» возвращается через 10 минут — раз в минуту сверяем очередь с часами, а не только после оценки
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const deck = useMemo(() => (base ? buildDeck(base, state?.custom || []) : []), [base, state])
  const cards = useMemo(() => state?.cards || {}, [state])
  const q = useMemo(() => (state ? queue(deck, cards, state.goal, state.today, now) : { items: [], due: 0, fresh: 0 }), [deck, cards, state, now])
  const c = useMemo(() => counts(deck, cards, now), [deck, cards, now])

  const grade = useCallback(async (wordId, g) => {
    setBusy(true)
    setError(null)
    try {
      const card = await gradeSatVocab(token, wordId, g)
      setState((s) => ({ ...s, today: s.today + 1, cards: { ...s.cards, [wordId]: card } }))
      setNow(Date.now())
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }, [token, t])

  const goal = async (n) => {
    setBusy(true)
    try {
      setState(await setSatVocabGoal(token, n))
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }

  const add = async (f) => {
    setBusy(true)
    setAddError(null)
    try {
      const w = await addSatVocabWord(token, f)
      setState((s) => ({ ...s, custom: [w, ...s.custom] }))
      setAdding(false)
    } catch (e) {
      setAddError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await deleteSatVocabWord(token, id)
      setState((s) => {
        const rest = { ...s.cards }
        delete rest[id]
        return { ...s, custom: s.custom.filter((w) => w.id !== id), cards: rest }
      })
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setBusy(false)
    }
  }

  if (!base || !state) return error ? <p className="st-error" role="alert">{error}</p> : null
  const mine = deck.filter((w) => w.own).slice(0, 3)

  return (
    <div className="st-vocab">
      <div className="st-vocab__bar">
        <div className="ih-seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>{t(`sat.vocab.view.${v}`)}</button>
          ))}
        </div>
        <span className="st-spacer" />
        <span className="st-vc__status is-new">{t('sat.vc.cnt.new', { n: String(c.new) })}</span>
        <span className="st-vc__status is-learning">{t('sat.vc.cnt.learning', { n: String(c.learning) })}</span>
        <span className="st-vc__status is-mastered">{t('sat.vc.cnt.mastered', { n: String(c.mastered) })}</span>
      </div>
      {error && <p className="st-error" role="alert">{error}</p>}

      {view === 'cards' && (
        <div className="st-vocab__grid">
          <Flashcards key={q.items[0]?.id || 'none'} q={q} cards={cards} goal={state.goal} today={state.today} busy={busy} onGrade={grade} />
          <aside className="st-vocab__side">
            <section className="st-card st-vocab__goal">
              <h3>{t('sat.vc.goal')}</h3>
              <div className="ih-seg" role="radiogroup" aria-label={t('sat.vc.goal')}>
                {GOALS.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={state.goal === n} className={state.goal === n ? 'is-on' : ''} disabled={busy} onClick={() => goal(n)}>{n}</button>
                ))}
              </div>
              <p className="st-muted">{t('sat.vc.goalNote')}</p>
            </section>
            <section className="st-card st-vocab__mine">
              <div className="st-vocab__mineHead">
                <h3>{t('sat.vocab.view.words')}</h3>
                <button type="button" className="st-vocab__plus" aria-label={t('sat.wl.add')} title={t('sat.wl.add')} onClick={() => setAdding(true)}><PlusIcon size={18} /></button>
              </div>
              {mine.length === 0 ? <p className="st-muted">{t('sat.vc.mineEmpty')}</p> : (
                <ul>
                  {mine.map((w) => {
                    const s = status(cards[w.id])
                    return (
                      <li key={w.id}>
                        <div><b>{displayWord(w.word)}</b><small>{w.definition}</small></div>
                        <span className={`st-vc__status is-${s}`}>{t(`sat.vc.st.${s}`)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              <button type="button" className="st-link" onClick={() => setView('words')}>{t('sat.vc.allWords')}<ArrowForwardIcon size={14} /></button>
            </section>
          </aside>
        </div>
      )}
      {view === 'words' && <WordList deck={deck} cards={cards} now={now} busy={busy} onAdd={() => setAdding(true)} onRemove={remove} />}
      {view === 'games' && <Games deck={deck} games={games} />}

      <button type="button" className="st-vocab__fab" onClick={() => setAdding(true)}><PlusIcon size={18} />{t('sat.vc.fab')}</button>
      {adding && <AddWordDialog busy={busy} error={addError} onSave={add} onClose={() => { setAdding(false); setAddError(null) }} />}
    </div>
  )
}
