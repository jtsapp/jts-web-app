import { useState, useEffect, useMemo, useCallback } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { tx, LEVELS, FIELD_CATS, TIMES } from '../practice/vocab/strings.js'
import { loadScope, loadVocabIndex, tr as trW, altTr as altTrW, exampleHtml } from '../practice/vocab/vocabData.js'
import { useVocabState } from '../practice/vocab/state.js'
import { collectCount, pickCollectWords } from '../practice/vocab/engine.js'
import { initVoices, speak as ttsSpeak, sfx as playSfx, ac, buzz } from '../practice/vocab/audio.js'
import { Illus, SpeakBtn } from '../practice/vocab/tasks/shared.jsx'
import Session from '../practice/vocab/Session.jsx'

// Словарь — нативный экран (раньше прототип public/vocab/index.html в iframe).
// Слова и строки собираются scripts/extract-vocab.js; вёрстка и логика
// перенесены 1-в-1, но живут внутри LearningLayout и языка сайта.
// Экраны: setup → (fields) → overview → collect → session → results.

// Прототип знает только ru/kk; для английского интерфейса сайта берём ru.
const vocabLang = (lang) => (lang === 'kk' ? 'kk' : 'ru')

export default function VocabularyPage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { lang } = useI18n()
  const vlang = vocabLang(lang)
  const T = tx(vlang)
  const { S, set, setQuiet } = useVocabState()

  const [screen, setScreen] = useState('setup')
  const [scope, setScope] = useState([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(null)
  const [collected, setCollected] = useState(null)
  const [results, setResults] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  const toast = useCallback((m) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg(''), 2200)
  }, [])

  useEffect(() => {
    initVoices()
    loadVocabIndex().then(setIndex)
  }, [])

  // Выборка слов под текущие настройки (уровень или проф. сфера).
  useEffect(() => {
    let alive = true
    setLoading(true)
    loadScope({ mode: S.mode, level: S.level, field: S.field }).then((ws) => {
      if (!alive) return
      setScope(ws)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [S.mode, S.level, S.field])

  const speak = useCallback(
    (text, opts) => ttsSpeak(text, { accent: S.accent, onNoVoice: () => toast(T.noVoice), ...opts }),
    [S.accent, T, toast],
  )
  const sfx = useCallback((k) => playSfx(k, S.sound), [S.sound])
  const tr = useCallback((w) => trW(w, vlang), [vlang])

  const startCollect = () => {
    ac()
    if (!scope.length) return toast(T.noWords)
    const list = pickCollectWords(scope, S.srs, collectCount(S.goalMin)).map((w) => ({ w, known: null }))
    setCollected(list)
    setScreen('collect')
  }

  const shell = (children) => (
    <LearningLayout userName={userName} userLevel={userLevel} active="vocab" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="vc">
        {children}
        <div className={`v-toast${toastMsg ? ' v-show' : ''}`}><span>{toastMsg}</span></div>
      </div>
    </LearningLayout>
  )

  const ctx = { T, lang: vlang, speak, sfx, tr, S }

  if (screen === 'session') {
    return shell(
      <Session
        collected={collected}
        scope={scope}
        S={S}
        set={set}
        setQuiet={setQuiet}
        T={T}
        lang={vlang}
        toast={toast}
        onExit={() => setScreen('setup')}
        onFinish={(r) => {
          setResults(r)
          playSfx('win', S.sound)
          setScreen('results')
        }}
      />,
    )
  }

  if (screen === 'collect') {
    return shell(
      <Collect list={collected} ctx={ctx} onDone={() => setScreen('session')} onExit={() => setScreen('setup')} />,
    )
  }

  if (screen === 'results') return shell(<Results r={results} T={T} onHome={() => setScreen('setup')} />)

  if (screen === 'fields') {
    return shell(
      <Fields
        T={T}
        index={index}
        current={S.field}
        onPick={(key) => {
          sfx('tap')
          set({ field: key })
          setScreen('setup')
        }}
        onBack={() => setScreen('setup')}
      />,
    )
  }

  if (screen === 'overview') {
    return shell(
      <Overview T={T} scope={scope} S={S} tr={tr} speak={speak} onStart={startCollect} onBack={() => setScreen('setup')} />,
    )
  }

  return shell(
    <Setup
      T={T}
      S={S}
      set={set}
      sfx={sfx}
      speak={speak}
      loading={loading}
      count={scope.length}
      onFields={() => {
        ac()
        sfx('tap')
        setScreen('fields')
      }}
      onNext={() => {
        ac()
        if (!scope.length) return toast(T.noWords)
        sfx('tap')
        setScreen('overview')
      }}
    />,
  )
}

/* ─────────────── Настройка сессии ─────────────── */
function Setup({ T, S, set, sfx, speak, loading, count, onFields, onNext }) {
  const personal = S.mode === 'personalized'
  return (
    <section className="v-screen v-show">
      <div className="v-scroll v-pad">
        <h1 className="v-setup-title">{T.setupTitle}</h1>
        <p className="v-setup-lead">{T.setupLead}</p>

        <div className="v-setup-sec">
          <div className="v-lbl">{T.s_level_h}</div>
          {personal ? (
            <button className="v-setup-note" onClick={onFields}>
              <span className="v-e">🧭</span>
              <span>{T.fldLead}</span>
            </button>
          ) : (
            <div className="v-lvl-grid">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  className={`v-lvl-cell${S.level === l ? ' v-sel' : ''}`}
                  onClick={() => {
                    set({ level: l })
                    sfx('tap')
                  }}
                >
                  <b>{l}</b>
                  <span>{(T.lvl_d && T.lvl_d[l]) || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="v-setup-sec">
          <div className="v-lbl">{T.s_mode_h}</div>
          {[
            ['essential', T.essential, T.essential_d, '⚡'],
            ['personalized', T.personalized, T.personalized_d, '🎯'],
          ].map(([m, tt, dd, ic]) => (
            <button
              key={m}
              className={`v-opt${S.mode === m ? ' v-sel' : ''}`}
              onClick={() => {
                set({ mode: m })
                sfx('tap')
              }}
            >
              <span className="v-ic">{ic}</span>
              <span className="v-tx"><b>{tt}</b><span>{dd}</span></span>
              <span className="v-tick">✓</span>
            </button>
          ))}
        </div>

        <div className="v-setup-sec">
          <div className="v-lbl">{T.s_accent_h}</div>
          {[
            ['us', '🇺🇸', T.american, T.american_d],
            ['gb', '🇬🇧', T.british, T.british_d],
          ].map(([a, fl, tt, dd]) => (
            <button
              key={a}
              className={`v-opt${S.accent === a ? ' v-sel' : ''}`}
              onClick={() => {
                set({ accent: a })
                ac()
                setTimeout(() => speak("Hello! Let's study."), 60)
              }}
            >
              <span className="v-ic">{fl}</span>
              <span className="v-tx"><b>{tt}</b><span>{dd}</span></span>
              <span className="v-tick">✓</span>
            </button>
          ))}
        </div>

        <div className="v-setup-sec">
          <div className="v-lbl">{T.s_goal_h}</div>
          <div className="v-time-row">
            {TIMES.map((m) => (
              <button
                key={m}
                className={`v-time-cell${S.goalMin === m ? ' v-sel' : ''}`}
                onClick={() => {
                  set({ goalMin: m })
                  sfx('tap')
                }}
              >
                <b>{m}</b>
                <span>{T.min}</span>
                <span className="v-tc-words">{collectCount(m)} {T.tcWords}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="v-ob-foot">
        <button className="v-btn" onClick={onNext} disabled={loading}>
          {loading ? '…' : T.startLesson}
          {!loading && count ? ` · ${count}` : ''}
        </button>
      </div>
    </section>
  )
}

/* ─────────────── Выбор профессиональной сферы ─────────────── */
function Fields({ T, index, current, onPick, onBack }) {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const fields = (index && index.fields) || []
  const name = useCallback((key) => (T.field_names && T.field_names[key]) || key, [T])

  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return fields
      .filter((f) => cat === 'all' || f.cat === cat)
      .filter((f) => !query || (name(f.key) + ' ' + f.key).toLowerCase().includes(query))
  }, [fields, cat, q, name])

  return (
    <section className="v-screen v-show">
      <div className="v-fld-hd">
        <button className="v-sess-x" onClick={onBack} aria-label="back">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="v-fld-tt">{T.fldTitle}</div>
      </div>
      <div className="v-fld-lead">{T.fldLead}</div>
      <div className="v-fld-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.fldSearch} />
      </div>
      <div className="v-fld-cats">
        {FIELD_CATS.map((c) => (
          <button key={c} className={`v-fld-cat${c === cat ? ' v-on' : ''}`} onClick={() => setCat(c)}>
            {(T.cat_names && T.cat_names[c]) || c}
          </button>
        ))}
      </div>
      <div className="v-fld-grid">
        {list.length ? (
          list.map((f) => (
            <button key={f.key} className={`v-fld-card${current === f.key ? ' v-sel' : ''}`} onClick={() => onPick(f.key)}>
              <span className="v-fic">{f.ic}</span>
              <span className="v-fnm">{name(f.key)}</span>
              <span className="v-fcnt">{T.fldWords(f.count)}</span>
            </button>
          ))
        ) : (
          <div className="v-ovw-empty" style={{ gridColumn: '1/-1' }}>{T.fldEmpty}</div>
        )}
      </div>
    </section>
  )
}

/* ─────────────── Обзор выборки ─────────────── */
const OV_CAP = 6000
function Overview({ T, scope, S, tr, speak, onStart, onBack }) {
  const [q, setQ] = useState('')
  const personal = S.mode === 'personalized'
  const full = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return scope
    return scope.filter((w) => (w.en + ' ' + w.ru + ' ' + w.kk).toLowerCase().includes(query))
  }, [scope, q])
  const shown = full.slice(0, OV_CAP)
  const fieldName = (T.field_names && T.field_names[S.field]) || S.field

  return (
    <section className="v-screen v-show">
      <div className="v-ovw-hd">
        <button className="v-sess-x" onClick={onBack} aria-label="back">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="v-ovw-tt">{T.ovTitle}</div>
      </div>
      <div className="v-ovw-cards">
        <div className="v-ovw-stat v-lvl">
          <div className="v-badge">📚</div>
          <div className="v-k">{personal ? T.ovFieldAvail : T.ovAvail}</div>
          <div className="v-v">{scope.length}</div>
          <div className="v-s">{personal ? T.ovFieldLine(fieldName) : T.ovLevelLine(S.level)}</div>
        </div>
        <div className="v-ovw-stat">
          <div className="v-badge">🎯</div>
          <div className="v-k">{T.ovSession(S.goalMin)}</div>
          <div className="v-v">{collectCount(S.goalMin)}</div>
          <div className="v-s">{T.ovSessionWords}</div>
        </div>
      </div>
      <div className="v-ovw-listhd">
        <div className="v-ovw-lbl">{personal ? T.ovListField || T.ovListLabel : T.ovListLabel}</div>
        <div className="v-ovw-count">
          {full.length > shown.length ? T.ovShown(shown.length, full.length) : String(full.length)}
        </div>
      </div>
      <div className="v-ovw-search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.ovSearch} />
      </div>
      <div className="v-ovw-list">
        {shown.length ? (
          shown.map((w) => (
            <div key={w.id} className="v-ovw-row">
              <span className="v-em">{w.emo}</span>
              <span className="v-tx">
                <b>{w.en}</b>
                <span>{tr(w)} · <span className="v-ipa2">{w.ipa}</span></span>
              </span>
              <button className="v-say" onClick={() => speak(w.en)} aria-label={T.listen}>🔊</button>
            </div>
          ))
        ) : (
          <div className="v-ovw-empty">{T.fldEmpty}</div>
        )}
      </div>
      <div className="v-ob-foot">
        <button className="v-btn" onClick={onStart}>{T.ovStart}</button>
      </div>
    </section>
  )
}

/* ─────────────── Этап 1: карточки «знаю / не знаю» ─────────────── */
function Collect({ list, ctx, onDone, onExit }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const { T } = ctx
  const item = list[idx]

  useEffect(() => {
    if (!item) return
    setFlipped(false)
    const id = setTimeout(() => ctx.speak(item.w.en), 150)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  useEffect(() => {
    if (!item) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item])

  if (!item) return null
  const w = item.w

  const choose = (known) => {
    item.known = known
    ctx.sfx(known ? 'reveal' : 'tap')
    buzz(known ? 15 : 25)
    setIdx((i) => i + 1)
  }

  return (
    <section className="v-screen v-show">
      <div className="v-sess-top">
        <button className="v-sess-x" onClick={onExit} aria-label="exit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="v-prog"><i style={{ width: (idx / list.length) * 100 + '%' }} /></div>
        <div className="v-sess-timer">{idx + 1} / {list.length}</div>
      </div>
      <div className="v-sess-sub"><div className="v-round-name"><span className="v-e">🃏</span>{T.collectTitle}</div></div>

      <div className="v-stage v-enter">
        <div
          className={`v-flip${flipped ? ' v-flipped' : ''}`}
          onClick={(e) => {
            if (e.target.closest('.v-spk')) return
            setFlipped((f) => {
              ctx.sfx('tap')
              if (!f) ctx.speak(w.en)
              return !f
            })
          }}
        >
          <div className="v-flip-inner">
            <div className="v-flip-face v-flip-front">
              <div className="v-ff-chips">
                <span className="v-chip">{w.pos}</span>
                <span className="v-chip v-cyan">{w.lvl}</span>
              </div>
              <div className="v-ff-word">{w.en}</div>
              <div className="v-ff-ipa">{w.ipa}</div>
              <SpeakBtn text={w.en} ctx={ctx} className="v-spk v-lg" />
              <div className="v-ff-hint">{T.tapReveal}</div>
            </div>
            <div className="v-flip-face v-flip-back">
              <Illus w={w} />
              <div className="v-fb-body">
                <div className="v-fb-word2">{w.en}<SpeakBtn text={w.en} ctx={ctx} className="v-spk v-smk" /></div>
                <div className="v-fb-tr2">{ctx.tr(w)}<span className="v-alt">{altTrW(w, ctx.lang)}</span></div>
                <div className="v-fb-def2">{w.def}</div>
                <div className="v-fb-ex2">
                  <span className="v-lab">{T.example}</span>
                  <span dangerouslySetInnerHTML={{ __html: exampleHtml(w.ex) }} />
                  {w.ph && (
                    <div style={{ marginTop: 8, color: 'var(--ink-30)', fontSize: 13 }}>
                      <b style={{ color: 'var(--violet)' }}>{T.phrase}:</b> {w.ph}
                    </div>
                  )}
                </div>
                {(w.syn || w.ant) && (
                  <div className="v-fb-sa">
                    {w.syn && <span className="v-sa v-syn">≈ {w.syn}</span>}
                    {w.ant && <span className="v-sa v-ant">≠ {w.ant}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="v-col-actions">
          <button className="v-btn v-dont" onClick={() => choose(false)}>{T.dont}</button>
          <button className="v-btn v-green" onClick={() => choose(true)}>{T.know}</button>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── Итоги ─────────────── */
function Results({ r, T, onHome }) {
  if (!r) return null
  const acc = r.answered ? Math.round((r.correct / r.answered) * 100) : 0
  const mins = Math.max(1, Math.round(r.elapsed / 60000))
  return (
    <section className="v-screen v-show">
      <div className="v-res-wrap">
        <div className="v-res-emo">🎉</div>
        <div className="v-res-h">{T.resH_done}</div>
        <div className="v-res-sub">{T.resSub}</div>
        <div className="v-res-stats">
          <div className="v-res-stat"><div className="v-v">{r.newLearned}</div><div className="v-l">{T.r_learned}</div></div>
          <div className="v-res-stat"><div className="v-v">{acc}%</div><div className="v-l">{T.r_acc}</div></div>
          <div className="v-res-stat"><div className="v-v">{r.xp}</div><div className="v-l">{T.r_xp}</div></div>
          <div className="v-res-stat"><div className="v-v">{r.bestCombo}</div><div className="v-l">{T.r_combo}</div></div>
          <div className="v-res-stat"><div className="v-v">{mins}</div><div className="v-l">{T.r_time}</div></div>
        </div>
      </div>
      <div className="v-res-foot">
        <button className="v-btn" onClick={onHome}>{T.backHome}</button>
      </div>
    </section>
  )
}
