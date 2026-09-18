'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  MODES,
  isContextual,
  isSpoken,
  pattern,
  rhythmForms,
  scoreMark,
  selectedVerbs,
  summarize,
  targetForms,
  variantsNote,
} from '../../practice/verbs/engine.js'
import { MicIcon, PlayIcon, StopIcon } from './VerbsIcons.jsx'
import VerbsWritten from './VerbsWritten.jsx'

const LEVEL_CARDS = ['A1', 'A2', 'B1', 'all']
const PHASES = ['ready', 'listening', 'counting', 'speaking']
const TEMPO_PRESETS = [
  ['slow', 76],
  ['steady', 96],
  ['fast', 112],
]

// Часть 03 «Практикуй». Вся логика попытки — в VerbDrill
// (src/practice/verbs/drill.js); здесь только отрисовка его снимка и
// клавиатура прототипа: пробел — старт/стоп, B — бит, 1–5 — режимы.
export default function VerbsPractice({ drill, data, settings, saved, lang, token, onGoTable, onResetProgress }) {
  const { t } = useI18n()
  const snap = useSyncExternalStore(drill.subscribe, drill.getSnapshot, drill.getSnapshot)
  const spoken = isSpoken(snap.mode)
  const repeat = snap.mode === 'repeat'
  const count = snap.count

  useEffect(() => {
    const onKey = (e) => {
      const target = e.target
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      // Тап-слово — span[role=button]: на нём цифры и пробел принадлежат
      // слову, а не переключению режимов; карточка перевода — тоже.
      if (
        target &&
        target.closest &&
        target.closest('input,select,textarea,button,a,summary,[contenteditable="true"],[role="button"],.vb-pop')
      ) {
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        if (!isSpoken(drill.mode)) return
        if (drill.busy) drill.abort()
        else drill.startAttempt('manual')
      } else if (e.key === 'b' || e.key === 'B') {
        drill.toggleBeat()
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        drill.setMode(MODES[Number(e.key) - 1])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drill])

  const selectedCount = useMemo(
    () => selectedVerbs(data.verbs, { mode: snap.mode, set: settings.set, saved, level: settings.practiceLevel }).length,
    [data.verbs, snap.mode, settings.set, saved, settings.practiceLevel],
  )

  // Режимы на телефоне — лента с прокруткой вбок: выбранный (в том числе
  // клавишами 1–5) не должен оставаться за краем экрана. Двигаем только саму
  // ленту — scrollIntoView дёрнул бы и страницу.
  const modesRef = useRef(null)
  useEffect(() => {
    const strip = modesRef.current
    const tab = strip && strip.querySelector('[aria-selected="true"]')
    if (!tab || strip.scrollWidth <= strip.clientWidth) return
    const s = strip.getBoundingClientRect()
    const r = tab.getBoundingClientRect()
    const left = strip.scrollLeft + r.left - s.left - (s.width - r.width) / 2
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo({ left, behavior: still ? 'auto' : 'smooth' })
  }, [snap.mode])

  // На телефоне уровень, формы и набор занимали почти два экрана до
  // упражнения — там они свёрнуты в строку-сводку и раскрываются по кнопке.
  // На десктопе строки нет и блок всегда открыт: решает CSS, а не ширина в
  // JS, поэтому первому кадру нечему расходиться с раскладкой.
  const [setupOpen, setSetupOpen] = useState(false)
  const levelName = settings.practiceLevel === 'all' ? 'A1–B1' : settings.practiceLevel
  const setName =
    settings.set === 'all'
      ? t('verbs.scopeAll')
      : settings.set === 'saved'
        ? t('verbs.scopeSaved')
        : t('verbs.group_' + settings.set)

  const verb = snap.verb
  const forms = spoken ? targetForms(verb, snap.formCount) : []
  const summary = snap.phase === 'summary'
  const badge = repeat && verb ? pattern(verb) : snap.item ? snap.item.lvl || (verb && verb.lvl) : ''
  // Задание пропуска обещает микрофон; где слушать нечем — без этого обещания.
  const instruction = t(
    snap.mode === 'gap' && !snap.canListen
      ? 'verbs.gapHintManual'
      : `verbs.${snap.mode}Hint${repeat || snap.mode === 'write' ? snap.formCount : ''}`,
  )
  const note = summary ? '' : variantsNote(verb, { mode: snap.mode, formCount: snap.formCount })
  const progress = summary ? 100 : count ? (100 * snap.idx) / count : 0
  // Звучит ли бит: идущие часы знают это сами (предпрослушка слышна всегда),
  // стоящие — по настройке, с которой стартует попытка.
  const beatAudible = snap.running ? snap.audible : settings.beat

  return (
    <div className="vb-practice">
      <div className="vb-setupbar">
        <p>
          <b>{levelName}</b> · {t(settings.formCount === 2 ? 'verbs.two' : 'verbs.three')} · {setName}
        </p>
        <button
          type="button"
          className="vb-btn vb-btn--ghost vb-btn--sm"
          aria-expanded={setupOpen}
          aria-controls="vb-setup"
          onClick={() => setSetupOpen((open) => !open)}
        >
          {t(setupOpen ? 'verbs.setupDone' : 'verbs.setupEdit')}
        </button>
      </div>

      <div id="vb-setup" className={`vb-setup${setupOpen ? ' is-open' : ''}`}>
        <section className="vb-choices">
          <h3>{t('verbs.chooseLevel')}</h3>
          <div className="vb-levels" role="group" aria-label={t('verbs.level')}>
            {LEVEL_CARDS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={settings.practiceLevel === l}
                onClick={() => drill.updateScope({ practiceLevel: l })}
              >
                <strong>{l === 'all' ? 'A1–B1' : l}</strong>
                <span>{t('verbs.level' + l)}</span>
              </button>
            ))}
          </div>
          <div className="vb-formchoice">
            <h3>{t('verbs.chooseForms')}</h3>
            <div className="vb-formswitch" role="group">
              {[2, 3].map((n) => (
                <button key={n} type="button" aria-pressed={settings.formCount === n} onClick={() => drill.updateScope({ formCount: n })}>
                  <strong>{t(n === 2 ? 'verbs.two' : 'verbs.three')}</strong>
                  <span>{n === 2 ? 'V1 → V2' : 'V1 → V2 → V3'}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="vb-levelhelp">{t('verbs.levelHelp' + settings.practiceLevel)}</p>
        </section>

        <div className="vb-scope">
          <label>
            <span>{t('verbs.practiceScope')}</span>
            <select value={settings.set} onChange={(e) => drill.updateScope({ set: e.target.value })}>
              <option value="all">{t('verbs.scopeAll')}</option>
              <option value="saved">{t('verbs.scopeSaved')}</option>
              {data.groups.map((g) => (
                <option key={g} value={g}>
                  {t('verbs.group_' + g)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('verbs.setSize')}</span>
            <select value={String(settings.limit)} onChange={(e) => drill.updateScope({ limit: Number(e.target.value) })}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="0">{t('verbs.allItems')}</option>
            </select>
          </label>
          <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.shuffleSession()}>
            {t('verbs.shuffle')}
          </button>
        </div>
        <p className="vb-scopenote">
          {isContextual(snap.mode)
            ? t('verbs.scopeExercises', { n: snap.available.length, count })
            : t('verbs.scopeNote', { n: selectedCount, forms: snap.formCount, count })}
        </p>
      </div>

      <div
        className="vb-modes"
        ref={modesRef}
        role="tablist"
        aria-label={t('verbs.modes')}
        onKeyDown={(e) => tabArrows(e, (i) => drill.setMode(MODES[i]))}
      >
        {MODES.map((m, i) => (
          <button
            key={m}
            type="button"
            role="tab"
            id={`vb-mode-${m}`}
            aria-selected={snap.mode === m}
            aria-controls="vb-exercise"
            tabIndex={snap.mode === m ? 0 : -1}
            onClick={() => drill.setMode(m)}
          >
            <span className="vb-modes__num">0{i + 1}</span>
            <span>{t('verbs.' + m)}</span>
          </button>
        ))}
      </div>

      <div className={`vb-layout${repeat ? '' : ' is-single'}`}>
        <div className="vb-main">
          {/* Тумблер — настройка «играть бит под формы», а не «звучит ли сейчас»:
              прототип в покое писал «выключен», хотя попытка стартовала с битом.
              Послушать бит заранее — отдельная кнопка рядом. */}
          {repeat ? (
            <div className="vb-beat">
              <div>
                <div className="vb-row">
                  <button type="button" className="vb-beat__toggle" aria-pressed={settings.beat} onClick={() => drill.toggleBeat()}>
                    <span className="vb-beat__dot" />
                    <span>{t(settings.beat ? 'verbs.beatOn' : 'verbs.beatOff')}</span>
                  </button>
                  <button type="button" className="vb-beat__preview" disabled={snap.busy} onClick={() => drill.togglePreview()}>
                    {snap.previewing ? <StopIcon /> : <PlayIcon />}
                    <span>{t(snap.previewing ? 'verbs.beatPreviewStop' : 'verbs.beatPreview')}</span>
                  </button>
                </div>
                <p>{t('verbs.beatHint')}</p>
              </div>
              <label>
                <span>{t('verbs.beatVolume')}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => drill.setBeatVolume(Number(e.target.value))}
                />
              </label>
            </div>
          ) : snap.mode === 'gap' ? (
            // Только у пропуска: он устный, и строка объясняет, почему нет
            // бита. В письменных режимах она ничего не сообщала.
            <p className="vb-muted vb-silent">{t('verbs.silentMode')}</p>
          ) : null}

          <section
            className="vb-drill"
            id="vb-exercise"
            role="tabpanel"
            aria-labelledby={`vb-mode-${snap.mode}`}
            data-exercise={snap.mode}
          >
            <div className="vb-drill__top">
              <span className="vb-eyebrow">{t('verbs.item', { n: count ? Math.min(snap.idx + 1, count) : 0, total: count })}</span>
              {badge && <span className="vb-pill">{badge}</span>}
            </div>
            <div className="vb-track">
              <div style={{ width: `${progress}%` }} />
            </div>
            {spoken && !summary && (
              <div className="vb-phases">
                {PHASES.map((p) => (
                  <span key={p} className={snap.phase === p ? 'is-on' : undefined}>
                    {t('verbs.' + p)}
                  </span>
                ))}
              </div>
            )}
            {repeat && !summary && (
              <div className="vb-counts" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={snap.highlight === i ? 'is-on' : undefined}>
                    {i + 1}
                    {i >= snap.formCount && <small>{t('verbs.restBeat')}</small>}
                  </span>
                ))}
              </div>
            )}
            {!summary && <p className="vb-instruction">{instruction}</p>}
            {spoken && !summary && count > 0 && (
              <div className={`vb-tiles${snap.formCount === 2 ? ' is-two' : ''}`} lang="en">
                {forms.map((f, i) => {
                  const blank = snap.mode === 'gap' && i === snap.gap
                  return (
                    <div key={i} className={`vb-tile${blank ? ' is-blank' : ''}${snap.highlight === i ? ' is-on' : ''}`}>
                      <small>V{i + 1}</small>
                      <span>{blank && !snap.result ? '____' : f}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {note && (
              <p className="vb-example" lang="en">
                {t('verbs.variants')}: {note}
              </p>
            )}
            {repeat && !summary && <RhythmLeds drill={drill} snap={snap} audible={beatAudible} t={t} />}

            <div className={`vb-stage vb-stage--${snap.mode}`}>
              <Stage drill={drill} snap={snap} data={data} t={t} lang={lang} token={token} onGoTable={onGoTable} />
            </div>

            {snap.notice && (
              <div className="vb-notice" role="status">
                {t('verbs.' + snap.notice.key)}
                {/* Действия выбирает машина: без распознавания «Повторить» бесполезно. */}
                {snap.notice.actions && (
                  <div className="vb-row">
                    {snap.notice.actions.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="vb-link"
                        onClick={() => (a === 'retry' ? drill.startAttempt('speech') : drill.fallbackManual())}
                      >
                        {t(a === 'retry' ? 'verbs.retry' : 'verbs.manual')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {snap.busy && (
              <button type="button" className="vb-link vb-danger vb-stop" onClick={() => drill.abort()}>
                {t('verbs.stop')}
              </button>
            )}
          </section>
          {spoken && snap.canListen && <p className="vb-muted vb-scoring">{t('verbs.scoringNote')}</p>}
        </div>

        {repeat && (
          <aside className="vb-aside">
            <section className="vb-card vb-progress">
              <div className="vb-progress__head">
                <h3>{t('verbs.yourProgress')}</h3>
                <span className="vb-pill">
                  {snap.queue.filter((it) => snap.scores[it.id] && snap.scores[it.id].done).length} / {count}
                </span>
              </div>
              <div className="vb-progress__list">
                {snap.queue.map((it, i) => {
                  const v = drill.byVerb[it.verb]
                  const sc = snap.scores[it.id]
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`vb-progress__verb${snap.idx === i ? ' is-on' : ''}`}
                      onClick={() => drill.select(i)}
                    >
                      <span lang="en">
                        {rhythmForms(v).slice(0, snap.formCount).join(' · ')}
                        {lang !== 'en' && <small lang={lang}>{lang === 'kk' ? v.kk : v.ru}</small>}
                      </span>
                      <span className="vb-progress__mark">{scoreMark(sc)}</span>
                    </button>
                  )
                })}
              </div>
            </section>
            <details className="vb-card vb-settings">
              <summary>{t('verbs.settings')}</summary>
              <div className="vb-settings__stack">
                <label>
                  <span>{t('verbs.tempo')}</span>
                  <b>{settings.bpm} BPM</b>
                  <input
                    type="range"
                    min="72"
                    max="116"
                    value={settings.bpm}
                    onChange={(e) => drill.setTempo(Number(e.target.value))}
                  />
                </label>
                <div className="vb-seg">
                  {TEMPO_PRESETS.map(([k, bpm]) => (
                    <button key={k} type="button" aria-pressed={settings.bpm === bpm} onClick={() => drill.setTempo(bpm)}>
                      {t('verbs.' + k)}
                    </button>
                  ))}
                </div>
                {snap.tempoPending && <p className="vb-muted">{t('verbs.tempoNext')}</p>}
                <div>
                  <span className="vb-settings__label">{t('verbs.rhythmVoice')}</span>
                  <p className="vb-muted">{t('verbs.rhythmVoiceNote')}</p>
                </div>
                <label>
                  <span>{t('verbs.tutorVolume')}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.tutor}
                    onChange={(e) => drill.setTutorVolume(Number(e.target.value))}
                  />
                </label>
                <label className="vb-check">
                  <input type="checkbox" checked={settings.auto} onChange={(e) => drill.setAuto(e.target.checked)} />
                  <span>{t('verbs.auto')}</span>
                </label>
                <button
                  type="button"
                  className="vb-link"
                  onClick={() => {
                    if (window.confirm(t('verbs.confirmReset'))) onResetProgress()
                  }}
                >
                  {t('verbs.resetProgress')}
                </button>
              </div>
            </details>
          </aside>
        )}
      </div>
    </div>
  )
}

// Стрелки по вкладкам — как у role="tablist" в прототипе: влево/вправо по
// кругу, Home/End — к краям; фокус едет вслед за выбором.
export function tabArrows(e, select) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]'))
  const index = tabs.indexOf(document.activeElement)
  if (index < 0) return
  e.preventDefault()
  const next =
    e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  select(next)
  tabs[next].focus()
}

// Шестнадцать лампочек такта и номер такта. Кадры бита — 60 в секунду, и
// гонять их через React незачем: лампочки красим напрямую по beat.lastStep.
// Цикл крутится только пока бит идёт — стоящему биту кадры не нужны.
function RhythmLeds({ drill, snap, audible, t }) {
  const ledsRef = useRef(null)
  const barRef = useRef(null)
  useEffect(() => {
    const paint = (step) => {
      const leds = ledsRef.current ? ledsRef.current.children : []
      for (let i = 0; i < leds.length; i++) leds[i].classList.toggle('is-on', step >= 0 && i === step % 16)
      if (barRef.current) barRef.current.textContent = String(step >= 0 ? Math.floor(step / 16) + 1 : 1).padStart(2, '0')
    }
    if (!snap.running) {
      paint(-1)
      return undefined
    }
    let frame = 0
    let last = -2
    const loop = () => {
      const beat = drill.beat
      const step = beat.running ? beat.lastStep : -1
      if (step !== last) {
        last = step
        paint(step)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [drill, snap.running])
  return (
    <div className="vb-rhythm">
      <div className="vb-leds" ref={ledsRef} aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="vb-rhythm__label">
        <span>{audible ? `${snap.bpm} BPM` : t('verbs.silentGuide')}</span>
        <span>
          {t('verbs.bar')} <b ref={barRef}>01</b>
        </span>
      </div>
    </div>
  )
}

function Stage({ drill, snap, data, t, lang, token, onGoTable }) {
  const last = snap.idx >= snap.count - 1

  if (snap.phase === 'summary') return <Summary drill={drill} snap={snap} t={t} onGoTable={onGoTable} />

  if (!snap.count) {
    return (
      <>
        <p className="vb-empty">{t(isContextual(snap.mode) ? 'verbs.emptyWritten' : 'verbs.emptyScope')}</p>
        <button type="button" className="vb-btn" onClick={() => drill.updateScope({ set: 'all' })}>
          {t('verbs.scopeAll')}
        </button>
      </>
    )
  }

  if (!isSpoken(snap.mode)) {
    return <VerbsWritten key={`${snap.mode}:${snap.formCount}:${snap.item.id}`} drill={drill} snap={snap} data={data} token={token} />
  }

  if (snap.result) return <SpokenResult drill={drill} snap={snap} t={t} last={last} />

  const stage = snap.stage
  if (stage.kind === 'status') return <p className="vb-status">{t('verbs.' + stage.key)}</p>
  if (stage.kind === 'countdown') {
    return (
      <>
        <p className="vb-status">{t('verbs.counting')}</p>
        <div className="vb-countdown">{stage.n}</div>
      </>
    )
  }
  if (stage.kind === 'speaking') {
    return (
      <>
        <p className="vb-status">{t('verbs.' + stage.key)}</p>
        {stage.mic ? (
          <>
            <MicMeter drill={drill} label={t('verbs.micLevel')} />
            <p className="vb-live">{snap.transcript}</p>
            <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.finishSpeaking()}>
              {t('verbs.finishSpeaking')}
            </button>
          </>
        ) : (
          <div className="vb-row vb-row--center">
            <button type="button" className="vb-btn" onClick={() => drill.finishManual('manual')}>
              {t('verbs.familiar')}
            </button>
            <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.againCycle()}>
              {t('verbs.againCycle')}
            </button>
          </div>
        )}
      </>
    )
  }

  // Готов к попытке. Слушать нечем (Firefox, встроенные браузеры приложений)
  // — кнопок микрофона нет вовсе: раньше об этом узнавали только после
  // нажатия, из сообщения с бесполезным «Повторить».
  const listen = snap.canListen
  return (
    <>
      <div className="vb-stack">
        {snap.mode === 'repeat' ? (
          <>
            <button type="button" className="vb-btn" onClick={() => drill.startAttempt('manual')}>
              {t('verbs.listenRepeat')}
            </button>
            {listen && (
              <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.startAttempt('speech')}>
                {t('verbs.checkWithMic')}
              </button>
            )}
          </>
        ) : (
          <>
            {listen && (
              <button type="button" className="vb-btn" onClick={() => drill.startAttempt('speech')}>
                {t('verbs.sayNow')}
              </button>
            )}
            <button type="button" className={`vb-btn${listen ? ' vb-btn--ghost' : ''}`} onClick={() => drill.reveal()}>
              {t('verbs.revealAnswer')}
            </button>
          </>
        )}
      </div>
      {snap.mode === 'repeat' && <p className="vb-privacy">{t('verbs.rhythmVoiceNote')}</p>}
      {listen ? (
        <p className="vb-privacy">{t('verbs.micPrivacy')}</p>
      ) : (
        <p className="vb-privacy vb-nomic">{t(snap.mode === 'repeat' ? 'verbs.noMicRepeat' : 'verbs.noMicGap')}</p>
      )}
    </>
  )
}

// Уровень микрофона — тень вокруг кружка, как в прототипе. Значение приходит
// из VerbDrill.meterLoop мимо React.
function MicMeter({ drill, label }) {
  const ref = useRef(null)
  useEffect(() => {
    drill.onMeter((px) => {
      if (ref.current) ref.current.style.setProperty('--level', `${px}px`)
    })
    return () => drill.onMeter(null)
  }, [drill])
  return (
    <div className="vb-mic" ref={ref} aria-label={label}>
      <MicIcon />
    </div>
  )
}

function SpokenResult({ drill, snap, t, last }) {
  const r = snap.result
  const manual = r.kind === 'manual'
  const expected = drill.expected()
  const rows = r.score ? r.score.results : expected.map((form) => ({ form }))
  return (
    <>
      <h3>{r.kind === 'speech' ? t('verbs.score', { n: r.score.hits, total: r.score.total }) : t('verbs.manualResult')}</h3>
      <div className="vb-chips-result">
        {rows.map((x, i) => (
          <div key={i} className={`vb-resultchip${manual ? ' is-neutral' : x.heard ? ' is-ok' : ''}`} lang="en">
            <span>{(manual ? '' : x.heard ? '✓ ' : '↻ ') + x.form}</span>
            <small>{manual ? t('verbs.revealCounts') : t(x.heard ? 'verbs.heard' : 'verbs.notHeard')}</small>
          </div>
        ))}
      </div>
      {r.kind === 'speech' && (
        <p className="vb-transcript">{r.text ? `${t('verbs.transcript')}: “${r.text}”` : t('verbs.nothing')}</p>
      )}
      <div className="vb-row vb-row--center vb-result-actions">
        <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.startAttempt(snap.input)}>
          {t('verbs.tryAgain')}
        </button>
        {snap.mode === 'repeat' && (
          <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.startAttempt('manual')}>
            {t('verbs.hearAgain')}
          </button>
        )}
        <button type="button" className="vb-btn" onClick={() => drill.next()}>
          {t(last ? 'verbs.finishSet' : 'verbs.next')} →
        </button>
      </div>
      {snap.autoPending && (
        <button type="button" className="vb-link" onClick={() => drill.cancelAuto()}>
          {t('verbs.cancelAuto')}
        </button>
      )}
    </>
  )
}

function Summary({ drill, snap, t, onGoTable }) {
  const s = summarize(snap.queue, snap.scores)
  return (
    <>
      <h3>{t('verbs.doneTitle')}</h3>
      <div className="vb-finish">
        {s.done} / {s.count}
      </div>
      <p className="vb-muted">{t('verbs.sessionCompleted', { n: s.done, total: s.count })}</p>
      {s.total > 0 && (
        <p className="vb-muted">{t(isSpoken(snap.mode) ? 'verbs.score' : 'verbs.writtenScore', { n: s.hits, total: s.total })}</p>
      )}
      <div className="vb-row vb-row--center">
        <button type="button" className="vb-btn" onClick={() => drill.restart()}>
          {t('verbs.restart')}
        </button>
        <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.shuffleSession()}>
          {t('verbs.shuffle')}
        </button>
        <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.tricky()}>
          {t('verbs.tricky')}
        </button>
        <button type="button" className="vb-btn vb-btn--ghost" onClick={onGoTable}>
          {t('verbs.back')}
        </button>
      </div>
    </>
  )
}
