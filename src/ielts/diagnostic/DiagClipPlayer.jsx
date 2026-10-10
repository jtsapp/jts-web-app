import { useEffect, useMemo, useRef, useState } from 'react'
import AudioPlayerBar from '../listening/AudioPlayerBar.jsx'
import { useAudioPlayer } from '../listening/useAudioPlayer.js'
import { playerRules } from '../listening/listening.js'
import { CheckIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Транскрипт клипа диагностики — строка «BETH: …\nOMAR: …». Для синтеза — реплики с говорящим; начало реплики
// оценочное (≈2.6 слова в секунду), только чтобы дорожка плеера двигалась.
export function clipLines(transcript) {
  if (Array.isArray(transcript)) return transcript
  let at = 0
  return String(transcript || '')
    .split('\n')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^([A-Z][A-Za-z .'-]{0,30}):\s*(.+)$/)
      const text = m ? m[2] : raw
      const start = at
      at += Math.max(1.5, text.split(/\s+/).length / 2.6)
      return { speaker: m ? m[1] : null, text, start, end: at }
    })
}

/**
 * Плеер клипа диагностики (прототип 02-diagnostic, v1.1.14): сначала время прочитать вопросы — 5 с на вопрос, от 10
 * до 30 с, — потом клип включается сам; «Начать сейчас» или ▶ — сразу. В экзамене клип звучит один раз, без паузы и
 * перемотки, а прозвучавший больше не показывается. Записи нет (форма ещё не озвучена) — звучит транскрипт синтезом.
 */
export default function DiagClipPlayer({ clip, mode, nQuestions, played, onPlayed }) {
  const { t } = useI18n()
  const P = (k, v) => t(`ieltsOb.p.diag.block.${k}`, v)
  const rules = useMemo(() => playerRules(mode === 'exam' ? 'exam' : 'practice', { allowSeek: mode !== 'exam' }), [mode])
  const src = clip.audio?.url || null
  const lines = useMemo(() => (src ? null : clipLines(clip.transcript)), [src, clip.transcript])
  const player = useAudioPlayer({ src, transcript: lines, rules })
  const [left, setLeft] = useState(() => (played ? 0 : Math.min(30, Math.max(10, nQuestions * 5))))
  const started = useRef(played)

  // первый старт с начала — клип «прозвучал»: в экзамене к нему не вернуться и после перезагрузки
  useEffect(() => {
    if (player.plays > 0 && !played) onPlayed?.()
  }, [player.plays, played, onPlayed])

  useEffect(() => {
    if (started.current || left <= 0) return
    const id = setTimeout(() => {
      if (left <= 1) {
        started.current = true
        setLeft(0)
        player.play()
      } else setLeft(left - 1)
    }, 1000)
    return () => clearTimeout(id)
  }, [left, player])

  const startNow = () => {
    started.current = true
    setLeft(0)
    player.play()
  }

  if (mode === 'exam' && played && !player.playing && player.plays === 0) {
    return (
      <div className="ih-diag__played">
        <span className="ih-chip ih-chip--green ih-chip--md"><CheckIcon size={14} /><span>{P('played')}</span></span>
      </div>
    )
  }
  return (
    <div className="ih-diag__player ih-skin-listening">
      <AudioPlayerBar player={player} rules={rules} label={P('part', { n: String(clip.part || 1) })} />
      {left > 0 && !player.playing && player.plays === 0 && (
        <div className="ih-diag__preview" aria-live="polite">
          <span>{P('readTime', { n: String(left) })}</span>
          <button type="button" className="ih-btn ih-btn--soft-blue" onClick={startNow}>{P('startNow')}</button>
        </div>
      )}
      {player.error && player.plays > 0 && !player.playing && <p className="ih-muted">{P('autoplayBlocked')}</p>}
    </div>
  )
}
