import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { Illus, useAutoSpeak } from './shared.jsx'

// Групповые механики и «продвинутые» задания. Групповые (dragmatch/match/
// memory) не дают поштучного фидбека: собрал набор — ctx.groupWin(words, xp).

/* ── 11. dragmatch: перетащить слова на картинки ── */
export function DragMatch({ item, ctx }) {
  const set = item.pool
  const [placed, setPlaced] = useState({}) // wordId -> true
  const [sel, setSel] = useState(null)
  const [shake, setShake] = useState(null)
  const bank = useMemo(() => ctx.shuffle(set), [item])
  const doneRef = useRef(false)

  const drop = (chip, target) => {
    if (placed[chip.id]) return
    if (chip.id === target.id) {
      ctx.sfx('good')
      ctx.buzz(12)
      const next = { ...placed, [chip.id]: true }
      setPlaced(next)
      setSel(null)
      if (Object.keys(next).length === set.length && !doneRef.current) {
        doneRef.current = true
        ctx.groupWin(set, 14)
      }
    } else {
      ctx.sfx('bad')
      ctx.buzz(20)
      setShake(chip.id)
      setTimeout(() => setShake(null), 280)
      setSel(null)
    }
  }

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_drag}</div>
      <div className="v-drag-imgs">
        {set.map((w) => (
          <div
            key={w.id}
            data-id={w.id}
            className={`v-dropimg${placed[w.id] ? ' v-filled' : ''}`}
            onClick={() => sel && drop(sel, w)}
          >
            <div className="v-bigemo">{w.emo}</div>
            <div className="v-lab">{ctx.tr(w)}</div>
            <div className="v-placed">{placed[w.id] ? '✓ ' + w.en : ''}</div>
          </div>
        ))}
      </div>
      <div className="v-chip-pool">
        {bank.map((w) => (
          <button
            key={w.id}
            type="button"
            data-id={w.id}
            className={`v-wchip${placed[w.id] ? ' v-used' : ''}${sel && sel.id === w.id ? ' v-dragging' : ''}`}
            style={shake === w.id ? { animation: 'v-shake .28s' } : undefined}
            disabled={!!placed[w.id]}
            onClick={() => {
              ctx.sfx('tap')
              setSel(sel && sel.id === w.id ? null : w)
            }}
          >
            {w.en}
          </button>
        ))}
      </div>
    </>
  )
}

