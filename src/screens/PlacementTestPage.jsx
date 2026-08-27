'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Shell from '../components/Shell.jsx'
import {
  loadPlacementBank,
  createPlacementSession,
  audioUrl,
} from '../practice/placement/engine.js'
import {
  vocabDraw,
  seededShuffle,
  scoreTfns,
  scoreOrderWords,
  scoreBankfill,
  scoreMatch,
} from '../practice/placement/engine.generated.js'
import { T } from '../practice/placement/strings.js'
import { placementLevel } from '../lib/placement.js'

// Тест на определение уровня. Расчёты — перенесённый движок школы
// (practice/placement/engine.generated.js, сверен с бандлом в
// placementParity.test.js), здесь только экран в оформлении приложения.
//
// Ход теста повторяет бандл: самооценка задаёт стартовую θ, разделы идут по
// очереди с экраном-объяснением перед каждым, внутри раздела ответы можно
// менять до кнопки «Завершить раздел», таймера нет. Аудирование собирает все
// вопросы одной записи на одном экране (см. introListening) — остальные
// разделы идут по одному заданию на экран.

const CANDO_KEYS = ['cando0', 'cando1', 'cando2', 'cando3', 'cando4']

export default function PlacementTestPage({ lang = 'ru', onLevel, onDone }) {
  const t = useCallback((k) => T(lang, k), [lang])
  const [phase, setPhase] = useState('loading') // loading | error | variant | cando | intro | items | vocab | writing | result
  const [data, setData] = useState(null)
  const [plan, setPlan] = useState([])
  const [secIdx, setSecIdx] = useState(0)
  // Экран раздела: {kind:'item', item, text?} или {kind:'group', src, items}
  const [screens, setScreens] = useState([])
  const [pos, setPos] = useState(0)
  const [drafts, setDrafts] = useState({})
  const [lexWords, setLexWords] = useState([])
  const [lexPicked, setLexPicked] = useState({})
  const [result, setResult] = useState(null)
  const sess = useRef(null)
  const startedAt = useRef(0)

  useEffect(() => {
    let alive = true
    loadPlacementBank().then((d) => {
      if (!alive) return
      if (!d) return setPhase('error')
      setData(d)
      setPhase('variant')
    })
    return () => {
      alive = false
    }
  }, [])

  // Отсчёт времени на задание — в эффекте: Date.now() во время рендера сделал
  // бы его нечистым, а число уходит в лог для калибровки банка.
  useEffect(() => {
    if (phase === 'items' || phase === 'writing') startedAt.current = Date.now()
  }, [phase, pos])

  const buildPlan = (s) => {
    const out = [
      { key: 'routing', title: t('blockRouting'), hint: t('introRouting') },
      { key: 'minpair', title: t('blockMinpair'), hint: t('introMinpair') },
      { key: 'listening', title: t('blockListening'), hint: t('introListening') },
    ]
    if (s.cfg.clips) out.push({ key: 'clip', title: t('skillClips'), hint: t('introClips') })
    out.push(
      { key: 'vocab', title: t('blockVocab'), hint: t('introVocab') },
      { key: 'reading', title: t('blockReading'), hint: t('introReading') },
      { key: 'uoe', title: t('blockUoe'), hint: t('introUoe') },
      { key: 'writing', title: t('blockWriting'), hint: t('introWriting') },
    )
    return out
  }

  const startVariant = (v) => {
    const s = createPlacementSession(data, v)
    sess.current = s
    setPlan(buildPlan(s))
    setPhase('cando')
  }

  const pickCando = (idx) => {
    sess.current.setCanDo(idx)
    setSecIdx(0)
    setPhase('intro')
  }

  const openSection = (i) => {
    const sec = plan[i]
    if (!sec) return finish()
    const s = sess.current
    let next = []

    if (sec.key === 'vocab') {
      s.lex = { items: vocabDraw(data.vocab, s.theta0, s.rnd) }
      setLexWords(s.lex.items)
      setLexPicked({})
      return setPhase('vocab')
    }
    if (sec.key === 'writing') {
      const item = s.pick(s.itemsOf('writing', null))
      setScreens(item ? [{ kind: 'item', item }] : [])
      setDrafts({})
      return setPhase(item ? 'writing' : 'result')
    }
    if (sec.key === 'listening') {
      // Все вопросы одной записи — на одном экране, как в бандле.
      const L = s.buildListening()
      next = L.sources
        .map((id) => ({
          kind: 'group',
          src: (data.manifest.sources || []).find((m) => m.id === id) || { id },
          items: L.items.filter((it) => it.source === id),
        }))
        .filter((g) => g.items.length)
    } else if (sec.key === 'reading') {
      // К каждому вопросу прикладывается его текст (сворачиваемый).
      const R = s.buildReading()
      next = R.items.map((item) => ({
        kind: 'item',
        item,
        text: R.texts.find((x) => x.id === item.source) || null,
      }))
    } else if (sec.key === 'routing') next = s.buildRouting().map((item) => ({ kind: 'item', item }))
    else if (sec.key === 'minpair') next = s.buildMinpairs().map((item) => ({ kind: 'item', item }))
    else if (sec.key === 'clip') next = s.buildClips().map((item) => ({ kind: 'item', item }))
    else if (sec.key === 'uoe')
      next = [...s.buildUoeBatch(s.cfg.uoe), ...s.buildInteractive()].map((item) => ({ kind: 'item', item }))

    if (!next.length) return openSection(i + 1) // раздела нет в этом варианте
    setScreens(next)
    setPos(0)
    setDrafts({})
    setPhase('items')
  }

  // Ответил ли студент на задание (для блокировки «Далее»).
  const isAnswered = (item) => {
    const d = drafts[item.id]
    if (!d) return false
    if (item.type === 'tfns') return item.statements.every((_, k) => d.answers?.[k])
    if (item.type === 'order' && item.steps) return (d.seq || []).length === item.steps.length
    if (item.type === 'order') return (d.arr || []).length === orderWordsOf(item).length
    if (item.type === 'bankfill') return (d.gaps || []).filter(Boolean).length === item.answers.length
    if (item.type === 'match') return (d.map || []).filter((x) => x != null).length === item.pairs.length
    return d.optIndex != null || !!(d.text || '').trim() || d.fraction != null
  }
  const screenAnswered = (sc) => (sc.kind === 'group' ? sc.items.every(isAnswered) : isAnswered(sc.item))

  // Сдача ответа в движок — теми же score-функциями, что и бандл.
  const submitItem = (s, item) => {
    const d = drafts[item.id] || {}
    if (item.type === 'tfns') return s.answerGraded(item, scoreTfns(item, d.answers || []), { answers: d.answers || [], playsUsed: d.plays || 1 })
    if (item.type === 'order' && item.steps) return s.answerGraded(item, scoreOrderWords(item.steps, d.seq || []), { seq: d.seq || [], playsUsed: d.plays || 1 })
    if (item.type === 'order') return s.answerGraded(item, scoreOrderWords(orderWordsOf(item), d.arr || []), { built: (d.arr || []).join(' ') })
    if (item.type === 'bankfill') return s.answerGraded(item, scoreBankfill(item, d.gaps || []), { gaps: (d.gaps || []).slice() })
    if (item.type === 'match') return s.answerGraded(item, scoreMatch(item, d.map || []), { map: (d.map || []).slice() })
    if (d.fraction != null) return s.answerGraded(item, d.fraction, { playsUsed: d.plays || 1 })
    return s.answer(item, { optIndex: d.optIndex ?? null, text: d.text || '', tMs: d.tMs || 0, shownOrder: d.shownOrder || null })
  }

  const finishSection = () => {
    const s = sess.current
    for (const sc of screens) {
      const list = sc.kind === 'group' ? sc.items : [sc.item]
      for (const item of list) submitItem(s, item)
    }
    const next = secIdx + 1
    setSecIdx(next)
    if (next >= plan.length) return finish()
    setPhase('intro')
  }

  const finishVocab = () => {
    sess.current.finishVocab(lexWords.map((_, i) => (lexPicked[i] ? 1 : 0)))
    const next = secIdx + 1
    setSecIdx(next)
    if (next >= plan.length) return finish()
    setPhase('intro')
  }

  const finishWriting = () => {
    const item = screens[0]?.item
    if (item) sess.current.answerWriting(item, drafts[item.id]?.text || '')
    finish()
  }

  const finish = () => {
    const r = sess.current.result()
    setResult(r)
    setPhase('result')
    // Уровень проверяем перед тем, как отдать наружу: это единственное поле,
    // которое уезжает в профиль студента и определяет весь его контент.
    const level = placementLevel(r)
    if (level) onLevel?.(level, r)
  }

  // ─── служебные экраны ───────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'error') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card plc-card--center">
            {phase === 'loading' ? (
              <>
                <div className="spinner" />
                <p className="plc-hint">Загружаем тест…</p>
              </>
            ) : (
              <p className="form-error">Не удалось загрузить тест. Обновите страницу.</p>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'variant') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card">
            <h1 className="plc-h1">{t('variantChoose')}</h1>
            <div className="plc-list">
              {['express', 'full'].map((v) => (
                <button key={v} type="button" className="plc-opt plc-opt--wide" onClick={() => startVariant(v)}>
                  <span className="plc-opt__main">
                    <b>{t(v === 'express' ? 'variantExpress' : 'variantFull')}</b>
                    <span className="plc-opt__sub">{t(v === 'express' ? 'variantExpressD' : 'variantFullD')}</span>
                  </span>
                  <span className="plc-opt__time">{t(v === 'express' ? 'variantExpressT' : 'variantFullT')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'cando') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card">
            <h1 className="plc-h1">{t('cando')}</h1>
            <p className="plc-hint">{t('candoHint')}</p>
            <div className="plc-list">
              {CANDO_KEYS.map((k, i) => (
                <button key={k} type="button" className="plc-opt" onClick={() => pickCando(i)}>
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'intro') {
    const sec = plan[secIdx]
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card plc-card--center">
            <div className="plc-step">{secIdx + 1} / {plan.length}</div>
            <h1 className="plc-h1">{sec.title}</h1>
            {sec.hint && <p className="plc-hint">{sec.hint}</p>}
            <button className="plc-primary" onClick={() => openSection(secIdx)}>
              {t('startSection')}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'vocab') {
    const picked = Object.values(lexPicked).filter(Boolean).length
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card">
            <h1 className="plc-h1">{t('blockVocab')}</h1>
            <p className="plc-hint">{t('introVocab')}</p>
            <div className="plc-lex">
              {lexWords.map((w, i) => (
                <button
                  key={w.w + i}
                  type="button"
                  className={`plc-lexw ${lexPicked[i] ? 'on' : ''}`}
                  aria-pressed={!!lexPicked[i]}
                  onClick={() => setLexPicked((p) => ({ ...p, [i]: !p[i] }))}
                >
                  {w.w}
                </button>
              ))}
            </div>
            <div className="plc-foot">
              <span className="plc-count">{picked} / {lexWords.length}</span>
              <button className="plc-primary" onClick={finishVocab}>{t('finishSection')}</button>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'writing') {
    const item = screens[0]?.item
    const text = drafts[item?.id]?.text || ''
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card">
            <h1 className="plc-h1">{t('blockWriting')}</h1>
            <p className="plc-hint">{item?.stem}</p>
            <textarea
              className="plc-textarea"
              rows={7}
              value={text}
              onChange={(e) => setDrafts({ [item.id]: { text: e.target.value } })}
            />
            <div className="plc-foot">
              <span className="plc-count">{text.trim().split(/\s+/).filter(Boolean).length} слов</span>
              <button className="plc-primary" onClick={finishWriting}>{t('finishSection')}</button>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'result' && result) {
    return <PlacementResult result={result} lang={lang} onDone={() => onDone?.(placementLevel(result), result)} />
  }

  // ─── экраны раздела ─────────────────────────────────────────────────────
  const screen = screens[pos]
  const sec = plan[secIdx]
  const draftFor = (item) => drafts[item.id] || {}
  const setDraftFor = (item) => (patch) =>
    setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], ...patch, tMs: Date.now() - startedAt.current } }))
  const answered = screen ? screenAnswered(screen) : false

  return (
    <Shell>
      <div className="plc">
        <div className="plc-card">
          <div className="plc-top">
            <span className="plc-step">{sec?.title}</span>
            <span className="plc-count">{pos + 1} / {screens.length}</span>
          </div>
          <div className="plc-bar"><div className="plc-bar__fill" style={{ width: `${((pos + 1) / screens.length) * 100}%` }} /></div>

          {screen?.kind === 'group' ? (
            <ListeningGroup key={screen.src.id} group={screen} draftFor={draftFor} setDraftFor={setDraftFor} lang={lang} />
          ) : (
            <>
              {screen?.text && (
                <details className="plc-rtext" open>
                  <summary>{t('readText')}</summary>
                  <div className="plc-rtext__body">{screen.text.text}</div>
                </details>
              )}
              {screen && (
                <QuestionBody item={screen.item} draft={draftFor(screen.item)} setDraft={setDraftFor(screen.item)} lang={lang} />
              )}
            </>
          )}

          <div className="plc-foot">
            <button className="plc-ghost" disabled={pos === 0} onClick={() => setPos((p) => p - 1)}>
              {t('back')}
            </button>
            {pos < screens.length - 1 ? (
              <button className="plc-primary" disabled={!answered} onClick={() => setPos((p) => p + 1)}>
                {t('next')}
              </button>
            ) : (
              <button className="plc-primary" disabled={!answered} onClick={finishSection}>
                {t('finishSection')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}

// Слова для сборки предложения: эталон — ответ без финальной точки (так его
// сравнивает scoreOrderWords в движке).
function orderWordsOf(item) {
  return item.answer.replace(/\.$/, '').split(' ')
}

// ─── аудирование: запись + все её вопросы на одном экране ────────────────
function ListeningGroup({ group, draftFor, setDraftFor, lang }) {
  const [plays, setPlays] = useState(0)
  const ref = useRef(null)
  const max = group.src.playsAllowed || 2
  return (
    <>
      <audio ref={ref} src={audioUrl(group.src.file)} preload="none" />
      <button
        className="plc-audio"
        disabled={plays >= max}
        onClick={() => {
          setPlays((p) => p + 1)
          // Число прослушиваний уходит в лог каждого вопроса записи.
          group.items.forEach((item) => setDraftFor(item)({ plays: plays + 1 }))
          ref.current?.play().catch(() => {})
        }}
      >
        {T(lang, 'play')} <span className="plc-plays">{max - plays}</span>
      </button>
      {group.items.map((item, k) => (
        <div key={item.id} className="plc-q">
          <QuestionBody item={item} n={k + 1} draft={draftFor(item)} setDraft={setDraftFor(item)} lang={lang} />
        </div>
      ))}
    </>
  )
}

// ─── тело задания по типу ────────────────────────────────────────────────
function QuestionBody({ item, n, draft, setDraft, lang }) {
  // Порядок вариантов перемешивается один раз на задание: иначе он менялся бы
  // на каждый рендер, и студент терял бы уже выбранный ответ из виду. Хук
  // стоит до любых ранних выходов — порядок хуков обязан совпадать.
  const order = useMemo(() => {
    if (!item?.options?.length) return []
    const idx = item.options.map((_, i) => i)
    return item.fixedOrder ? idx : seededShuffle(idx, Math.random)
  }, [item])

  if (!item) return null
  const num = n ? `${n}. ` : ''

  if (item.type === 'tfns') return <Tfns item={item} n={n} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'order' && item.steps) return <OrderSteps item={item} n={n} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'order') return <OrderWords item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'bankfill') return <Bankfill item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'match') return <MatchPairs item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.block === 'minpair') return <MinPair item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.block === 'clip') return <Clip item={item} draft={draft} setDraft={setDraft} order={order} lang={lang} />

  if (item.options?.length) {
    return (
      <>
        {item.stem && <p className="plc-stem">{num}{item.stem}</p>}
        <div className="plc-list">
          {order.map((oi) => (
            <button
              key={oi}
              type="button"
              className={`plc-opt ${draft.optIndex === oi ? 'on' : ''}`}
              onClick={() => setDraft({ optIndex: oi, shownOrder: order })}
            >
              {item.options[oi].t}
            </button>
          ))}
        </div>
      </>
    )
  }

  // Открытый ответ: cloze_open, wform, transform, open_short.
  return (
    <>
      <p className="plc-stem">{num}{item.stem}</p>
      {item.keyword && <p className="plc-hint">{item.keyword}</p>}
      <input
        className="plc-input"
        value={draft.text || ''}
        onChange={(e) => setDraft({ text: e.target.value })}
        autoComplete="off"
        spellCheck="false"
        aria-label="answer"
      />
    </>
  )
}

