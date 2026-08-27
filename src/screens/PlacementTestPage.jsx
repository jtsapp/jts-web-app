'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Shell from '../components/Shell.jsx'
import {
  loadPlacementBank,
  createPlacementSession,
  audioUrl,
  VARIANTS,
} from '../practice/placement/engine.js'
import { vocabDraw, seededShuffle } from '../practice/placement/engine.generated.js'
import { T } from '../practice/placement/strings.js'
import { placementLevel } from '../lib/placement.js'

// Тест на определение уровня. Расчёты — перенесённый движок школы
// (practice/placement/engine.generated.js, сверен с бандлом в
// placementParity.test.js), здесь только экран в оформлении приложения.
//
// Ход теста повторяет бандл: самооценка задаёт стартовую θ, дальше разделы
// идут по очереди, перед каждым — экран с объяснением, внутри раздела ответы
// можно менять до кнопки «Завершить раздел». Таймера нет намеренно.

const CANDO_KEYS = ['cando0', 'cando1', 'cando2', 'cando3', 'cando4']

export default function PlacementTestPage({ lang = 'ru', onLevel, onDone }) {
  const t = useCallback((k) => T(lang, k), [lang])
  const [phase, setPhase] = useState('loading') // loading | error | variant | cando | intro | items | vocab | writing | result
  const [data, setData] = useState(null)
  const [variant, setVariant] = useState('express')
  const [secIdx, setSecIdx] = useState(0)
  const [items, setItems] = useState([])
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

  // Отсчёт времени на задание — в эффекте: Date.now() во время рендера
  // сделал бы его нечистым, а число уходит в лог для калибровки банка.
  useEffect(() => {
    if (phase === 'items' || phase === 'writing') startedAt.current = Date.now()
  }, [phase, pos])

  // Разделы строятся один раз на старте варианта: их состав зависит от
  // конфигурации (в express нет клипов и говорения), а не от хода теста.
  const [plan, setPlan] = useState([])
  const buildPlan = (s) => {
    const out = [
      { key: 'routing', title: t('blockRouting'), hint: t('introRouting'), build: () => s.buildRouting() },
      { key: 'minpair', title: t('blockMinpair'), hint: t('introMinpair'), build: () => s.buildMinpairs() },
      { key: 'listening', title: t('blockListening'), hint: t('introListening'), build: () => s.buildListening() },
    ]
    if (s.cfg.clips) out.push({ key: 'clip', title: t('skillClips'), hint: t('introClips'), build: () => s.buildClips() })
    out.push(
      { key: 'vocab', title: t('blockVocab'), hint: t('introVocab'), build: null },
      { key: 'reading', title: t('blockReading'), hint: t('introReading'), build: () => s.buildReading() },
      { key: 'uoe', title: t('blockUoe'), hint: t('introUoe'), build: () => [...s.buildUoeBatch(s.cfg.uoe), ...s.buildInteractive()] },
      { key: 'writing', title: t('blockWriting'), hint: t('introWriting'), build: null },
    )
    return out
  }

  const startVariant = (v) => {
    setVariant(v)
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
    if (sec.key === 'vocab') {
      const s = sess.current
      s.lex = { items: vocabDraw(data.vocab, s.theta0, s.rnd) }
      setLexWords(s.lex.items)
      setLexPicked({})
      return setPhase('vocab')
    }
    if (sec.key === 'writing') {
      const w = sess.current.itemsOf('writing', null)
      const item = sess.current.pick(w)
      setItems(item ? [item] : [])
      setDrafts({})
      return setPhase(item ? 'writing' : 'result')
    }
    const built = sec.build() || []
    if (!built.length) return openSection(i + 1) // раздела нет в этом варианте
    setItems(built)
    setPos(0)
    setDrafts({})
    setPhase('items')
  }

  const finishSection = () => {
    const s = sess.current
    for (const item of items) {
      const d = drafts[item.id]
      if (!d) {
        s.answer(item, { optIndex: null, text: '', tMs: 0, shownOrder: null })
        continue
      }
      if (d.fraction != null) s.answerGraded(item, d.fraction, { playsUsed: d.plays || 1 })
      else s.answer(item, { optIndex: d.optIndex ?? null, text: d.text || '', tMs: d.tMs || 0, shownOrder: d.shownOrder || null })
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
    const item = items[0]
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

  // ─── экраны ─────────────────────────────────────────────────────────────
  if (phase === 'loading' || phase === 'error') {
    return (
      <Shell>
        <div className="plc">
          <div className="plc-card plc-card--center">
            {phase === 'loading' ? (
              <>
                <div className="spinner" />
                <p className="plc-hint">{'Загружаем тест…'}</p>
              </>
            ) : (
              <p className="form-error">{'Не удалось загрузить тест. Обновите страницу.'}</p>
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
    const item = items[0]
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
              placeholder={t('hintOneWord') && ''}
            />
            <div className="plc-foot">
              <span className="plc-count">{text.trim().split(/\s+/).filter(Boolean).length} {t('minWords')}</span>
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

  // ─── задания раздела ────────────────────────────────────────────────────
  const item = items[pos]
  const sec = plan[secIdx]
  const draft = drafts[item?.id] || {}
  const setDraft = (patch) => setDrafts((d) => ({ ...d, [item.id]: { ...d[item.id], ...patch, tMs: Date.now() - startedAt.current } }))
  const answered = draft.optIndex != null || !!draft.text || draft.fraction != null

  return (
    <Shell>
      <div className="plc">
        <div className="plc-card">
          <div className="plc-top">
            <span className="plc-step">{sec?.title}</span>
            <span className="plc-count">{pos + 1} / {items.length}</span>
          </div>
          <div className="plc-bar"><div className="plc-bar__fill" style={{ width: `${((pos + 1) / items.length) * 100}%` }} /></div>

          <ItemBody item={item} draft={draft} setDraft={setDraft} lang={lang} />

          <div className="plc-foot">
            <button className="plc-ghost" disabled={pos === 0} onClick={() => setPos((p) => p - 1)}>
              {t('back')}
            </button>
            {pos < items.length - 1 ? (
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

// ─── тело задания по формату ──────────────────────────────────────────────
function ItemBody({ item, draft, setDraft, lang }) {
  // Порядок вариантов перемешивается один раз на задание: иначе он менялся бы
  // на каждый рендер, и студент терял бы уже выбранный ответ из виду.
  // Хук стоит до любых ранних выходов — порядок хуков обязан совпадать
  // на каждом рендере, а задание может быть ещё не готово.
  const order = useMemo(() => {
    if (!item?.options?.length) return []
    const idx = item.options.map((_, i) => i)
    return item.fixedOrder ? idx : seededShuffle(idx, Math.random)
  }, [item])

  if (!item) return null

  if (item.block === 'minpair') return <MinPair item={item} draft={draft} setDraft={setDraft} lang={lang} />
  if (item.type === 'order') return <OrderWords item={item} draft={draft} setDraft={setDraft} />
  if (item.audio || item.file) return <WithAudio item={item} draft={draft} setDraft={setDraft} order={order} lang={lang} />

  if (item.options?.length) {
    return (
      <>
        {item.passage && <p className="plc-passage">{item.passage}</p>}
        <p className="plc-stem">{item.stem}</p>
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
      <p className="plc-stem">{item.stem}</p>
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

// Аудио-задание: число прослушиваний ограничено, как в бандле.
function WithAudio({ item, draft, setDraft, order, lang }) {
  const [plays, setPlays] = useState(0)
  const ref = useRef(null)
  const max = item.playsAllowed || 2
  return (
    <>
      <p className="plc-stem">{item.stem}</p>
      <audio ref={ref} src={audioUrl(item.file || item.audio)} preload="none" />
      <button
        className="plc-audio"
        disabled={plays >= max}
        onClick={() => { setPlays((p) => p + 1); ref.current?.play().catch(() => {}) }}
      >
        ▶ {T(lang, 'play')} <span className="plc-plays">{max - plays}</span>
      </button>
      <div className="plc-list">
        {order?.map((oi) => (
          <button key={oi} type="button" className={`plc-opt ${draft.optIndex === oi ? 'on' : ''}`}
            onClick={() => setDraft({ optIndex: oi, shownOrder: order, plays })}>
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
    const url = audioUrl(item.file)
    const a = new Audio(url)
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
      <button className="plc-audio" onClick={say}>▶ {T(lang, 'play')}</button>
      <div className="plc-list">
        {opts.map((w, i) => (
          <button key={w} type="button" className={`plc-opt ${draft.optIndex === i ? 'on' : ''}`}
            onClick={() => setDraft({ optIndex: i, fraction: i === 0 ? 1 : 0 })}>
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

// Сборка предложения из слов.
function OrderWords({ item, draft, setDraft }) {
  const words = useMemo(() => seededShuffle(item.answer.split(' '), Math.random), [item])
  const seq = draft.seq || []
  const put = (i) => {
    if (seq.includes(i)) return
    const next = [...seq, i]
    const built = next.map((k) => words[k]).join(' ')
    setDraft({ seq: next, text: built, fraction: built === item.answer ? 1 : 0 })
  }
  return (
    <>
      <p className="plc-stem">{item.stem || item.instruction}</p>
      <div className="plc-slots">{seq.map((k) => <span key={k} className="plc-tile on">{words[k]}</span>) || null}</div>
      <div className="plc-bank">
        {words.map((w, i) => (
          <button key={w + i} type="button" className={`plc-tile ${seq.includes(i) ? 'used' : ''}`} onClick={() => put(i)}>
            {w}
          </button>
        ))}
      </div>
      {seq.length > 0 && (
        <button className="plc-ghost plc-reset" onClick={() => setDraft({ seq: [], text: '', fraction: null })}>Сбросить</button>
      )}
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
    ['skillMinpair', result.skills.minpair],
    ['blockListening', result.skills.listening],
    ['skillClips', result.skills.clip],
    ['blockReading', result.skills.reading],
    ['blockUoe', result.skills.uoe],
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

          <button className="plc-primary" onClick={onDone}>{'Let\'s go 🚀'}</button>
        </div>
      </div>
    </Shell>
  )
}
