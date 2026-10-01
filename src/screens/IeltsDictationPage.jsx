import { useEffect, useRef, useState } from 'react'
import { checkIeltsAnswer, getIeltsTest, submitIeltsAttempt } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useI18n } from '../i18n.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import ProgressRing from '../ielts/ui/ProgressRing.jsx'
import PillButton from '../ielts/ui/PillButton.jsx'
import { setIeltsParams } from '../ielts/urlParams.js'
import { CloseIcon, HeadphonesIcon, Replay5Icon } from '../ielts/icons.jsx'

/**
 * Диктовка и «Тренировка правописания» (прототип 14-listening-dictation): фраза звучит — ученик печатает, сервер
 * сверяет по словам (IeltsWordsChecker = JTS.check.words) и отдаёт статус каждого слова эталона. Переслушать можно
 * сколько угодно и медленнее (0.75×) — это тренировка, не экзамен. В конце все ответы сдаются одной попыткой.
 */
export default function IeltsDictationPage({ token, target, onExit }) {
  const { t } = useI18n()
  const testId = target?.testId
  const authToken = token || loadToken()
  const [state, setState] = useState({ status: 'loading' })
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [busy, setBusy] = useState(false)
  const [rate, setRate] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [final, setFinal] = useState(null)
  const [error, setError] = useState(null)
  const audioRef = useRef(null)
  const inputRef = useRef(null)
  const startedAt = useRef(new Date().toISOString())

  useEffect(() => {
    if (!testId) return
    let alive = true
    getIeltsTest(authToken, testId)
      .then((r) => alive && setState({ status: 'ready', doc: r.document, test: r.test }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive = false
    }
  }, [authToken, testId])

  useEffect(() => {
    if (!testId) return
    setIeltsParams({ ieltsRun: testId, ieltsSkill: 'dictation' })
    return () => setIeltsParams({ ieltsRun: null, ieltsSkill: null })
  }, [testId])

  useEffect(() => {
    const a = new Audio()
    a.onplay = () => setPlaying(true)
    a.onpause = () => setPlaying(false)
    a.onended = () => {
      setPlaying(false)
      inputRef.current?.focus()
    }
    audioRef.current = a
    return () => a.pause()
  }, [])

  if (!testId || state.status === 'missing' || state.status === 'error') {
    return (
      <div className="ih-run ih-run--empty">
        <EmptyState icon={<HeadphonesIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        <button type="button" className="ih-btn ih-btn--outline" onClick={() => onExit?.()}>{t('ieltsReading.back')}</button>
      </div>
    )
  }
  if (state.status === 'loading') return <div className="ih-run ih-run--empty"><p className="ih-muted">{t('ieltsReading.loading')}</p></div>

  const { doc, test } = state
  const spelling = doc.kind === 'spelling'
  const items = (doc.groups || []).flatMap((g) => g.items || [])
  const item = items[i]
  const result = item ? results[item.id] : null

  const play = (r = rate) => {
    const a = audioRef.current
    const url = item?.audio?.url
    if (!a || !url) return
    if (a.src !== url) a.src = url
    a.currentTime = 0
    a.defaultPlaybackRate = r
    a.playbackRate = r
    a.play().catch(() => setError(t('ieltsListening.audioError')))
  }

  const check = async () => {
    const given = answers[item.id] || ''
    if (!given.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await checkIeltsAnswer(authToken, testId, item.id, given)
      setResults((m) => ({ ...m, [item.id]: res }))
    } catch {
      setError(t('ieltsReading.checkFailed'))
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    setBusy(true)
    try {
      const res = await submitIeltsAttempt(authToken, testId, {
        mode: 'practice',
        answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => String(v).trim())),
        startedAt: startedAt.current,
        timeSec: Math.round((Date.now() - Date.parse(startedAt.current)) / 1000),
        device: window.innerWidth < 900 ? 'mobile' : 'desktop',
      })
      setFinal(res.attempt)
    } catch {
      setError(t('ieltsReading.submitFailed'))
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    audioRef.current?.pause()
    if (i < items.length - 1) {
      setI(i + 1)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else finish()
  }

  const restart = () => {
    setI(0)
    setAnswers({})
    setResults({})
    setFinal(null)
    startedAt.current = new Date().toISOString()
  }

  const title = spelling ? t('ieltsLearn.listening.spelling') : t('ieltsLearn.listening.dictation')
  const words = result?.words
  const accuracies = Object.values(results).map((r) => r.words?.accuracy ?? 0)
  const avg = accuracies.length ? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100) : 0

  return (
    <div className="ih-run ih-dict">
      <header className="ih-run__top">
        <button type="button" className="ih-round" onClick={() => { audioRef.current?.pause(); onExit?.() }} aria-label={t('ieltsReading.close')}>
          <CloseIcon size={20} />
        </button>
        <div className="ih-run__title">
          <b>{title} · {test.title}</b>
          <span>{final ? t('ieltsListening.dict.done') : t('ieltsListening.dict.phraseOf', { n: String(i + 1), total: String(items.length) })}</span>
        </div>
        <span className="ih-run__spacer" />
        <span className="ih-dict__progress" aria-hidden="true"><span style={{ width: `${((final ? items.length : i) / items.length) * 100}%` }} /></span>
      </header>

      <main className="ih-dict__main">
        {error && <p className="ih-run__error" role="alert">{error}</p>}
        {final ? (
          <section className="ih-card ih-dict__card ih-dict__final">
            <ProgressRing value={final.rawScore} max={final.maxScore} size={88} stroke={8} label={`${Math.round((final.rawScore / Math.max(1, final.maxScore)) * 100)}%`} />
            <h2>{t('ieltsListening.dict.resultTitle')}</h2>
            <p>{t('ieltsListening.dict.resultText', { ok: String(final.rawScore), total: String(final.maxScore) })}</p>
            <div className="ih-dict__actions">
              <PillButton variant="outline" onClick={restart}>{t('ieltsReading.review.again')}</PillButton>
              <PillButton variant="primary" onClick={() => onExit?.()}>{t('ieltsListening.dict.toLearn')}</PillButton>
            </div>
          </section>
        ) : (
          <section className="ih-card ih-dict__card">
            {item?.prompt && <span className="ih-dict__label">{item.prompt}</span>}
            <div className="ih-dict__player">
              <button type="button" className={`ih-player__play ${playing ? 'is-playing' : ''}`} onClick={() => (playing ? audioRef.current.pause() : play())} disabled={!item?.audio?.url}
                aria-label={playing ? t('ieltsListening.pause') : t('ieltsListening.play')}>
                {playing ? <><i /><i /></> : <b className="ih-player__tri" />}
              </button>
              <button type="button" className="ih-round" onClick={() => play()} disabled={!item?.audio?.url} aria-label={t('ieltsListening.again')}>
                <Replay5Icon size={20} />
              </button>
              <span className="ih-player__rates" role="radiogroup" aria-label={t('ieltsListening.speed')}>
                {[0.75, 1].map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => { setRate(r); play(r) }}>
                    {r === 1 ? '1×' : '0.75×'}
                  </button>
                ))}
              </span>
              {!item?.audio?.url && <span className="ih-muted">{t('ieltsListening.noAudio')}</span>}
            </div>
            {spelling ? (
              <input
                ref={inputRef}
                className="ih-dict__input"
                inputMode={item.inputmode || 'text'}
                value={answers[item.id] || ''}
                onChange={(e) => setAnswers((m) => ({ ...m, [item.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (result ? next() : check())}
                placeholder={t('ieltsListening.dict.placeholder')}
                autoComplete="off" autoCapitalize="off" spellCheck={false}
                disabled={!!result}
              />
            ) : (
              <textarea
                ref={inputRef}
                className="ih-dict__input"
                rows={3}
                value={answers[item.id] || ''}
                onChange={(e) => setAnswers((m) => ({ ...m, [item.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); result ? next() : check() } }}
                placeholder={t('ieltsListening.dict.placeholder')}
                autoComplete="off" autoCapitalize="off" spellCheck={false}
                disabled={!!result}
              />
            )}

            {words && (
              <div className="ih-dict__result" aria-live="polite">
                <div className="ih-dict__words">
                  {words.units.map((u, k) => (
                    <span key={k} className={`ih-word ih-word--${u.status}`} title={u.given && u.given !== u.text ? `${t('ieltsReading.review.yours')}: ${u.given}` : undefined}>
                      {u.text}
                    </span>
                  ))}
                  {words.extra.map((x, k) => <span key={`x${k}`} className="ih-word ih-word--extra">{x}</span>)}
                </div>
                <p>
                  <b>{Math.round(words.accuracy * 100)} %</b> · {t('ieltsListening.dict.wordsOk', { ok: String(words.ok), total: String(words.total) })}
                </p>
                {spelling && result.reveal?.spoken && <p className="ih-muted">{t('ieltsListening.dict.spoken')}: «{result.reveal.spoken}»</p>}
                <ul className="ih-dict__legend">
                  {['ok', 'spelling', 'wrong', 'missing'].map((k) => <li key={k}><i className={`ih-word ih-word--${k}`} />{t(`ieltsListening.word.${k}`)}</li>)}
                </ul>
              </div>
            )}

            <div className="ih-dict__actions">
              {Object.keys(results).length > 0 && <span className="ih-muted">{t('ieltsListening.dict.avg', { n: String(avg) })}</span>}
              <span className="ih-run__spacer" />
              {!result && <PillButton variant="outline" onClick={next}>{t('ieltsListening.dict.skip')}</PillButton>}
              {result ? (
                <PillButton variant="primary" onClick={next} disabled={busy}>
                  {i < items.length - 1 ? t('ieltsReading.next') : t('ieltsReading.finish')}
                </PillButton>
              ) : (
                <PillButton variant="primary" onClick={check} disabled={busy || !String(answers[item.id] || '').trim()}>
                  {t('ieltsReading.check')}
                </PillButton>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