// Верно / Неверно / Не сказано — строка на каждое утверждение.
function Tfns({ item, n, draft, setDraft, lang }) {
  const answers = draft.answers || []
  const set = (k, v) => {
    const next = answers.slice()
    next[k] = v
    setDraft({ answers: next })
  }
  return (
    <>
      <p className="plc-stem">{n ? `${n}. ` : ''}{T(lang, 'tfnsHint')}</p>
      {item.statements.map((st, k) => (
        <div key={k} className="plc-tf">
          <span className="plc-tf__text">{st.t}</span>
          <span className="plc-tf__btns">
            {['T', 'F', 'NS'].map((v) => (
              <button
                key={v}
                type="button"
                className={`plc-tf__btn ${answers[k] === v ? 'on' : ''}`}
                onClick={() => set(k, v)}
              >
                {T(lang, v === 'T' ? 'tfT' : v === 'F' ? 'tfF' : 'tfNS')}
              </button>
            ))}
          </span>
        </div>
      ))}
    </>
  )
}

// События записи в услышанном порядке: клик добавляет в последовательность,
// повторный клик — убирает.
function OrderSteps({ item, n, draft, setDraft, lang }) {
  const shuffled = useMemo(() => seededShuffle(item.steps.slice(), Math.random), [item])
  const seq = draft.seq || []
  return (
    <>
      <p className="plc-stem">{n ? `${n}. ` : ''}{item.stem || T(lang, 'orderSeqHint')}</p>
      <div className="plc-list">
        {shuffled.map((step) => {
          const at = seq.indexOf(step)
          return (
            <button
              key={step}
              type="button"
              className={`plc-opt ${at >= 0 ? 'on' : ''}`}
              onClick={() =>
                setDraft({ seq: at >= 0 ? seq.filter((x) => x !== step) : [...seq, step] })
              }
            >
              {at >= 0 && <b className="plc-seqn">{at + 1}</b>}{step}
            </button>
          )
        })}
      </div>
    </>
  )
}