/* ── 12. match: соединить слово и перевод (с линиями) ── */
export function Match({ item, ctx }) {
  const set = useMemo(() => item.pool.slice(0, Math.min(4, item.pool.length)), [item])
  const L = useMemo(() => ctx.shuffle(set), [set])
  const R = useMemo(() => ctx.shuffle(set), [set])
  const [pick, setPick] = useState(null) // {id, col}
  const [okIds, setOkIds] = useState([])
  const [bad, setBad] = useState([])
  const wrapRef = useRef(null)
  const [lines, setLines] = useState([])
  const anyWrong = useRef(false)
  const doneRef = useRef(false)

  // Линии рисуем после верстки — по фактическим координатам карточек.
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const r = wrap.getBoundingClientRect()
    setLines(
      okIds
        .map((id) => {
          const a = wrap.querySelector(`.v-mcol:first-child .v-mcard[data-id="${id}"]`)
          const b = wrap.querySelector(`.v-mcol:last-child .v-mcard[data-id="${id}"]`)
          if (!a || !b) return null
          const ra = a.getBoundingClientRect()
          const rb = b.getBoundingClientRect()
          const x1 = ra.right - r.left
          const y1 = ra.top + ra.height / 2 - r.top
          const x2 = rb.left - r.left
          const y2 = rb.top + rb.height / 2 - r.top
          return { id, d: `M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}` }
        })
        .filter(Boolean),
    )
  }, [okIds])

  const tap = (w, col) => {
    if (okIds.includes(w.id)) return
    ctx.sfx('tap')
    if (!pick) {
      setPick({ id: w.id, col })
      ctx.speak(w.en)
      return
    }
    if (pick.id === w.id && pick.col === col) return setPick(null)
    if (pick.col === col) {
      setPick({ id: w.id, col })
      return
    }
    if (pick.id === w.id) {
      ctx.sfx('good')
      ctx.buzz(12)
      const next = [...okIds, w.id]
      setOkIds(next)
      setPick(null)
      if (next.length === set.length && !doneRef.current) {
        doneRef.current = true
        ctx.groupWin(set, 14, !anyWrong.current)
      }
    } else {
      anyWrong.current = true
      ctx.sfx('bad')
      ctx.buzz([10, 30, 10])
      setBad([pick.id, w.id])
      setTimeout(() => setBad([]), 380)
      setPick(null)
    }
  }

  const cls = (w, col) =>
    'v-mcard' +
    (okIds.includes(w.id) ? ' v-ok' : '') +
    (pick && pick.id === w.id && pick.col === col ? ' v-sel' : '') +
    (bad.includes(w.id) ? ' v-no' : '')

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_match}</div>
      <div className="v-match-wrap" ref={wrapRef}>
        <svg className="v-match-svg">
          {lines.map((l) => (
            <path key={l.id} d={l.d} stroke="var(--green)" strokeWidth="3" fill="none" strokeLinecap="round" />
          ))}
        </svg>
        <div className="v-match">
          <div className="v-mcol">
            {L.map((w) => (
              <button key={w.id} type="button" data-id={w.id} className={cls(w, 'L')} onClick={() => tap(w, 'L')}>
                {w.en}
              </button>
            ))}
          </div>
          <div className="v-mcol">
            {R.map((w) => (
              <button key={w.id} type="button" data-id={w.id} className={cls(w, 'R')} onClick={() => tap(w, 'R')}>
                {ctx.tr(w)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── 13. memory: найти пары слово/перевод ── */
export function Memory({ item, ctx }) {
  const set = useMemo(() => item.pool.slice(0, 4), [item])
  const cards = useMemo(() => {
    const c = []
    set.forEach((w) => {
      c.push({ id: w.id, txt: w.en, face: 'en', w })
      c.push({ id: w.id, txt: ctx.tr(w), face: 'tr', w })
    })
    return ctx.shuffle(c).map((x, i) => ({ ...x, key: i }))
  }, [set])
  const [open, setOpen] = useState([])
  const [done, setDone] = useState([])
  const lock = useRef(false)
  const doneRef = useRef(false)

  const flip = (c) => {
    if (lock.current || open.includes(c.key) || done.includes(c.id)) return
    ctx.sfx('tap')
    if (c.face === 'en') ctx.speak(c.w.en)
    const next = [...open, c.key]
    setOpen(next)
    if (next.length < 2) return
    lock.current = true
    const [a, b] = next.map((k) => cards.find((x) => x.key === k))
    if (a.id === b.id) {
      setTimeout(() => {
        ctx.sfx('good')
        ctx.buzz(12)
        const nd = [...done, a.id]
        setDone(nd)
        setOpen([])
        lock.current = false
        if (nd.length === set.length && !doneRef.current) {
          doneRef.current = true
          ctx.groupWin(set, 16)
        }
      }, 420)
    } else {
      ctx.sfx('bad')
      setTimeout(() => {
        setOpen([])
        lock.current = false
      }, 720)
    }
  }

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_memory}</div>
      <div className="v-mem-grid">
        {cards.map((c) => {
          const isDone = done.includes(c.id)
          const isOpen = open.includes(c.key) || isDone
          return (
            <div
              key={c.key}
              data-id={c.id}
              className={`v-mem${isOpen ? ' v-flip' : ''}${isDone ? ' v-done' : ''}`}
              onClick={() => flip(c)}
            >
              <div className="v-mem-inner">
                <div className="v-mem-face v-mem-back">💬</div>
                <div className="v-mem-face v-mem-front">{c.txt}</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── 14. trace: пройти по буквам слова по порядку ── */
export function Trace({ item, ctx }) {
  const w = item.w
  const model = useMemo(() => {
    const target = w.en.replace(/[^A-Za-z]/g, '').toLowerCase().split('')
    const pool = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const extra = ctx
      .shuffle(pool.filter((l) => !target.includes(l)))
      .slice(0, Math.max(2, Math.min(4, 9 - target.length)))
    const nodes = ctx.shuffle(
      target.map((l, i) => ({ l, ord: i })).concat(extra.map((l) => ({ l, ord: -1 }))),
    )
    return { target, nodes }
  }, [w.id])

  const [ord, setOrd] = useState(0)
  const [pts, setPts] = useState([])
  const gridRef = useRef(null)
  const svgRef = useRef(null)
  const drawing = useRef(false)
  const doneRef = useRef(false)
  useAutoSpeak(w.en, ctx, 150)

  useEffect(() => {
    const up = () => (drawing.current = false)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const tryNode = (el) => {
    if (doneRef.current || !el) return
    const node = el.closest('.v-tnode')
    if (!node || node.classList.contains('v-on')) return
    if (+node.dataset.ord !== ord) return
    ctx.sfx('tap')
    const r = node.getBoundingClientRect()
    const s = svgRef.current.getBoundingClientRect()
    setPts((p) => [...p, { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top }])
    const next = ord + 1
    setOrd(next)
    if (next >= model.target.length) {
      doneRef.current = true
      ctx.grade(w, true, false)
      setTimeout(() => ctx.correct(w), 250)
    }
  }

  const d = pts.length ? 'M' + pts.map((p) => `${p.x},${p.y}`).join(' L') : ''

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_trace}</div>
      <Illus w={w} cls="v-sm" />
      <div className="v-trace-target">
        {model.target.map((l, i) => (
          <span key={i} className={i < ord ? 'v-done' : ''}>{l}</span>
        ))}
      </div>
      <div className="v-trace-wrap">
        <svg className="v-trace-svg" ref={svgRef}>
          <defs>
            <linearGradient id="v-trace-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#9a64ff" />
              <stop offset="1" stopColor="#0aafff" />
            </linearGradient>
          </defs>
          {d && <path d={d} stroke="url(#v-trace-g)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <div
          className="v-trace-grid"
          ref={gridRef}
          onPointerDown={(e) => {
            drawing.current = true
            tryNode(document.elementFromPoint(e.clientX, e.clientY))
          }}
          onPointerMove={(e) => drawing.current && tryNode(document.elementFromPoint(e.clientX, e.clientY))}
        >
          {model.nodes.map((n, i) => (
            <div
              key={i}
              data-ord={n.ord}
              className={
                'v-tnode' +
                (n.ord === -1 ? ' v-dim' : '') +
                (n.ord > -1 && n.ord < ord ? ' v-on' : '') +
                (n.ord === ord ? ' v-next' : '')
              }
              onClick={(e) => tryNode(e.currentTarget)}
            >
              {n.l}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ── 15. pronounce: произнести слово (распознавание речи) ── */
const normSay = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
function lev(a, b) {
  const m = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) m[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return m[a.length][b.length]
}

export function Pronounce({ item, ctx }) {
  const w = item.w
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const [heard, setHeard] = useState(SR ? ctx.T.pronTap : ctx.T.pronNoMic)
  const [live, setLive] = useState(false)
  const doneRef = useRef(false)
  useAutoSpeak(w.en, ctx, 200)

  const judge = (said) => {
    if (doneRef.current) return
    doneRef.current = true
    const a = normSay(said)
    const b = normSay(w.en)
    const ok = a === b || a.includes(b) || b.includes(a) || lev(a, b) <= 1
    setHeard(`${ctx.T.pronHeard} ${said || '…'}`)
    ctx.grade(w, ok, false)
    setTimeout(() => (ok ? ctx.correct(w) : ctx.wrong(w)), 500)
  }

  const listen = () => {
    if (!SR) {
      ctx.speak(w.en)
      setHeard(ctx.T.pronNoMic)
      return
    }
    try {
      const rec = new SR()
      rec.lang = ctx.S.accent === 'gb' ? 'en-GB' : 'en-US'
      rec.interimResults = false
      rec.maxAlternatives = 3
      setLive(true)
      setHeard(ctx.T.pronListening)
      rec.onresult = (ev) => {
        setLive(false)
        judge(ev.results[0][0].transcript)
      }
      rec.onerror = () => {
        setLive(false)
        setHeard(ctx.T.pronNoMic)
      }
      rec.onend = () => setLive(false)
      rec.start()
    } catch {
      setLive(false)
      setHeard(ctx.T.pronNoMic)
    }
  }

  return (
    <>
      <div className="v-q-ask">{ctx.T.ask_pronounce}</div>
      <div className="v-pron-card">
        <Illus w={w} cls="v-sm" />
        <div className="v-pron-target">{w.en}</div>
        <div className="v-pron-ipa">{w.ipa}</div>
        <div className="v-pron-tr">{ctx.tr(w)}</div>
        <button type="button" className={`v-mic${live ? ' v-live' : ''}`} onClick={listen}>🎤</button>
        <div className="v-heard">{heard}</div>
        <div className="v-pron-actions">
          <button type="button" className="v-chip v-ghost" onClick={() => ctx.speak(w.en)}>🔊 {ctx.T.listen}</button>
          <button
            type="button"
            className="v-chip v-ghost"
            onClick={() => {
              if (doneRef.current) return
              doneRef.current = true
              ctx.grade(w, true, true)
              ctx.correct(w)
            }}
          >
            {ctx.T.pronSkip}
          </button>
        </div>
      </div>
    </>
  )
}

/* ── 16. challenge: финальный раунд на скорость ── */
export function Challenge({ item, ctx, onFinish }) {
  const qs = useMemo(() => ctx.shuffle(item.pool), [item])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [ccombo, setCombo] = useState(0)
  const [picked, setPicked] = useState(null)
  const [pct, setPct] = useState(100)
  const timer = useRef(null)
  const w = qs[idx]
  const dur = ctx.S.goalMin === 30 ? 6000 : 7000

  const options = useMemo(
    () => (w ? ctx.shuffle([w, ...ctx.distractors(w, 3, qs)]) : []),
    [idx, w && w.id],
  )

  useEffect(() => {
    if (!w) return
    ctx.speak(w.en)
    setPicked(null)
    setPct(100)
    let el = 0
    const step = 50
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      el += step
      setPct(Math.max(0, 100 - (el / dur) * 100))
      if (el >= dur) {
        clearInterval(timer.current)
        answer(null)
      }
    }, step)
    return () => clearInterval(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const answer = (b) => {
    clearInterval(timer.current)
    setPicked(b || { id: -1 })
    const ok = b && b.id === w.id
    if (ok) {
      const nc = ccombo + 1
      const pts = 10 + nc * 2 + Math.round(pct / 10)
      setCombo(nc)
      setScore((s) => s + pts)
      ctx.chStat(true, pts, nc)
      ctx.sfx('good')
      ctx.buzz(12)
    } else {
      setCombo(0)
      ctx.chStat(false, 0, 0)
      ctx.sfx('bad')
      ctx.buzz([10, 30, 10])
    }
    setTimeout(() => {
      if (idx + 1 >= qs.length) onFinish()
      else setIdx((i) => i + 1)
    }, 900)
  }

  if (!w) return null
  return (
    <>
      <div className="v-q-ask">{ctx.T.chGo}</div>
      <div className="v-ch-hud">
        <div className="v-ch-score"><span>{score}</span> <small>{ctx.T.chScore}</small></div>
        <div className={`v-ch-combo${ccombo >= 2 ? ' v-on' : ''}`}>{ccombo >= 2 ? `🔥 ${ccombo}` : ''}</div>
      </div>
      <div className="v-ch-timer"><i style={{ width: pct + '%' }} /></div>
      <div className="v-card" style={{ textAlign: 'center', padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{w.en}</div>
      </div>
      <div className="v-opts">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={
              'v-choice' +
              (picked ? (o.id === w.id ? ' v-right' : picked.id === o.id ? ' v-wrong' : '') : '')
            }
            disabled={!!picked}
            onClick={() => answer(o)}
          >
            {ctx.tr(o)}
          </button>
        ))}
      </div>
    </>
  )
}
