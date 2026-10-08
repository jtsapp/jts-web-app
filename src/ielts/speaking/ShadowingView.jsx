import { useEffect, useRef, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { speakTts, stopTts } from '../../lib/speech.js'
import { VOICE } from '../../lib/ttsShared.js'
import { useRecorder } from './useRecorder.js'
import { MicIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

/**
 * Shadowing (прототип 40-speaking): диктор говорит фразу по смысловым группам — ученик повторяет за ним и сравнивает
 * свою запись с оригиналом. Всё локально: запись остаётся в браузере и пропадает с уходом с экрана. Темп 0.75× —
 * для первого прохода, как в прототипе. Нет записи диктора — фраза звучит голосом Soniox.
 */
// embedded — внутри экрана прохождения (RunTopBar сверху, без меню раздела): хлебные крошки там лишние
export default function ShadowingView({ token, testId, onBack, onBackToList, embedded = false }) {
  const { t } = useI18n()
  const rec = useRecorder()
  const [state, setState] = useState({ status: 'loading' })
  const [rate, setRate] = useState(1)
  const [playing, setPlaying] = useState(null)
  const [takes, setTakes] = useState({})
  const audioRef = useRef(null)

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

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBack }, { label: 'Speaking', onClick: onBack }, { label: 'Shadowing', onClick: onBackToList }]
  if (state.status !== 'ready')
    return (
      <div className="ih-wguide">
        {!embedded && <Breadcrumbs items={crumbs} />}
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>
    )

  const play = (ph) => {
    audioRef.current?.pause()
    stopTts()
    setPlaying(ph.id)
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

  const record = (ph) => {
    if (rec.state === 'recording') return rec.stop()
    rec.start({ maxSec: Math.ceil((ph.audio?.durationSec || 6) * 2 + 3), onDone: (take) => take && setTakes((m) => {
      // прежний дубль этой фразы больше не нужен — его запись освобождается сразу, а не при закрытии вкладки
      rec.drop(m[ph.id]?.url)
      return { ...m, [ph.id]: take }
    }) })
    setPlaying(`rec-${ph.id}`)
  }

  const { doc } = state
  const done = Object.keys(takes).length
  return (
    <div className="ih-wguide ih-shadow">
      {!embedded && <Breadcrumbs items={[...crumbs, { label: state.test.title }]} />}
      <div className="ih-rlist__head">
        <div>
          <h2>{state.test.title}</h2>
          <p>{t('ieltsSpeaking.shadowText')}</p>
        </div>
        <div className="ih-seg" role="radiogroup" aria-label={t('ieltsListening.speed')}>
          {[1, 0.75].map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => setRate(r)}>{r}×</button>
          ))}
        </div>
      </div>
      <p className="ih-muted">{t('ieltsSpeaking.shadowProgress', { n: String(done), total: String(doc.phrases.length) })} · {t('ieltsSpeaking.privacyLocal')}</p>
      {rec.error && <p className="ih-run__error" role="alert">{t(`ieltsSpeaking.micError.${rec.error}`)}</p>}
      {doc.phrases.map((ph, i) => {
        const recNow = rec.state === 'recording' && playing === `rec-${ph.id}`
        return (
          <section key={ph.id} className={`ih-card ih-shadow__phrase ${playing === ph.id ? 'is-playing' : ''}`}>
            <span className="ih-shadow__n">{i + 1}</span>
            <p lang="en">{ph.groups.map((g, k) => <span key={k} className="ih-shadow__group">{g}</span>)}</p>
            <div className="ih-srec__row">
              <button type="button" className="ih-btn ih-btn--soft-violet" onClick={() => play(ph)}>{t('ieltsSpeaking.listenSpeaker')}</button>
              <button type="button" className={`ih-btn ${recNow ? 'ih-btn--dark' : 'ih-btn--rec'}`} onClick={() => record(ph)} disabled={rec.state === 'recording' && !recNow}>
                <MicIcon size={16} />{recNow ? t('ieltsSpeaking.stop') : t('ieltsSpeaking.repeatAfter')}
              </button>
              {takes[ph.id] && <audio controls src={takes[ph.id].url} aria-label={t('ieltsSpeaking.myTake')} />}
            </div>
          </section>
        )
      })}
    </div>
  )
}
