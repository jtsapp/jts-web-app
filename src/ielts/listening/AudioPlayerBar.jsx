import { DescriptionIcon, Forward5Icon, Replay5Icon } from '../icons.jsx'
import { formatTime } from './listening.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Плеер Listening (Figma «8 · Listening — тренировка»): −5 с, play/pause, +5 с, время, дорожка, длительность,
 * скорость 0.75× / 1×, кнопка транскрипта. Что запрещено правилами режима, не рисуется вовсе (в экзамене —
 * только play и время), а не висит неактивным: ученик не должен искать, почему кнопка не жмётся.
 */
export default function AudioPlayerBar({ player, rules, transcriptOpen, onTranscript, label }) {
  const { t } = useI18n()
  const { playing, time, duration, rate, plays, error } = player
  const share = duration > 0 ? Math.min(1, time / duration) : 0
  const used = rules.maxPlays && plays >= rules.maxPlays && !playing
  return (
    <div className="ih-player" role="group" aria-label={label || t('ieltsListening.player')}>
      {rules.allowSeek && (
        <button type="button" className="ih-round" onClick={() => player.skip(-5)} aria-label={t('ieltsListening.back5')}>
          <Replay5Icon size={20} />
        </button>
      )}
      <button
        type="button"
        className={`ih-player__play ${playing ? 'is-playing' : ''}`}
        onClick={() => (playing ? player.pause() : player.play())}
        disabled={used || (playing && !rules.allowPause)}
        aria-label={playing ? t('ieltsListening.pause') : t('ieltsListening.play')}
      >
        {playing ? <><i /><i /></> : <b className="ih-player__tri" />}
      </button>
      {rules.allowSeek && (
        <button type="button" className="ih-round" onClick={() => player.skip(5)} aria-label={t('ieltsListening.forward5')}>
          <Forward5Icon size={20} />
        </button>
      )}
      <b className="ih-player__time">{formatTime(time)}</b>
      <span
        className={`ih-player__track ${rules.allowSeek && !player.tts ? 'is-seekable' : ''}`}
        onClick={(e) => {
          if (!rules.allowSeek || !duration) return
          const r = e.currentTarget.getBoundingClientRect()
          player.seek(((e.clientX - r.left) / r.width) * duration)
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
      >
        <span style={{ width: `${share * 100}%` }} />
      </span>
      <span className="ih-player__dur">{formatTime(duration)}</span>
      {rules.allowRate && (
        <span className="ih-player__rates" role="radiogroup" aria-label={t('ieltsListening.speed')}>
          {[0.75, 1].map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rate === r} className={rate === r ? 'is-on' : ''} onClick={() => player.setRate(r)}>
              {r === 1 ? '1×' : '0.75×'}
            </button>
          ))}
        </span>
      )}
      {rules.maxPlays && <span className="ih-player__plays">{t('ieltsListening.playsLeft', { n: String(Math.max(0, rules.maxPlays - plays)) })}</span>}
      {onTranscript && (
        <button type="button" className={`ih-btn ih-btn--soft-violet ${transcriptOpen ? 'is-on' : ''}`} onClick={onTranscript} aria-pressed={transcriptOpen}>
          <span className="ih-btn__icon"><DescriptionIcon size={16} /></span>
          {t('ieltsListening.transcript')}
        </button>
      )}
      {error && <span className="ih-player__err" role="alert">{t('ieltsListening.audioError')}</span>}
    </div>
  )
}
