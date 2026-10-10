import { useEffect, useRef, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { RunTopBar } from '../mock/MockRunHeader.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { speakTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'
import { useRecorder } from './useRecorder.js'
import { CheckIcon, HeadphonesIcon, MicIcon, PlayIcon } from '../icons.jsx'
import OnboardingTour, { useScreenTour } from '../../tutor/OnboardingTour.jsx'
import { useI18n } from '../../i18n.jsx'

// Тур показывается сам при первом заходе, дальше — по «?» в шапке (как на «Главной» и в «Домашней работе»)
const TOUR_KEY = 'jts_tour_ielts_shadowing'

/**
 * Shadowing (прототип 40-speaking): диктор говорит фразу по смысловым группам — ученик повторяет за ним и сравнивает
 * свою запись с оригиналом. Всё локально: запись остаётся в браузере и пропадает с уходом с экрана. Темп 0.75× —
 * для первого прохода, как в прототипе. Нет записи диктора — фраза звучит голосом Soniox.
 *
 * Каждая фраза — три шага одной строкой (Слушать → Повторить → Сравнить): раньше были две кнопки и голый <audio>,
 * и ученик не понимал, что сравнивать и чем фраза «закончена».
 */
// bar — экран на весь экран со своей шапкой (RunTopBar): «?» тура живёт в ней, поэтому шапку рисует сам экран
export default function ShadowingView({ token, testId, onBack, onBackToList, bar = null }) {
  const { t } = useI18n()
  const rec = useRecorder()
  const [state, setState] = useState({ status: 'loading' })
  const [rate, setRate] = useState(1)
  const [playing, setPlaying] = useState(null)
  const [takes, setTakes] = useState({})
  const [heard, setHeard] = useState({})
  const audioRef = useRef(null)
  const tour = useScreenTour(state.status === 'ready' ? TOUR_KEY : null)

  useEffect(() => {
    let alive = true
    getIeltsTest(token || loadToken(), testId)
      .then((r) => alive && setState({ status: 'ready', doc: r.document, test: r.test }))
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
      audioRef.current?.pause()
      stopTts()
    }
  }, [token, testId])

  const wrap = (body) =>
    bar ? (
      <div className="ih-run ih-run--rl ih-shrun">
        <RunTopBar chip={bar.chip} mode={bar.mode} onExit={bar.onExit}>
          {state.status === 'ready' && (
            <button type="button" className="tour-help" onClick={tour.start} title={t('tour.help')} aria-label={t('tour.help')}>?</button>
          )}
        </RunTopBar>
        <div className="ih-shrun__body">{body}</div>
      </div>
    ) : body

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Speaking', onClick: onBack }, { label: 'Shadowing', onClick: onBackToList }]
  if (state.status !== 'ready')
    return wrap(
      <div className="ih-wguide">
        {!bar && <Breadcrumbs items={crumbs} />}
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>,
    )

  const stopAll = () => {
    audioRef.current?.pause()
    stopTts()
  }

  const play = (ph) => {
    stopAll()
    setPlaying(ph.id)
    setHeard((m) => ({ ...m, [ph.id]: true }))
    const url = ph.audio?.url
    if (!url) {
      speakTts(ph.groups.join(' '), { voice: VOICE.gb, speed: rate < 1 ? 0.8 : 1 }).then(() => setPlaying(null))
      return
    }
    const a = new Audio(url)
    a.playbackRate = rate
    a.onended = () => setPlaying(null)
    a.onerror = () => setPlaying(null)
    audioRef.current = a
    a.play().catch(() => setPlaying(null))
  }

  const playMine = (ph) => {
    stopAll()
    const a = new Audio(takes[ph.id].url)
    setPlaying(`mine-${ph.id}`)
    a.onended = () => setPlaying(null)
    a.onerror = () => setPlaying(null)
    audioRef.current = a
    a.play().catch(() => setPlaying(null))
  }

  const record = (ph) => {
    if (rec.state === 'recording') return rec.stop()
    stopAll()
    rec.start({ maxSec: Math.ceil((ph.audio?.durationSec || 6) * 2 + 3), onDone: (take) => take && setTakes((m) => {
      // прежний дубль этой фразы больше не нужен — его запись освобождается сразу, а не при закрытии вкладки
      rec.drop(m[ph.id]?.url)
      return { ...m, [ph.id]: take }
    }) })
    setPlaying(`rec-${ph.id}`)
  }

  const { doc } = state
  const total = doc.phrases.length
  const done = doc.phrases.filter((ph) => takes[ph.id]).length
  // «Текущая» фраза — первая без записи: на ней акцент, чтобы было видно, с чего продолжить
  const currentId = doc.phrases.find((ph) => !takes[ph.id])?.id
  const tourSteps = [
    { selector: '.ih-shadow__how', title: t('ieltsSpeaking.shTour.how.title'), text: t('ieltsSpeaking.shTour.how.text') },
    { selector: '.ih-shadow__phrase.is-current .ih-shadow__step--listen', title: t('ieltsSpeaking.shTour.listen.title'), text: t('ieltsSpeaking.shTour.listen.text') },
    { selector: '.ih-shadow__phrase.is-current .ih-shadow__step--rec', title: t('ieltsSpeaking.shTour.rec.title'), text: t('ieltsSpeaking.shTour.rec.text') },
    { selector: '.ih-shadow__phrase.is-current .ih-shadow__step--mine', title: t('ieltsSpeaking.shTour.compare.title'), text: t('ieltsSpeaking.shTour.compare.text') },
    { selector: '.ih-shadow__speed', title: t('ieltsSpeaking.shTour.speed.title'), text: t('ieltsSpeaking.shTour.speed.text') },
  ]

  return wrap(
    <div className="ih-wguide ih-shadow">
      {!bar && <Breadcrumbs items={[...crumbs, { label: state.test.title }]} />}
      <header className="ih-shadow__head">
        <h2>{state.test.title}</h2>
        <p>{t('ieltsSpeaking.shadowText')}</p>
      </header>

      <ol className="ih-card ih-shadow__how">
        {['listen', 'rec', 'compare'].map((k, i) => (
          <li key={k}>
            <span className="ih-shadow__how-n">{i + 1}</span>
            <div>
              <b>{t(`ieltsSpeaking.shHow.${k}.title`)}</b>
              <small>{t(`ieltsSpeaking.shHow.${k}.text`)}</small>
            </div>
          </li>
        ))}
      </ol>

      <div className="ih-shadow__bar">
        <div className="ih-shadow__progress">
          <span>{t('ieltsSpeaking.shadowProgress', { n: String(done), total: String(total) })}</span>
          <div className="ih-shadow__track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="ih-shadow__speed">
          <span>{t('ieltsListening.speed')}</span>
          <div className="ih-seg" role="radiogroup" aria-label={t('ieltsListening.speed')}>
            {[1, 0.75].map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => setRate(r)}>{r}×</button>
            ))}
          </div>
        </div>
      </div>
      <p className="ih-muted ih-shadow__privacy">{t('ieltsSpeaking.privacyLocal')}</p>
      {rec.error && <p className="ih-run__error" role="alert">{t(`ieltsSpeaking.micError.${rec.error}`)}</p>}

      {doc.phrases.map((ph, i) => {
        const recNow = rec.state === 'recording' && playing === `rec-${ph.id}`
        const has = !!takes[ph.id]
        const cls = ['ih-card', 'ih-shadow__phrase', has && 'is-done', ph.id === currentId && 'is-current', (playing === ph.id || recNow) && 'is-playing'].filter(Boolean).join(' ')
        return (
          <section key={ph.id} className={cls}>
            <span className="ih-shadow__n" aria-label={has ? t('ieltsSpeaking.shDone') : undefined}>{has ? <CheckIcon size={16} /> : i + 1}</span>
            <p lang="en">{ph.groups.map((g, k) => <span key={k} className="ih-shadow__group">{g}</span>)}</p>
            <div className="ih-shadow__steps">
              <button type="button" className={`ih-shadow__step ih-shadow__step--listen ${heard[ph.id] ? 'is-ok' : ''} ${playing === ph.id ? 'is-on' : ''}`} onClick={() => play(ph)}>
                <HeadphonesIcon size={18} /><span><small>1</small>{t('ieltsSpeaking.listenSpeaker')}</span>
              </button>
              <button type="button" className={`ih-shadow__step ih-shadow__step--rec ${has ? 'is-ok' : ''} ${recNow ? 'is-rec' : ''}`} onClick={() => record(ph)} disabled={rec.state === 'recording' && !recNow}>
                <MicIcon size={18} /><span><small>2</small>{recNow ? t('ieltsSpeaking.stop') : has ? t('ieltsSpeaking.shAgain') : t('ieltsSpeaking.repeatAfter')}</span>
              </button>
              <button type="button" className={`ih-shadow__step ih-shadow__step--mine ${playing === `mine-${ph.id}` ? 'is-on' : ''}`} onClick={() => playMine(ph)} disabled={!has} title={has ? undefined : t('ieltsSpeaking.shMineHint')}>
                <PlayIcon size={16} /><span><small>3</small>{t('ieltsSpeaking.myTake')}</span>
              </button>
            </div>
          </section>
        )
      })}

      {total > 0 && done === total && (
        <div className="ih-card ih-shadow__finish">
          <b>{t('ieltsSpeaking.shFinish.title')}</b>
          <span>{t('ieltsSpeaking.shFinish.text')}</span>
          {onBackToList && <button type="button" className="ih-btn ih-btn--primary" onClick={onBackToList}>{t('ieltsSpeaking.shFinish.back')}</button>}
        </div>
      )}

      {tour.open && <OnboardingTour steps={tourSteps} storageKey={TOUR_KEY} onFinish={tour.finish} />}
    </div>,
  )
}
