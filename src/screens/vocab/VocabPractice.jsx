import { useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { initVoices, speak as ttsSpeak } from '../../practice/vocab/audio.js'
import {
  uniqueByKey,
  planCycle,
  translationOf,
  answersMatch,
  writeTranslationOk,
  buildChoiceOptions,
} from './lessonReview.js'
import { recordVocabMisses } from './vocabMisses.js'
import { recordVocabLearned } from './vocabLearned.js'
import {
  IconSpeaker,
  IconCheck,
  IconX,
  IconPlay,
  IconRefresh,
  IconPin,
  IconBulb,
} from './VocabIcons.jsx'

function toWord(card) {
  return {
    key: String(card.id || card.en || '').toLowerCase(),
    word: card.en,
    translationRu: card.ru,
    translationKz: card.kk,
    ipa: card.ipa,
    example: card.example || card.ex || '',
  }
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sentenceFor(word) {
  const raw = String(word.example || '')
  if (!raw) return null
  const blanked = raw
    .replace(/\{\{.+?\}\}/g, '________')
    .replace(new RegExp(`\\b${escapeRe(word.word)}\\b`, 'i'), '________')
  if (!blanked.includes('________')) return null
  return blanked
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function VocabPractice({ cards, lang, title, onExit, speak: speakProp, token, scopeId }) {
  const { t } = useI18n()
  const words = useMemo(() => uniqueByKey((cards || []).map(toWord).filter((w) => w.word)), [cards])
  const byKey = useMemo(() => Object.fromEntries(words.map((w) => [w.key, w])), [words])
  const [phase, setPhase] = useState('intro')
  const [tasks] = useState(() => planCycle(words, 1, null))
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [toast, setToast] = useState('')
  const recordedRef = useRef(false)

  const speak = (text, opts) => {
    initVoices()
    ttsSpeak(text, {
      rate: opts?.slow ? 0.65 : undefined,
      onNoVoice: () => {
        setToast(t('vocab.lesson.noVoice'))
        speakProp?.(text)
      },
    })
  }

  const correct = answers.filter((a) => a.ok).length
  const wrong = answers.length - correct
  const totalQ = Math.max(1, tasks.reduce((n, task) => n + (task.wordKeys?.length || 1), 0))
  const answeredQ = answers.length
  const progress = Math.min(100, Math.round((answeredQ / totalQ) * 100))

  const onDone = (chunk) => {
    const next = answers.concat(chunk)
    setAnswers(next)
    if (idx + 1 >= tasks.length) setPhase('result')
    else setIdx(idx + 1)
  }

  if (!words.length) {
    return (
      <div className="vp-prac">
        <p className="vp-state">{t('vocab.lesson.empty')}</p>
        <button type="button" className="vp-btn ghost" onClick={onExit}>{t('vocab.back')}</button>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="vp-prac">
        <div className="vp-prac-top">
          <button type="button" className="vp-exit" onClick={onExit}>
            <IconX /> <span className="vp-exit-lbl">{t('vocab.prac.exit')}</span>
          </button>
        </div>
        <div className="vp-intro">
          <span className="vp-badge">{t('vocab.prac.check')}</span>
          <div className="big">{t('vocab.home.words', { n: words.length })}</div>
          <h2>{t('vocab.prac.introTitle')}</h2>
          <p>{t('vocab.prac.introLead')}</p>
          <button type="button" className="vp-btn wide" onClick={() => setPhase('run')}>
            {t('vocab.prac.start')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const missMap = {}
    for (const a of answers) {
      if (!a.ok && a.key && byKey[a.key]) missMap[a.key] = byKey[a.key]
    }
    const missed = Object.values(missMap).slice(0, 3)
    const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0
    const good = pct >= 50
    const headline = pct >= 85
      ? t('vocab.prac.resGreat')
      : good
        ? t('vocab.prac.resOk')
        : t('vocab.prac.resBad')

    if (!recordedRef.current) {
      recordedRef.current = true
      const allMissed = Object.values(missMap)
      if (allMissed.length) recordVocabMisses(token, allMissed)
      const okKeys = [...new Set(answers.filter((a) => a.ok && a.key).map((a) => a.key))]
      if (scopeId && okKeys.length) recordVocabLearned(token, scopeId, okKeys)
    }

    return (
      <div className="vp-prac vp-prac--res">
        <div className={`vp-res-card${good ? ' is-good' : ' is-bad'}`}>
          <div className="vp-res-hero" aria-hidden="true">
            <img
              src={good ? '/practice/listening/win.png' : '/practice/listening/lose.png'}
              alt=""
            />
          </div>
          <div className="vp-res-body">
            <h2>{headline}</h2>
            <div className="vp-res-stats">
              <span className="ok"><IconCheck /> {t('vocab.prac.correctN', { n: correct })}</span>
              <span className={`no${wrong > 0 && !good ? ' solid' : ''}`}>
                <IconX /> {t('vocab.prac.wrongN', { n: wrong })}
              </span>
            </div>
            {missed.length > 0 && (
              <div className="vp-res-list">
                <h4>
                  <IconRefresh />
                  {t('vocab.prac.review')}
                </h4>
                {missed.map((w) => (
                  <div className="row" key={w.key}>
                    <b>
                      <button
                        type="button"
                        className="vp-spk"
                        onClick={() => speak(w.word)}
                        aria-label={t('vocab.lesson.listen')}
                      >
                        <IconSpeaker />
                      </button>
                      {w.word}
                    </b>
                    <span>{translationOf(w, lang)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="acts">
              <button type="button" className="vp-btn wide" onClick={onExit}>
                {t('vocab.prac.backDict')}
              </button>
              <button
                type="button"
                className="vp-btn ghost wide"
                onClick={() => {
                  recordedRef.current = false
                  setIdx(0)
                  setAnswers([])
                  setPhase('intro')
                }}
              >
                <IconRefresh /> {t('vocab.prac.again')}
              </button>
            </div>
          </div>
        </div>
        {toast ? <p className="vp-state">{toast}</p> : null}
      </div>
    )
  }

  const task = tasks[idx]
  const itemWords = uniqueByKey((task?.wordKeys || []).map((k) => byKey[k]).filter(Boolean))
  const qLabel = t('vocab.prac.questionOf', { n: Math.min(answeredQ + 1, totalQ), total: totalQ })

  return (
    <div className="vp-prac">
      <div className="vp-prac-top">
        <button type="button" className="vp-exit" onClick={onExit}>
          <IconX /> <span className="vp-exit-lbl">{t('vocab.prac.exit')}</span>
        </button>
        <div className="vp-prac-title">
          <b>{title || t('vocab.practiceTitle')}</b>
          <span>{qLabel}</span>
        </div>
      </div>
      <div className="vp-meter-row">
        <div className="vp-meter"><i style={{ width: `${progress}%` }} /></div>
        <div className="vp-score">
          <span className="ok"><IconCheck /> {correct}</span>
          <span className="no"><IconX /> {wrong}</span>
        </div>
      </div>

      {task?.type === 'choice' && itemWords[0] && (
        <ChoiceUI key={idx} word={itemWords[0]} bank={words} lang={lang} t={t} speak={speak} onDone={onDone} />
      )}
      {task?.type === 'match' && itemWords.length >= 3 && (
        <MatchUI key={idx} words={itemWords} lang={lang} t={t} onDone={onDone} />
      )}
      {task?.type === 'match' && itemWords.length < 3 && itemWords[0] && (
        <ChoiceUI key={idx} word={itemWords[0]} bank={words} lang={lang} t={t} speak={speak} onDone={onDone} />
      )}
      {task?.type === 'dictation' && itemWords[0] && (
        <DictationUI key={idx} word={itemWords[0]} t={t} speak={speak} onDone={onDone} />
      )}
      {task?.type === 'write' && itemWords[0] && (
        sentenceFor(itemWords[0])
          ? <FillUI key={idx} word={itemWords[0]} sentence={sentenceFor(itemWords[0])} lang={lang} t={t} onDone={onDone} />
          : <WriteUI key={idx} word={itemWords[0]} lang={lang} t={t} speak={speak} onDone={onDone} />
      )}
      {toast ? <p className="vp-state">{toast}</p> : null}
    </div>
  )
}

function ChoiceUI({ word, bank, lang, t, speak, onDone }) {
  const options = useMemo(() => buildChoiceOptions(word, bank, lang), [word.key, lang, bank])
  const [picked, setPicked] = useState(null)
  if (!options) return <WriteUI word={word} lang={lang} t={t} speak={speak} onDone={onDone} />

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askChoice')}</p>
      <div className="vp-wordbox">
        <div className="w">
          {word.word}
          {speak ? (
            <button type="button" className="vp-spk" onClick={() => speak(word.word)}>
              <IconSpeaker />
            </button>
          ) : null}
        </div>
        {word.ipa ? <div className="ipa">/{String(word.ipa).replace(/\//g, '')}/</div> : null}
      </div>
      <div className="vp-opts">
        {options.map((opt, i) => {
          let cls = ''
          if (picked) {
            if (opt.ok) cls = ' ok'
            else if (picked === opt) cls = ' no'
            else cls = ' dim'
          }
          return (
            <button
              key={i}
              type="button"
              className={`vp-opt${cls}`}
              disabled={!!picked}
              onClick={() => {
                if (picked) return
                setPicked(opt)
              }}
            >
              {opt.text}
            </button>
          )
        })}
      </div>
      {picked && (
        <div style={{ textAlign: 'center' }}>
          <span className={`vp-fb ${picked.ok ? 'ok' : 'no'}`}>
            {picked.ok ? <><IconCheck /> {t('vocab.prac.correct')}</> : <><IconX /> {t('vocab.prac.incorrect')}</>}
          </span>
        </div>
      )}
      <div className="vp-foot">
        <button
          type="button"
          className="vp-btn wide"
          disabled={!picked}
          onClick={() => onDone([{ key: word.key, ok: !!picked?.ok }])}
        >
          {t('vocab.prac.continue')} <IconPlay />
        </button>
      </div>
    </>
  )
}

function MatchUI({ words, lang, t, onDone }) {
  const items = useMemo(() => uniqueByKey(words), [words])
  const left = useMemo(() => shuffle(items), [items])
  const right = useMemo(() => shuffle(items), [items])
  const [pick, setPick] = useState(null)
  const [done, setDone] = useState({})
  const [flash, setFlash] = useState(null)
  const missedRef = useRef(new Set())
  const allDone = Object.keys(done).length === items.length

  const finish = () => {
    onDone(items.map((w) => ({ key: w.key, ok: !missedRef.current.has(w.key) })))
  }

  const click = (item, col) => {
    if (done[item.key]) return
    if (!pick) {
      setPick({ key: item.key, col })
      return
    }
    if (pick.col === col) {
      setPick({ key: item.key, col })
      return
    }
    const ok = pick.key === item.key
    if (ok) {
      setDone((prev) => ({ ...prev, [item.key]: true }))
      setPick(null)
      setFlash(null)
    } else {
      missedRef.current.add(pick.key)
      missedRef.current.add(item.key)
      setFlash([pick.key, item.key])
      setPick(null)
      setTimeout(() => setFlash(null), 450)
    }
  }

  const cls = (item, col) => {
    if (done[item.key]) return ' ok'
    if (flash?.includes(item.key)) return ' no'
    if (pick?.key === item.key && pick.col === col) return ' sel'
    return ''
  }

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askMatch')}</p>
      <div className="vp-tip"><IconPin /> {t('vocab.prac.matchTip')}</div>
      <div className="vp-pairs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {left.map((w) => (
            <button key={`L-${w.key}`} type="button" className={`vp-pair${cls(w, 'L')}`} disabled={!!done[w.key]} onClick={() => click(w, 'L')}>
              {w.word}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {right.map((w) => (
            <button key={`R-${w.key}`} type="button" className={`vp-pair${cls(w, 'R')}`} disabled={!!done[w.key]} onClick={() => click(w, 'R')}>
              {translationOf(w, lang)}
            </button>
          ))}
        </div>
      </div>
      <div className="vp-foot">
        <button type="button" className={`vp-btn wide${!allDone ? ' disabled' : ''}`} disabled={!allDone} onClick={finish}>
          {t('vocab.prac.continue')}
        </button>
      </div>
    </>
  )
}

function DictationUI({ word, t, speak, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null)
  const submit = () => {
    if (checked != null || !value.trim()) return
    const ok = answersMatch(value, word.word)
    setChecked(ok)
  }
  const cont = () => onDone([{ key: word.key, ok: !!checked }])

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askListen')}</p>
      <button type="button" className="vp-listen-big" onClick={() => speak(word.word)} aria-label={t('vocab.lesson.listen')}>
        <IconSpeaker size={28} />
      </button>
      <button type="button" className="vp-slow" onClick={() => speak(word.word, { slow: true })}>
        {t('vocab.prac.listenSlow')}
      </button>
      <input
        className={`vp-input${checked == null ? '' : checked ? ' ok' : ' no'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (checked == null ? submit() : cont())}
        placeholder={t('vocab.prac.typeWord')}
        autoCapitalize="off"
        autoCorrect="off"
        disabled={checked != null}
      />
      {checked != null && (
        <div style={{ textAlign: 'center' }}>
          <span className={`vp-fb ${checked ? 'ok' : 'no'}`}>
            {checked ? <><IconCheck /> {t('vocab.prac.correct')}</> : <><IconX /> {t('vocab.prac.incorrect')}</>}
          </span>
        </div>
      )}
      <div className="vp-foot">
        {checked == null ? (
          <button type="button" className="vp-btn wide" disabled={!value.trim()} onClick={submit}>
            {t('vocab.lesson.check')}
          </button>
        ) : (
          <button type="button" className="vp-btn wide" onClick={cont}>
            {t('vocab.prac.continue')} <IconPlay />
          </button>
        )}
      </div>
    </>
  )
}

function WriteUI({ word, lang, t, speak, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(null)
  const submit = () => {
    if (checked != null || !value.trim()) return
    setChecked(writeTranslationOk(value, word))
  }
  const cont = () => onDone([{ key: word.key, ok: !!checked }])

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askWrite')}</p>
      <div className="vp-wordbox">
        <div className="w">
          {word.word}
          {speak ? (
            <button type="button" className="vp-spk" onClick={() => speak(word.word)}>
              <IconSpeaker />
            </button>
          ) : null}
        </div>
        {word.ipa ? <div className="ipa">/{String(word.ipa).replace(/\//g, '')}/</div> : null}
      </div>
      <input
        className={`vp-input${checked == null ? '' : checked ? ' ok' : ' no'}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (checked == null ? submit() : cont())}
        placeholder={t('vocab.prac.typeTr')}
        disabled={checked != null}
      />
      {checked != null && (
        <div style={{ textAlign: 'center' }}>
          <span className={`vp-fb ${checked ? 'ok' : 'no'}`}>
            {checked ? <><IconCheck /> {t('vocab.prac.correct')}</> : <><IconX /> {t('vocab.prac.incorrect')}</>}
          </span>
          {!checked && <p className="vp-state">{translationOf(word, lang)}</p>}
        </div>
      )}
      <div className="vp-foot">
        {checked == null ? (
          <button type="button" className="vp-btn wide" disabled={!value.trim()} onClick={submit}>
            {t('vocab.lesson.check')}
          </button>
        ) : (
          <button type="button" className="vp-btn wide" onClick={cont}>
            {t('vocab.prac.continue')} <IconPlay />
          </button>
        )}
      </div>
    </>
  )
}

function FillUI({ word, sentence, lang, t, onDone }) {
  const letters = word.word.split('')
  const [chars, setChars] = useState(() => letters.map(() => ''))
  const [opened, setOpened] = useState(() => letters.map((_, i) => i === 0))
  const [checked, setChecked] = useState(null)
  const [msg, setMsg] = useState('')
  const meaning = translationOf(word, lang || 'ru')
  const active = chars.findIndex((c, i) => !opened[i] && !c)

  const setAt = (i, ch) => {
    if (opened[i] || checked != null) return
    const next = chars.slice()
    next[i] = ch.slice(-1)
    setChars(next)
  }

  const openLetter = () => {
    const i = opened.findIndex((o, idx) => !o && !chars[idx])
    if (i < 0) return
    const nextO = opened.slice()
    nextO[i] = true
    const nextC = chars.slice()
    nextC[i] = letters[i]
    setOpened(nextO)
    setChars(nextC)
  }

  const giveUp = () => {
    setChars(letters.slice())
    setOpened(letters.map(() => true))
    setChecked(false)
    setMsg('')
  }

  const submit = () => {
    if (checked != null) return
    const typed = chars.map((c, i) => (opened[i] ? letters[i] : c)).join('')
    const ok = answersMatch(typed, word.word)
    if (!ok) {
      openLetter()
      setMsg(t('vocab.prac.openMore'))
      return
    }
    setChecked(true)
    setMsg('')
  }

  const cont = () => onDone([{ key: word.key, ok: checked === true }])
  const filled = chars.every((c, i) => opened[i] || c)

  return (
    <>
      <p className="vp-howto">{t('vocab.prac.askFill')}</p>
      <div className="vp-wordbox">
        <p style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700, lineHeight: 1.45 }}>{sentence}</p>
        <div className="vp-letters">
          {letters.map((L, i) => {
            const shown = opened[i] ? L : chars[i]
            const isActive = i === (active < 0 ? letters.length - 1 : active)
            let cls = 'vp-letter'
            if (opened[i] && checked == null) cls += i === 0 ? ' revealed' : ' hint'
            if (checked === true) cls += ' ok'
            if (checked === false) cls += ' no'
            if (isActive && checked == null && !opened[i]) cls += ' on'
            return (
              <input
                key={i}
                className={cls}
                maxLength={1}
                value={shown}
                disabled={opened[i] || checked != null}
                onChange={(e) => setAt(i, e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            )
          })}
        </div>
        {msg ? <p className="vp-state" style={{ color: 'var(--vp-red)' }}>{msg}</p> : null}
        {meaning ? (
          <div className="vp-meaning">
            <IconBulb /> {t('vocab.prac.meaning', { m: meaning })}
          </div>
        ) : null}
        <div className="vp-fill-acts">
          <button type="button" className="vp-btn ghost" onClick={openLetter} disabled={checked != null}>
            {t('vocab.prac.openLetter')}
          </button>
          <button type="button" className="vp-btn ghost" onClick={giveUp} disabled={checked != null}>
            {t('vocab.prac.dontKnow')}
          </button>
        </div>
      </div>
      <div className="vp-foot">
        {checked == null ? (
          <button type="button" className="vp-btn wide" disabled={!filled} onClick={submit}>
            {t('vocab.lesson.check')}
          </button>
        ) : (
          <button type="button" className="vp-btn wide" onClick={cont}>
            {t('vocab.prac.continue')} <IconPlay />
          </button>
        )}
      </div>
    </>
  )
}