// Сборка предложения из слов (интерактивная грамматика).
function OrderWords({ item, draft, setDraft, lang }) {
  const words = useMemo(() => seededShuffle(orderWordsOf(item), Math.random), [item])
  const arr = draft.arr || []
  return (
    <>
      <p className="plc-stem">{T(lang, 'orderHint')}</p>
      <div className="plc-slots">
        {arr.length ? (
          arr.map((w, k) => (
            <button
              key={w + k}
              type="button"
              className="plc-tile on"
              onClick={() => setDraft({ arr: arr.filter((_, j) => j !== k) })}
            >
              {w}
            </button>
          ))
        ) : (
          <span className="plc-slots__empty">{T(lang, 'orderYour')}</span>
        )}
      </div>
      <div className="plc-bank">
        {words.map((w, i) => {
          // Повторяющиеся слова различаем позицией: i-я копия слова занята,
          // когда в собранном уже лежит не меньше копий, чем её номер.
          const copyNo = words.slice(0, i + 1).filter((x) => x === w).length
          const used = arr.filter((x) => x === w).length >= copyNo
          return (
            <button
              key={w + i}
              type="button"
              className={`plc-tile ${used ? 'used' : ''}`}
              disabled={used}
              onClick={() => setDraft({ arr: [...arr, w] })}
            >
              {w}
            </button>
          )
        })}
      </div>
      {arr.length > 0 && (
        <button className="plc-ghost plc-reset" onClick={() => setDraft({ arr: [] })}>{T(lang, 'reset')}</button>
      )}
    </>
  )
}

