import { useEffect, useRef, useState } from 'react'
import { DescriptionIcon, Forward5Icon, Replay5Icon } from '../icons.jsx'
import { formatTime } from './listening.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Плеер Listening (Figma «8 · Listening — тренировка»): −5 с, play/pause, +5 с, время, дорожка, длительность,
 * скорость 0.75× / 1×, кнопка транскрипта. Что запрещено правилами режима, не рисуется вовсе (в экзамене —
 * только play и время), а не висит неактивным: ученик не должен искать, почему кнопка не жмётся.
 *
 * Дорожка и время идут каждый кадр через player.subscribe прямо в DOM — без перерисовки React: иначе плавная дорожка
 * перерисовывала бы весь экран задания 60 раз в секунду. Дорожку можно тянуть: пока палец на ней, видна будущая
 * позиция, перемотка — на отпускании (иначе синтез дёргал бы реплику на каждый пиксель).
 */
export default function AudioPlayerBar({ player, rules, transcriptOpen, onTranscript, label }) {
  const { t } = useI18n()
  const { playing, duration, rate, plays, error, loading } = player
  const used = rules.maxPlays && plays >= rules.maxPlays && !playing
  const fillRef = useRef(null)
  const knobRef = useRef(null)
  const timeRef = useRef(null)
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const durRef = useRef(duration)
  durRef.current = duration

  // каждый кадр: ширина заливки, ручка и время — пока ученик не тянет дорожку сам
  useEffect(() => player.subscribe((time) => {
    if (dragRef.current != null) return
    paint(time)
  }), [player.subscribe]) // eslint-disable-line react-hooks/exhaustive-deps

  function paint(time) {
    const d = durRef.current
    const share = d > 0 ? Math.min(1, Math.max(0, time / d)) : 0
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${share})`
    if (knobRef.current) knobRef.current.style.left = `${share * 100}%`
    if (timeRef.current) timeRef.current.textContent = formatTime(time)
  }

  // длительность синтеза уточняется по мере скачивания реплик — перерисовать заливку под новую длину
  useEffect(() => {
    if (dragRef.current == null) paint(player.getTime())
  }, [duration]) // eslint-disable-line react-hooks/exhaustive-deps

  const at = (e, el) => {
    const r = el.getBoundingClientRect()
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (durRef.current || 0)
  }
  const onDown = (e) => {
    if (!rules.allowSeek || !duration) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const x = at(e, e.currentTarget)
    dragRef.current = x
    setDrag(x)
    paint(x)
  }
  const onMove = (e) => {
    if (dragRef.current == null) return
    const x = at(e, e.currentTarget)
    dragRef.current = x
    paint(x)
  }
  const onUp = () => {
    if (dragRef.current == null) return
    const x = dragRef.current
    dragRef.current = null
    setDrag(null)
    player.seek(x)
  }

  return (
    <div className={`ih-player ${loading ? 'is-loading' : ''}`} role="group" aria-label={label || t('ieltsListening.player')}>
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
      {/* текст времени пишет только подписка (каждый кадр): React-значение отставало бы на долю секунды и мигало */}
      <b className="ih-player__time" ref={timeRef} />
      <span
        className={`ih-player__track ${rules.allowSeek ? 'is-seekable' : ''} ${drag != null ? 'is-dragging' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="slider"
        tabIndex={rules.allowSeek ? 0 : -1}
        aria-label={t('ieltsListening.player')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(player.time)}
        onKeyDown={(e) => {
          if (!rules.allowSeek) return
          if (e.key === 'ArrowLeft') { e.preventDefault(); player.skip(-5) }
          if (e.key === 'ArrowRight') { e.preventDefault(); player.skip(5) }
        }}
      >
        <span className="ih-player__fill" ref={fillRef} />
        {rules.allowSeek && <span className="ih-player__knob" ref={knobRef} />}
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
