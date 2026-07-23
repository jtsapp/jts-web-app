import { useState, useRef, useEffect, useMemo } from 'react'
import { uiStr, typeLabel, fmt } from './strings.js'
import { completeLessonModule } from '../../api.js'
import { markUnitDone } from './grammarProgress.js'

// Монеты за верный ответ (порт RewardPill.coins(10) из мобилки).
const REWARD = 10

// Плеер упражнений урока — нативный порт движка грамматика_практика.html
// (renderActivity + check-функции). Логика проверки каждого типа сохранена
// 1-в-1: norm() + alts, авто-проверка categorize/matching по заполнении, и т.д.
// Данные (activities) — ровно то, что отдаёт journeyFor(u) в источнике.

// Нормализация ответа для сравнения (как norm() в источнике).
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,!?;:"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, '')
}

// Доверенный HTML из данных курса (подсветки <b>/<em>/<span class="hl">).
function Html({ html, as = 'span', className, ...rest }) {
  const Tag = as
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: html }} />
}

export default function ActivityPlayer({
  activities,
  unitTitle,
  lang,
  token,
  level,
  unitId,
  onExit,
  onNextLesson,
}) {
  const [idx, setIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [points, setPoints] = useState(0)
  const total = activities.length

  if (idx >= total) {
    return (
      <Celebrate
        correct={correct}
        total={total}
        points={points}
        unitTitle={unitTitle}
        lang={lang}
        token={token}
        level={level}
        unitId={unitId}
        onExit={onExit}
        onNextLesson={onNextLesson}
      />
    )
  }

  const pct = Math.round((idx / total) * 100)
  return (
    <div className="gr-practice">
      <div className="gr-lprog-row">
        <div className="gr-lprog">
          <div className="gr-lprog__bar" style={{ width: `${pct}%` }} />
        </div>
        <span className="gr-lprog__pct">{pct}%</span>
      </div>
      <Activity
        key={idx}
        a={activities[idx]}
        idx={idx}
        total={total}
        lang={lang}
        onResult={(ok) => {
          if (ok) {
            setCorrect((c) => c + 1)
            setPoints((p) => p + REWARD)
          }
        }}
        onNext={() => setIdx((i) => i + 1)}
      />
    </div>
  )
}

function Activity({ a, idx, total, lang, onResult, onNext }) {
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState(null) // {ok, why}
  const [canCheck, setCanCheck] = useState(false)
  const checkRef = useRef(null) // функцию проверки регистрирует активное тело
  const firedRef = useRef(false)

  // Единожды фиксируем результат (для счётчика верных).
  const finish = (ok, why) => {
    if (firedRef.current) return
    firedRef.current = true
    setAnswered(true)
    setFeedback({ ok, why: why || '' })
    onResult(ok)
  }

  const bind = (fn) => {
    checkRef.current = fn
  }

  const stageLabel = a.stage ? uiStr(lang, 'stage' + a.stage) : ''
  const label = typeLabel(lang, a.typeLabel) || a.type
  const t = (k) => uiStr(lang, k)

  return (
    <div className="gr-act">
      <div className="gr-act__top">
        {a.stage ? <span className={`gr-act__stage st${a.stage}`}>{stageLabel}</span> : null}
        <span className="gr-act__type">{label}</span>
        <span className="gr-act__count">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="gr-act__body">
        <Body
          a={a}
          lang={lang}
          answered={answered}
          feedback={feedback}
          finish={finish}
          setCanCheck={setCanCheck}
          bind={bind}
        />
      </div>
      {feedback && (
        <div className={`gr-fb show ${feedback.ok ? 'ok' : 'no'}`}>
          <span className="gr-fb__ic">{feedback.ok ? '✓' : '✕'}</span>
          <div className="gr-fb__text">
            <b>{feedback.ok ? t('fb_correct') : t('fb_wrong')}</b>
            {feedback.why ? (
              <span className="gr-fb__why">
                <Html html={feedback.why} />
              </span>
            ) : null}
          </div>
          {feedback.ok && (
            <span className="gr-reward">
              <img className="gr-reward__coin" src="/assets/coin-star.png" alt="" />+{REWARD}
            </span>
          )}
        </div>
      )}
      <div className="gr-act__foot">
        {!feedback && a.type === 'speaking' && (
          <button className="gr-check" onClick={() => finish(true, a.why)}>
            {t('btn_isaidit')}
          </button>
        )}
        {!feedback && a.type === 'flashcard' && (
          <button className="gr-check" onClick={() => finish(true, '')}>
            {t('btn_iknew')}
          </button>
        )}
        {!feedback && !['dialogue', 'speaking', 'flashcard'].includes(a.type) && (
          <button
            className="gr-check"
            disabled={!canCheck}
            onClick={() => checkRef.current && checkRef.current()}
          >
            {t('btn_check')}
          </button>
        )}
        {feedback && (
          <button className="gr-next show" onClick={onNext} autoFocus>
            {t('btn_continue')}
          </button>
        )}
      </div>
    </div>
  )
}

// ——— тело упражнения по типу ———
function Body(props) {
  switch (props.a.type) {
    case 'mc':
      return <MC {...props} />
    case 'gap':
    case 'transform':
    case 'dictation':
      return <TextInput {...props} />
    case 'order':
      return <Order {...props} />
    case 'error':
      return <ErrorPick {...props} />
    case 'categorize':
      return <Categorize {...props} />
    case 'matching':
      return <Matching {...props} />
    case 'truefalse':
      return <TrueFalse {...props} />
    case 'timeline':
      return <Timeline {...props} />
    case 'dialogue':
      return <Dialogue {...props} />
    case 'speaking':
      return <Speaking {...props} />
    case 'flashcard':
      return <Flashcard {...props} />
    default:
      return null
  }
}

// ——— MC ———
function MC({ a, answered, finish, setCanCheck, bind }) {
  const [picked, setPicked] = useState(null)
  useEffect(() => setCanCheck(picked !== null && !answered), [picked, answered, setCanCheck])
  bind(() => {
    if (answered || picked === null) return
    finish(picked === a.answer, a.why[picked])
  })

  return (
    <>
      <Html className="gr-actq" as="div" html={a.q} />
      <div className="gr-opts">
        {a.options.map((o, i) => {
          let cls = 'gr-opt'
          if (picked === i && !answered) cls += ' sel'
          if (answered) {
            if (i === a.answer) cls += ' correct'
            else if (i === picked) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} disabled={answered} onClick={() => !answered && setPicked(i)}>
              <Html html={o} />
              <span className="gr-opt__mk">
                {answered && i === a.answer ? '✓' : answered && i === picked ? '✗' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ——— gap / transform / dictation ———
function TextInput({ a, lang, answered, finish, setCanCheck, bind }) {
  const [value, setValue] = useState('')
  const [shownAnswer, setShownAnswer] = useState(null)
  const inputRef = useRef(null)
  useEffect(() => setCanCheck(value.trim() !== '' && !answered), [value, answered, setCanCheck])

  const check = () => {
    if (answered || !value.trim()) return
    const good = [a.answer, ...(a.alts || [])].map(norm)
    const ok = good.includes(norm(value))
    if (!ok) setShownAnswer(a.answer)
    finish(ok, a.why)
  }
  bind(check)

  useEffect(() => {
    const el = inputRef.current
    if (el) setTimeout(() => el.focus(), 250)
  }, [])

  const okCls = answered ? (shownAnswer === null ? 'correct' : 'wrong') : ''
  const speakText = () => {
    try {
      const u = new SpeechSynthesisUtterance(a.text)
      u.lang = 'en-US'
      u.rate = 0.9
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    } catch {
      /* нет поддержки — молча */
    }
  }

  const field = (
    <input
      ref={inputRef}
      className={`gr-gap-input ${a.type === 'gap' ? '' : 'gr-tf-input'} ${okCls}`}
      value={shownAnswer !== null ? shownAnswer : value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && value.trim() && check()}
      disabled={answered}
      autoComplete="off"
      spellCheck="false"
      aria-label="answer"
      placeholder={
        a.type === 'gap' ? '' : uiStr(lang, a.type === 'dictation' ? 'dictation_ph' : 'type_ph')
      }
    />
  )

  if (a.type === 'gap') {
    return (
      <>
        <div className="gr-actq">{uiStr(lang, 'gap_instr')}</div>
        <div className="gr-gap-sentence">
          <Html html={a.before} />
          {field}
          <Html html={a.after} />
        </div>
      </>
    )
  }
  if (a.type === 'transform') {
    return (
      <>
        <Html className="gr-actq" as="div" html={a.instruction} />
        <Html className="gr-gap-sentence" as="div" html={a.prompt} style={{ fontSize: 18 }} />
        <div style={{ textAlign: 'center' }}>{field}</div>
      </>
    )
  }
  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'dictation_instr')}</div>
      <button className="gr-media-btn" onClick={speakText} aria-label={uiStr(lang, 'aria_play')}>
        🔊
      </button>
      <div style={{ textAlign: 'center' }}>{field}</div>
    </>
  )
}

// ——— order (конструктор предложения) ———
function Order({ a, lang, answered, finish, setCanCheck, bind }) {
  const [slots, setSlots] = useState([]) // индексы выбранных слов из банка
  const [wrongShown, setWrongShown] = useState(false)
  useEffect(
    () => setCanCheck(slots.length === a.words.length && !answered),
    [slots, a.words.length, answered, setCanCheck],
  )

  const check = () => {
    if (answered || slots.length !== a.words.length) return
    const got = slots.map((i) => a.words[i]).join(' ')
    const ok = got === a.answer.join(' ')
    if (!ok) setWrongShown(true)
    finish(ok, a.why)
  }
  bind(check)

  const add = (i) => !answered && setSlots((s) => (s.includes(i) ? s : [...s, i]))
  const removeAt = (k) => !answered && setSlots((s) => s.filter((_, j) => j !== k))

  const slotWords = answered && wrongShown ? a.answer : slots.map((i) => a.words[i])
  const slotCls = answered ? (wrongShown ? 'wrong' : 'correct') : ''

  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'order_instr')}</div>
      <div className={`gr-slots ${slotCls}`} aria-live="polite">
        {slotWords.map((w, k) => (
          <button key={k} className="gr-slot-word" onClick={() => !wrongShown && removeAt(k)}>
            {w}
          </button>
        ))}
      </div>
      <div className="gr-bank">
        {a.words.map((w, i) => (
          <button
            key={i}
            className={`gr-word ${slots.includes(i) ? 'used' : ''}`}
            onClick={() => add(i)}
            disabled={answered}
          >
            {w}
          </button>
        ))}
      </div>
    </>
  )
}

// ——— error (найди ошибку) ———
function ErrorPick({ a, lang, answered, finish, setCanCheck, bind }) {
  const [picked, setPicked] = useState(null)
  useEffect(() => setCanCheck(picked !== null && !answered), [picked, answered, setCanCheck])
  bind(() => {
    if (answered || picked === null) return
    finish(picked === a.wrong, a.why)
  })

  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'error_instr')}</div>
      <div className="gr-error-sentence">
        {a.words.map((w, i) => {
          let cls = 'gr-eword'
          if (!answered && picked === i) cls += ' sel'
          if (answered && i === a.wrong) cls += ' correct'
          if (answered && i === picked && picked !== a.wrong) cls += ' wrong'
          const show = answered && i === a.wrong && picked === a.wrong && a.correct ? a.correct : w
          return (
            <span key={i}>
              <span className={cls} onClick={() => !answered && setPicked(i)}>
                {show}
              </span>{' '}
            </span>
          )
        })}
      </div>
    </>
  )
}