// Заполнение пропусков словами из набора: слово встаёт в первый пустой
// пропуск, клик по заполненному пропуску освобождает его.
function Bankfill({ item, draft, setDraft, lang }) {
  const gaps = draft.gaps || []
  const parts = useMemo(() => item.text.split(/__(\d)__/), [item])
  const put = (w) => {
    const next = gaps.slice()
    const free = item.answers.findIndex((_, k) => !next[k])
    if (free < 0) return
    next[free] = w
    setDraft({ gaps: next })
  }
  const clear = (k) => {
    const next = gaps.slice()
    next[k] = undefined
    setDraft({ gaps: next })
  }
  return (
    <>
      <p className="plc-stem">{T(lang, 'bankfillHint')}</p>
      <p className="plc-bftext">
        {parts.map((part, i) =>
          i % 2 === 0 ? (
            <span key={i}>{part}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={`plc-gap ${gaps[+part - 1] ? 'on' : ''}`}
              onClick={() => clear(+part - 1)}
            >
              {gaps[+part - 1] || part}
            </button>
          ),
        )}
      </p>
      <div className="plc-bank">
        {item.bankWords.map((w, i) => {
          const copyNo = item.bankWords.slice(0, i + 1).filter((x) => x === w).length
          const used = gaps.filter((x) => x === w).length >= copyNo
          return (
            <button
              key={w + i}
              type="button"
              className={`plc-tile ${used ? 'used' : ''}`}
              disabled={used}
              onClick={() => put(w)}
            >
              {w}
            </button>
          )
        })}
      </div>
    </>
  )
}

