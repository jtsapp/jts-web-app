import { useState, useMemo, useRef } from 'react'
import { Illus, SpeakBtn, PickOne, buildOptions, useAutoSpeak } from './shared.jsx'

// Задания-«узнавание» и сборка слова/предложения. Порт act*-функций прототипа;
// семь вариантов выбора из четырёх собраны на общем PickOne.

/* ── 1. choose: слово → перевод ── */
export function Choose({ item, ctx }) {
  const w = item.w
  const options = useMemo(() => buildOptions(w, item, ctx, (o) => ctx.tr(o)), [w.id])
  useAutoSpeak(w.en, ctx, 100)
  return (
    <PickOne
      ctx={ctx}
      w={w}
      ask={ctx.T.ask_choose}
      options={options.map((o, i) => ({ ...o, node: <><span className="v-k">{'ABCD'[i]}</span>{o.node}</> }))}
      prompt={
        <div className="v-card" style={{ textAlign: 'center', padding: 22 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{w.en}</div>
          <SpeakBtn text={w.en} ctx={ctx} style={{ margin: '12px auto 0' }} />
        </div>
      }
    />
  )
}

/* ── 2. listen: аудио → слово ── */
export function Listen({ item, ctx }) {
  const w = item.w
  const [wave, setWave] = useState(false)
  const options = useMemo(
    () => buildOptions(w, item, ctx, (o) => <><span className="v-pic">{o.emo}</span><span>{o.en}</span></>),
    [w.id],
  )
  const play = () => {
    setWave(true)
    ctx.speak(w.en, { onEnd: () => setWave(false) })
    setTimeout(() => setWave(false), 900)
  }
  useAutoSpeak(w.en, ctx, 140)
  return (
    <PickOne
      ctx={ctx}
      w={w}
      ask={ctx.T.ask_listen}
      options={options}
      prompt={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '6px 0 18px' }}>
          <button type="button" className="v-bigspk" onClick={play} aria-label={ctx.T.listen}>🔊</button>
          <div className={`v-waves${wave ? ' v-on' : ''}`}><i /><i /><i /><i /><i /></div>
        </div>
      }
    />
  )
}

/* ── 3. imagepick: слово+перевод → картинка ── */
export function ImagePick({ item, ctx }) {
  const w = item.w
  const options = useMemo(
    () => buildOptions(w, item, ctx, (o) => <span className="v-bigemo">{o.emo}</span>),
    [w.id],
  )
  useAutoSpeak(w.en, ctx, 100)
  return (
    <PickOne
      ctx={ctx}
      w={w}
      grid
      ask={ctx.T.ask_imagepick}
      small={`${w.en} · ${ctx.tr(w)}`}
      options={options}
      prompt={
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 6 }}>
          <SpeakBtn text={w.en} ctx={ctx} />
        </div>
      }
    />
  )
}

/* ── 4. defmatch: определение → слово ── */
export function DefMatch({ item, ctx }) {
  const w = item.w
  const options = useMemo(
    () => buildOptions(w, item, ctx, (o) => <><span className="v-pic">{o.emo}</span>{o.en}</>),
    [w.id],
  )
  return (
    <PickOne
      ctx={ctx}
      w={w}
      ask={ctx.T.ask_defmatch}
      options={options}
      prompt={<div className="v-ctx-card"><span className="v-quote">“</span>{w.def}</div>}
    />
  )
}

/* ── 5. context: слово в пропуск предложения ── */
export function Context({ item, ctx }) {
  const w = item.w
  const [fill, setFill] = useState(null) // {text, ok}
  const options = useMemo(
    () => buildOptions(w, item, ctx, (o) => <><span className="v-pic">{o.emo}</span>{o.en}</>),
    [w.id],
  )
  const [before, after] = useMemo(() => {
    const m = w.ex.match(/\{\{(.+?)\}\}/)
    if (!m) return [w.ex, '']
    const i = w.ex.indexOf(m[0])
    return [w.ex.slice(0, i), w.ex.slice(i + m[0].length)]
  }, [w.id])

  const gapStyle = fill && !fill.ok
    ? { borderColor: 'var(--orange)', color: 'var(--orange)', background: 'var(--orange-50)' }
    : undefined

  return (
    <PickOne
      ctx={ctx}
      w={w}
      ask={ctx.T.ask_context}
      options={options}
      onPicked={(ok, opt) => setFill({ text: opt.word.en, ok })}
      prompt={
        <div className="v-ctx-card">
          <span className="v-quote">“</span>
          {before}
          <span className={`v-gap${fill ? ' v-filled' : ''}`} style={gapStyle}>{fill ? fill.text : '?'}</span>
          {after}
        </div>
      }
    />
  )
}