// ——— categorize ———
function Categorize({ a, lang, answered, finish }) {
  const [placed, setPlaced] = useState({}) // itemIndex -> bucketIndex
  const [sel, setSel] = useState(null)
  const [marked, setMarked] = useState(false)

  const placedCount = Object.keys(placed).length
  useEffect(() => {
    if (placedCount === a.items.length && !answered && !marked) {
      const id = setTimeout(() => {
        setMarked(true)
        const allOk = a.items.every((it, i) => placed[i] === it.b)
        finish(allOk, allOk ? uiStr(lang, 'cat_ok') : uiStr(lang, 'cat_no'))
      }, 250)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedCount])

  const pool = a.items.map((it, i) => ({ it, i })).filter((x) => placed[x.i] === undefined)
  const pick = (i) => !answered && setSel((s) => (s === i ? null : i))
  const drop = (bi) => {
    if (answered || sel === null) return
    setPlaced((p) => ({ ...p, [sel]: bi }))
    setSel(null)
  }

  return (
    <>
      <Html className="gr-actq" as="div" html={a.prompt} />
      <div className="gr-cat-items">
        {pool.map((x) => (
          <button
            key={x.i}
            className={`gr-cat-item ${sel === x.i ? 'sel' : ''}`}
            onClick={() => pick(x.i)}
          >
            {x.it.t}
          </button>
        ))}
        {/* пул пуст, но ответ ещё не отмечен — идёт авто-проверка */}
        {!pool.length && !marked && <span className="gr-cat-checking">Проверяем…</span>}
      </div>
      <div className="gr-cat-buckets">
        {a.buckets.map((b, bi) => {
          const chips = a.items.map((it, i) => ({ it, i })).filter((x) => placed[x.i] === bi)
          return (
            <div key={bi} className="gr-bucket" onClick={() => drop(bi)}>
              <div className="gr-bucket__h">{b}</div>
              <div className="gr-bucket__drop">
                {chips.map((c) => {
                  let cls = 'gr-chip-in'
                  if (marked) cls += placed[c.i] === c.it.b ? ' ok' : ' no'
                  return (
                    <span key={c.i} className={cls}>
                      {c.it.t}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ——— matching ———
function Matching({ a, lang, answered, finish }) {
  const order = useMemo(() => shuffle(a.pairs.map((_, i) => i)), [a])
  const [paired, setPaired] = useState({}) // leftIndex -> rightIndex
  const [sel, setSel] = useState(null)
  const [marked, setMarked] = useState(false)

  const count = Object.keys(paired).length
  useEffect(() => {
    if (count === a.pairs.length && !answered && !marked) {
      const id = setTimeout(() => {
        setMarked(true)
        const allOk = a.pairs.every((_, i) => paired[i] === i)
        finish(allOk, (allOk ? uiStr(lang, 'match_ok') : uiStr(lang, 'match_no')) + (a.why || ''))
      }, 220)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  const pickL = (i) => {
    if (answered) return
    if (paired[i] !== undefined) {
      setPaired((p) => {
        const n = { ...p }
        delete n[i]
        return n
      })
      setSel(i)
      return
    }
    setSel((s) => (s === i ? null : i))
  }
  const pickR = (ri) => {
    if (answered || sel === null) return
    setPaired((p) => {
      const n = { ...p }
      for (const k in n) if (n[k] === ri) delete n[k]
      n[sel] = ri
      return n
    })
    setSel(null)
  }

  return (
    <>
      <Html className="gr-actq" as="div" html={a.prompt || uiStr(lang, 'match_instr')} />
      <div className="gr-match-cols">
        <div className="gr-match-col">
          {a.pairs.map((p, i) => {
            const asg = paired[i]
            const ok = asg === i
            let cls = 'gr-match-l'
            if (!marked && sel === i) cls += ' sel'
            if (marked) cls += ok ? ' correct' : ' wrong'
            return (
              <button key={i} className={cls} disabled={marked} onClick={() => pickL(i)}>
                <Html className="gr-match-q" as="span" html={p.l} />
                {marked ? (
                  ok ? (
                    <span className="gr-match-asg ok">
                      <Html html={a.pairs[asg].r} /> ✓
                    </span>
                  ) : (
                    <span className="gr-match-asg no">
                      {asg !== undefined ? <Html html={a.pairs[asg].r} /> : '—'} ✗{' '}
                      <b>
                        → <Html html={p.r} />
                      </b>
                    </span>
                  )
                ) : asg !== undefined ? (
                  <span className="gr-match-asg">
                    <Html html={a.pairs[asg].r} />
                  </span>
                ) : (
                  <span className="gr-match-asg empty">tap an answer →</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="gr-match-col">
          {order.map((ri) => {
            const used = Object.values(paired).indexOf(ri) >= 0
            return (
              <button
                key={ri}
                className={`gr-match-r ${used ? 'used' : ''}`}
                disabled={used || marked}
                onClick={() => pickR(ri)}
              >
                <Html html={a.pairs[ri].r} />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ——— true/false (спид-раунд) ———
function TrueFalse({ a, lang, answered, finish }) {
  const [picks, setPicks] = useState({}) // index -> {val, ok}
  const done = Object.keys(picks).length

  useEffect(() => {
    if (done === a.items.length && !answered) {
      const all = a.items.every((_, i) => picks[i] && picks[i].ok)
      finish(all, all ? uiStr(lang, 'tf_ok') : uiStr(lang, 'tf_no'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const pick = (i, val) => {
    if (picks[i] !== undefined) return
    setPicks((p) => ({ ...p, [i]: { val, ok: val === a.items[i].ok } }))
  }

  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'tf_instr')}</div>
      <div className="gr-tf-rows">
        {a.items.map((it, i) => {
          const p = picks[i]
          const cls = p ? (p.ok ? 'ok' : 'no') : ''
          return (
            <div key={i} className={`gr-tf-row ${cls}`}>
              <Html className="gr-tf-row__s" as="span" html={it.s} />
              <button
                className={`gr-fchip ${p && it.ok ? 'reveal' : ''}`}
                disabled={!!p}
                onClick={() => pick(i, true)}
              >
                ✓
              </button>
              <button
                className={`gr-fchip ${p && !it.ok ? 'reveal' : ''}`}
                disabled={!!p}
                onClick={() => pick(i, false)}
              >
                ✗
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ——— timeline ———
function Timeline({ a, lang, answered, finish }) {
  const [picked, setPicked] = useState(null)
  const zones = [
    { z: 'past', em: '⬅️', label: uiStr(lang, 'tl_past') },
    { z: 'now', em: '▶️', label: uiStr(lang, 'tl_now') },
    { z: 'future', em: '➡️', label: uiStr(lang, 'tl_future') },
  ]
  const pick = (z) => {
    if (answered) return
    setPicked(z)
    finish(z === a.answer, a.why)
  }
  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'timeline_instr')}</div>
      <Html className="gr-gap-sentence" as="div" html={a.sentence} style={{ fontSize: 18 }} />
      <div className="gr-tzones">
        {zones.map((zn) => {
          let cls = 'gr-tzone'
          if (answered && picked === zn.z) cls += zn.z === a.answer ? ' correct' : ' wrong'
          if (answered && picked !== a.answer && zn.z === a.answer) cls += ' correct'
          return (
            <button key={zn.z} className={cls} disabled={answered} onClick={() => pick(zn.z)}>
              <span className="gr-tzone__em">{zn.em}</span>
              {zn.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ——— dialogue (ролевая игра) ———
// Живой чат: реплики появляются по одной, бот «печатает…» перед своими
// сообщениями, автоскролл вниз, варианты — только когда очередь пользователя.
function Dialogue({ a, lang, answered, feedback, finish }) {
  const [messages, setMessages] = useState([]) // раскрытые реплики {who,text,id}
  // Стартовая реплика NPC уже в очереди — так эффект обработки не срабатывает на
  // пустой очереди при монтировании (иначе варианты показывались бы до реплики).
  const [queue, setQueue] = useState(() => (a.steps[0] ? [{ text: a.steps[0].npc }] : []))
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState(0)
  const [showOpts, setShowOpts] = useState(false)
  const [bad, setBad] = useState(false)
  const [inlineWhy, setInlineWhy] = useState(null)
  const pendingRef = useRef(a.steps[0] ? 0 : null) // шаг для показа вариантов, либо 'finish'
  const badRef = useRef(false)
  const finishRef = useRef(finish)
  const idRef = useRef(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    finishRef.current = finish
    badRef.current = bad
  })

  const endConversation = () =>
    finishRef.current(!badRef.current, badRef.current ? uiStr(lang, 'dlg_bad') : uiStr(lang, 'dlg_ok'))

  // Обработка очереди: «печатает…» → реплика; когда очередь пуста — показываем
  // варианты для текущего шага (или завершаем диалог).
  useEffect(() => {
    if (queue.length === 0) {
      if (pendingRef.current === 'finish') {
        pendingRef.current = null
        endConversation()
      } else if (pendingRef.current != null) {
        pendingRef.current = null
        setShowOpts(true)
      }
      return
    }
    setShowOpts(false)
    setTyping(true)
    const head = queue[0]
    const plain = String(head.text).replace(/<[^>]+>/g, '')
    const delay = 480 + Math.min(plain.length * 16, 900)
    const t = setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { who: 'a', text: head.text, id: idRef.current++ }])
      setQueue((q) => q.slice(1))
    }, delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue])

  // Автоскролл к последней реплике.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  const pick = (i) => {
    if (answered || typing || !showOpts) return
    const o = a.steps[step].options[i]
    if (!o.ok) {
      setBad(true)
      setInlineWhy(o.why)
      return
    }
    setInlineWhy(null)
    setShowOpts(false)
    setMessages((m) => [...m, { who: 'b', text: o.t, id: idRef.current++ }])
    const bot = []
    if (o.reply) bot.push({ text: o.reply })
    const ns = step + 1
    const nextStep = a.steps[ns]
    if (nextStep) bot.push({ text: nextStep.npc })
    setStep(ns)
    if (bot.length === 0) {
      endConversation() // последний шаг без ответа NPC — завершаем сразу
    } else {
      pendingRef.current = nextStep ? ns : 'finish'
      setQueue(bot)
    }
  }

  const current = a.steps[step]
  return (
    <>
      <Html className="gr-actq" as="div" html={a.scene} />
      <div className="gr-chat gr-chat--live" ref={scrollRef}>
        {messages.map((m) => (
          <Html key={m.id} className={`gr-msg ${m.who} gr-msg--in`} as="div" html={m.text} />
        ))}
        {typing && (
          <div className="gr-msg a gr-typing" aria-label="печатает">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      {!answered && showOpts && current && (
        <div className="gr-dlg-opts">
          {current.options.map((o, i) => (
            <button key={i} className="gr-opt" onClick={() => pick(i)}>
              <Html html={o.t} />
            </button>
          ))}
        </div>
      )}
      {inlineWhy && !feedback && (
        <div className="gr-fb show no">
          <span className="gr-fb__ic">✕</span>
          <div className="gr-fb__text">
            <b>{uiStr(lang, 'dlg_notquite')}</b>
            <span className="gr-fb__why">
              <Html html={inlineWhy} /> {uiStr(lang, 'dlg_tryother')}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

// ——— speaking ———
function Speaking({ a, lang, finish }) {
  const [heard, setHeard] = useState('')

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const said = { btn: uiStr(lang, 'btn_isaidit') }
    if (!SR) {
      setHeard(fmt(uiStr(lang, 'spk_sayit'), said))
      return
    }
    const r = new SR()
    r.lang = 'en-US'
    r.interimResults = false
    setHeard(uiStr(lang, 'spk_listening'))
    r.onresult = (e) => {
      const heardText = e.results[0][0].transcript
      setHeard(fmt(uiStr(lang, 'spk_yousaid'), { said: heardText }))
      const tw = norm(a.target).split(' ')
      const sw = norm(heardText).split(' ')
      const hit = tw.filter((w) => sw.includes(w)).length / tw.length
      finish(hit >= 0.5, hit >= 0.5 ? a.why : uiStr(lang, 'spk_close'))
    }
    r.onerror = () => setHeard(fmt(uiStr(lang, 'spk_nomic'), said))
    try {
      r.start()
    } catch {
      setHeard(fmt(uiStr(lang, 'spk_tapdone'), said))
    }
  }

  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'speaking_instr')}</div>
      <div className="gr-media-target">🗣️ “{a.target}”</div>
      <button className="gr-media-btn" onClick={start} aria-label={uiStr(lang, 'aria_record')}>
        🎤
      </button>
      <div className="gr-heard">{heard || uiStr(lang, 'spk_tapmic')}</div>
    </>
  )
}

// ——— flashcard ———
function Flashcard({ a, lang }) {
  const [on, setOn] = useState(false)
  const card = a.cards[0]
  return (
    <>
      <div className="gr-actq">{uiStr(lang, 'flip_instr')}</div>
      <div className={`gr-flip ${on ? 'on' : ''}`} onClick={() => setOn((v) => !v)}>
        <div className="gr-flip__in">
          <Html className="gr-flip__face gr-flip__front" as="div" html={card.f} />
          <Html className="gr-flip__face gr-flip__back" as="div" html={card.b} />
        </div>
      </div>
      <div className="gr-flip__hint">{uiStr(lang, 'flip_hint')}</div>
    </>
  )
}

// ——— финальный экран урока ———
function Celebrate({ correct, total, points, unitTitle, lang, token, level, unitId, onExit, onNextLesson }) {
  const perfect = correct === total
  const containerRef = useRef(null)
  useEffect(() => {
    confettiBurst(containerRef.current, 80)
    // Отмечаем урок пройденным локально — каталог покажет бейдж «Пройдено».
    if (level != null && unitId != null) markUnitDone(level, unitId)
    // Начисляем заработанные монеты в реальный баланс (best-effort — как мобилка
    // на завершении урока). Осечка не должна ломать финальный экран.
    if (token && points > 0) completeLessonModule(token, points).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="gr-practice">
      <div className="gr-lprog">
        <div className="gr-lprog__bar" style={{ width: '100%' }} />
      </div>
      <div className="gr-lstep">{uiStr(lang, 'lbl_complete')}</div>
      <div className="gr-celebrate" ref={containerRef}>
        <div className="gr-medal">{perfect ? '🏆' : '🎉'}</div>
        <h1>{uiStr(lang, 'cel_title')}</h1>
        <p>{fmt(uiStr(lang, 'cel_desc'), { title: stripTags(unitTitle) })}</p>
        <div className="gr-score">{fmt(uiStr(lang, 'cel_score'), { c: correct, n: total })}</div>
        {points > 0 && (
          <div className="gr-earned">
            <img className="gr-reward__coin" src="/assets/coin-star.png" alt="" /> +{points}
          </div>
        )}
        <div className="gr-cta-row">
          {onNextLesson && (
            <button className="gr-btn gr-btn--primary" onClick={onNextLesson}>
              {uiStr(lang, 'btn_next_lesson')}
            </button>
          )}
          <button className="gr-btn gr-btn--soft" onClick={onExit}>
            {uiStr(lang, 'btn_back')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Лёгкое конфетти на финальном экране (уважает prefers-reduced-motion).
const CFX = ['#874BF8', '#0AAFFF', '#00D441', '#FFAD00', '#FF631E', '#B7FF5A']
function confettiBurst(host, n) {
  if (!host) return
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div')
    d.className = 'gr-conf'
    d.style.left = Math.random() * 100 + '%'
    d.style.background = CFX[i % CFX.length]
    d.style.animationDuration = 1.6 + Math.random() * 1.4 + 's'
    d.style.animationDelay = Math.random() * 0.3 + 's'
    d.style.transform = 'rotate(' + Math.random() * 360 + 'deg)'
    if (Math.random() > 0.5) d.style.borderRadius = '50%'
    host.appendChild(d)
    setTimeout(() => d.remove(), 3200)
  }
}