// Соединение пар: элемент слева, затем его пара справа.
function MatchPairs({ item, draft, setDraft, lang }) {
  const [sel, setSel] = useState(null)
  const rights = useMemo(() => seededShuffle(item.pairs.map((_, i) => i), Math.random), [item])
  const map = draft.map || []
  const pickRight = (ri) => {
    if (sel == null) return
    const next = map.slice()
    // Правая часть одна на связь: выбор снимает её с прежней левой.
    const prev = next.indexOf(ri)
    if (prev >= 0) next[prev] = undefined
    next[sel] = ri
    setDraft({ map: next })
    setSel(null)
  }
  return (
    <>
      <p className="plc-stem">{T(lang, 'matchHint')}</p>
      <div className="plc-match">
        <div className="plc-match__col">
          {item.pairs.map(([l], i) => (
            <button
              key={i}
              type="button"
              className={`plc-opt ${sel === i ? 'sel' : ''} ${map[i] != null ? 'on' : ''}`}
              onClick={() => setSel(i === sel ? null : i)}
            >
              {map[i] != null && <b className="plc-seqn">{rights.indexOf(map[i]) + 1}</b>}{l}
            </button>
          ))}
        </div>
        <div className="plc-match__col">
          {rights.map((ri, k) => (
            <button
              key={ri}
              type="button"
              className={`plc-opt ${map.includes(ri) ? 'on' : ''}`}
              onClick={() => pickRight(ri)}
            >
              <b className="plc-seqn">{k + 1}</b>{item.pairs[ri][1]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// Видеоклип с вариантами: лимит воспроизведений, как в бандле.
function Clip({ item, draft, setDraft, order, lang }) {
  const [plays, setPlays] = useState(0)
  const ref = useRef(null)
  const max = item.playsAllowed || 2
  return (
    <>
      {item.stem && <p className="plc-stem">{item.stem}</p>}
      <video ref={ref} className="plc-video" src={audioUrl(item.file || item.audio)} preload="metadata" playsInline />
      <button
        className="plc-audio"
        disabled={plays >= max}
        onClick={() => {
          setPlays((p) => p + 1)
          setDraft({ plays: plays + 1 })
          ref.current?.play().catch(() => {})
        }}
      >
        {T(lang, 'play')} <span className="plc-plays">{max - plays}</span>
      </button>
      <div className="plc-list">
        {order?.map((oi) => (
          <button
            key={oi}
            type="button"
            className={`plc-opt ${draft.optIndex === oi ? 'on' : ''}`}
            onClick={() => setDraft({ optIndex: oi, shownOrder: order })}
          >
            {item.options[oi].t}
          </button>
        ))}
      </div>
    </>
  )
}

// Минимальные пары: два слова, одно прозвучало. Файлов озвучки в бандле пока
// нет — как и он, падаем на синтез речи браузера.
function MinPair({ item, draft, setDraft, lang }) {
  const say = () => {
    const a = new Audio(audioUrl(item.file))
    a.play().catch(() => {
      try {
        const u = new SpeechSynthesisUtterance(item.sentence || item.word)
        u.lang = 'en-GB'
        speechSynthesis.cancel()
        speechSynthesis.speak(u)
      } catch {
        /* нет синтеза — студент отвечает по написанию */
      }
    })
  }
  const opts = [item.word, item.distractor]
  return (
    <>
      <p className="plc-stem">{T(lang, 'introMinpair')}</p>
      <button className="plc-audio" onClick={say}>{T(lang, 'play')}</button>
      <div className="plc-list">
        {opts.map((w, i) => (
          <button
            key={w}
            type="button"
            className={`plc-opt ${draft.optIndex === i ? 'on' : ''}`}
            onClick={() => setDraft({ optIndex: i, fraction: i === 0 ? 1 : 0 })}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── результат ────────────────────────────────────────────────────────────
function PlacementResult({ result, lang, onDone }) {
  const t = (k) => T(lang, k)
  const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const pos = (x) => Math.max(0, Math.min(100, ((x + 3.5) / 6) * 100))
  const lo = pos(result.theta - result.se)
  const hi = pos(result.theta + result.se)
  const rows = [
    ['blockRouting', result.skills.routing],
    ['blockMinpair', result.skills.minpair],
    ['blockListening', result.skills.listening],
    ['skillClips', result.skills.clip],
    ['blockReading', result.skills.reading],
    ['blockUoe', result.skills.uoe],
    ['skillUoe2', result.skills.uoe2],
  ].filter(([, v]) => v)

  return (
    <Shell>
      <div className="plc">
        <div className="plc-card plc-card--center">
          <h1 className="plc-h1">{t('congratsTitle')}</h1>
          <p className="plc-hint">{t('congratsLevel')}</p>
          <div className="plc-level">{result.level}</div>

          <div className="plc-band">
            <div className="plc-band__fill" style={{ left: `${lo}%`, width: `${Math.max(3, hi - lo)}%` }} />
            <div className="plc-band__ticks">{LEVELS.map((l) => <span key={l}>{l}</span>)}</div>
          </div>

          {rows.length > 0 && (
            <div className="plc-rows">
              {rows.map(([key, v]) => (
                <div key={key} className="plc-row">
                  <span>{t(key)}</span>
                  <b>{v.score != null && v.score !== v.correct ? v.score : v.correct} / {v.n}</b>
                </div>
              ))}
              {result.lex && (
                <div className="plc-row"><span>{t('blockVocab')}</span><b>{result.lex.score100}/100</b></div>
              )}
              {result.writing && (
                <div className="plc-row"><span>{t('blockWriting')}</span><b>{result.writing.score.total}/9</b></div>
              )}
            </div>
          )}

          <button className="plc-primary" onClick={onDone}>Let&apos;s go 🚀</button>
        </div>
      </div>
    </Shell>
  )
}