/* ── 6. dialogue: слово в реплике диалога ── */
export function Dialogue({ item, ctx }) {
  const w = item.w
  const [fill, setFill] = useState(null)
  const options = useMemo(() => buildOptions(w, item, ctx, (o) => o.en), [w.id])
  const [before, after] = useMemo(() => {
    const plain = w.ex.replace(/\{\{|\}\}/g, '')
    const re = new RegExp('\\b' + w.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'i')
    const m = plain.match(re)
    if (!m) return [plain + ' ', '']
    const i = plain.indexOf(m[0])
    return [plain.slice(0, i), plain.slice(i + m[0].length)]
  }, [w.id])

  return (
    <PickOne
      ctx={ctx}
      w={w}
      ask={ctx.T.ask_dialogue}
      options={options}
      onPicked={(ok, opt) => setFill({ text: ok ? w.en : opt.word.en, ok })}
      prompt={
        <div className="v-dlg">
          <div className="v-bubble v-them"><span className="v-who">🧑</span><div className="v-msg">{ctx.T.dlgPrompt}</div></div>
          <div className="v-bubble v-me">
            <div className="v-msg">
              {before}
              <span className={`v-dgap${fill ? ' v-filled' : ''}`} style={fill && !fill.ok ? { color: '#ffd9c2' } : undefined}>
                {fill ? fill.text : '____'}
              </span>
              {after}
            </div>
            <span className="v-who">🙂</span>
          </div>
        </div>
      }
    />
  )
}

/* ── 7. collocation: пропущенный партнёр устойчивого сочетания ── */
export function Collocation({ item, ctx }) {
  const w = item.w
  const [fill, setFill] = useState(null)
  const model = useMemo(() => {
    const toks = (w.ph || '').split(' ').filter(Boolean)
    const base = w.en.toLowerCase()
    let pIdx = toks.findIndex((tk) => {
      const x = tk.toLowerCase()
      return !base.includes(x) && !['a', 'an', 'the', 'to'].includes(x)
    })
    if (pIdx < 0) pIdx = 0
    const partner = toks[pIdx]
    const pl = partner.toLowerCase()
    const distSrc = ctx.shuffle(
      ctx.scope.filter((x) => x.id !== w.id).map((x) => (x.ph ? x.ph.split(' ')[0] : x.en)),
    )
    const uniq = [...new Set(distSrc.filter((o) => o && o.toLowerCase() !== pl))].slice(0, 3)
    return { toks, pIdx, partner, pl, options: ctx.shuffle([partner, ...uniq]) }
  }, [w.id])

  const gapStyle = fill && !fill.ok
    ? { borderColor: 'var(--orange)', color: 'var(--orange)', background: 'var(--orange-50)' }
    : undefined

  return (
    <PickOne
      ctx={ctx}
      w={w}
      ask={ctx.T.ask_colloc}
      small={`${w.en} · ${ctx.tr(w)}`}
      wrongAnswer={w.ph}
      options={model.options.map((o) => ({
        key: o,
        correct: o.toLowerCase() === model.pl,
        node: o,
      }))}
      onPicked={(ok, opt) => setFill({ text: opt.key, ok })}
      prompt={
        <>
          <Illus w={w} cls="v-sm" />
          <div className="v-ctx-card">
            <span className="v-quote">“</span>
            {model.toks.map((tk, i) => (
              <span key={i}>
                {i === model.pIdx ? (
                  <span className={`v-gap${fill ? ' v-filled' : ''}`} style={gapStyle}>{fill ? fill.text : '?'}</span>
                ) : w.en.toLowerCase().includes(tk.toLowerCase()) ? (
                  <b>{tk}</b>
                ) : (
                  tk
                )}{' '}
              </span>
            ))}
          </div>
        </>
      }
    />
  )
}

/* ── 8/9. construct (буквы) и scramble (слова предложения) ── */
export function Assemble({ item, ctx, mode }) {
  const w = item.w
  const model = useMemo(() => {
    if (mode === 'letters') {
      const target = w.en.replace(/\s/g, '')
      return { parts: target.split(''), bank: ctx.shuffle(target.split('').map((l, i) => ({ l, i }))) }
    }
    const full = w.ex.replace(/\{\{|\}\}/g, '').replace(/\s+/g, ' ').trim()
    const end = (full.match(/[.!?]+$/) || ['.'])[0]
    const words = full.replace(/[.!?]+$/, '').split(' ').filter(Boolean)
    return { parts: words, bank: ctx.shuffle(words.map((l, i) => ({ l, i }))), end }
  }, [w.id, mode])

  const [placed, setPlaced] = useState([]) // элементы bank
  const full = placed.length === model.parts.length
  useAutoSpeak(w.en, ctx, 120)

  const put = (b) => {
    if (placed.includes(b) || full) return
    ctx.sfx('tap')
    setPlaced((p) => [...p, b])
  }
  const pop = () => placed.length && setPlaced((p) => p.slice(0, -1))

  const check = () => {
    const got = placed.map((b) => b.l.toLowerCase()).join(mode === 'letters' ? '' : ' ')
    const want = model.parts.map((x) => x.toLowerCase()).join(mode === 'letters' ? '' : ' ')
    const ok = got === want
    ctx.grade(w, ok, false)
    if (ok) ctx.correct(w)
    else ctx.wrong(w, mode === 'letters' ? w.en : model.parts.join(' ') + model.end)
  }

  if (mode === 'letters') {
    return (
      <>
        <div className="v-q-ask">{ctx.T.ask_construct}</div>
        <div className="v-mini-card">
          <div className="v-bigemo">{w.emo}</div>
          <div>
            <b>{ctx.tr(w)}</b>
            <SpeakBtn text={w.en} ctx={ctx} className="v-chip" style={{ marginTop: 6, cursor: 'pointer' }}>
              🔊 {ctx.T.listen}
            </SpeakBtn>
          </div>
        </div>
        <div className="v-assemble-target" onClick={pop}>
          {model.parts.map((_, i) => (
            <div key={i} className={`v-slot${placed[i] ? ' v-filled' : ''}`}>{placed[i] ? placed[i].l : ''}</div>
          ))}
        </div>
        <div className="v-tiles">
          {model.bank.map((b, i) => (
            <button key={i} type="button" className={`v-tile${placed.includes(b) ? ' v-used' : ''}`} onClick={() => put(b)}>
              {b.l}
            </button>
          ))}
        </div>
        <div className="v-sess-foot">
          <button type="button" className="v-btn" disabled={!full} onClick={check}>{ctx.T.check}</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_scramble}<small>{ctx.tr(w)}</small></div>
      <Illus w={w} cls="v-sm" />
      <div className="v-phrase-strip" onClick={pop}>
        {placed.length ? placed.map((b, i) => <span key={i} className="v-placed-tile">{b.l}</span>) : <span className="v-ph-slot" />}
      </div>
      <div className="v-pbank">
        {model.bank.map((b, i) => (
          <button key={i} type="button" className={`v-ptile${placed.includes(b) ? ' v-used' : ''}`} onClick={() => put(b)}>
            {b.l}
          </button>
        ))}
      </div>
      <div className="v-know-row">
        <button type="button" className="v-btn" disabled={!full} onClick={check}>{ctx.T.check}</button>
      </div>
    </>
  )
}

/* ── 10. swipe: верен ли перевод ── */
export function Swipe({ item, ctx }) {
  const w = item.w
  const model = useMemo(() => {
    const showCorrect = Math.random() < 0.5
    const other = ctx.distractors(w, 1, item.pool)[0] || w
    return { showCorrect, shownTr: showCorrect ? ctx.tr(w) : ctx.tr(other) }
  }, [w.id])
  const cardRef = useRef(null)
  const drag = useRef({ on: false, sx: 0 })
  const [dx, setDx] = useState(0)
  const [gone, setGone] = useState(false)
  useAutoSpeak(w.en, ctx, 150)

  const commit = (saidYes) => {
    if (gone) return
    setGone(true)
    setDx(saidYes ? 500 : -500)
    const ok = saidYes === model.showCorrect
    ctx.grade(w, ok, false)
    setTimeout(() => (ok ? ctx.correct(w) : ctx.wrong(w)), 180)
  }

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_swipe}</div>
      <div className="v-swipe-zone">
        <div className="v-swipe-buckets">
          <span className="v-bucket v-no" onClick={() => commit(false)}>✕ {ctx.T.swipeNo}</span>
          <span className="v-bucket v-yes" onClick={() => commit(true)}>✓ {ctx.T.swipeYes}</span>
        </div>
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div className="v-swipe-stamp v-no" style={{ opacity: dx < -40 ? 1 : 0 }}>{ctx.T.swipeNo}</div>
          <div className="v-swipe-stamp v-yes" style={{ opacity: dx > 40 ? 1 : 0 }}>{ctx.T.swipeYes}</div>
          <div
            ref={cardRef}
            className="v-swipe-card"
            style={{ transform: dx ? `translateX(${dx}px) rotate(${dx / 18}deg)` : '', transition: drag.current.on ? 'none' : '' }}
            onPointerDown={(e) => {
              if (gone) return
              drag.current = { on: true, sx: e.clientX }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => drag.current.on && setDx(e.clientX - drag.current.sx)}
            onPointerUp={(e) => {
              if (!drag.current.on) return
              drag.current.on = false
              const d = e.clientX - drag.current.sx
              if (Math.abs(d) > 70) commit(d > 0)
              else setDx(0)
            }}
          >
            <div className="v-bigemo">{w.emo}</div>
            <div className="v-se">{w.en}</div>
            <div className="v-st">{model.shownTr}</div>
          </div>
        </div>
        <div className="v-swipe-hint">{ctx.T.swipeHint}</div>
      </div>
    </>
  )
}
