'use client'

// Плеер записи: Play/Pause, волна, время, ползунок, Stop / Replay / ∓5 с, темп и
// громкость. Подписан на ListenPlayer через useSyncExternalStore; сам ничего не
// считает — «дослушал» решает плеер (src/practice/listenchoose/player.js).
//
// Подписи кнопок (Play, Pause, Stop, Replay, −5s, +5s, Try again) английские во
// всех языках: это язык упражнения, как в прототипе.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { RATES } from '../../practice/listenchoose/player.js'
import { LcIcon } from './LcIcons.jsx'

const clock = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '—')

export default function LcPlayer({ player, t, onRate, onVolume, onReload, playRef, replayRef, stopRef }) {
  const p = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  const active = p.state === 'playing'
  // Play нажимается и пока запись грузится (см. ListenPlayer.play): на iOS она не
  // грузится до первого касания. Выключен он только когда играть нечего.
  const busy = p.state === 'error' || p.state === 'idle'

  // Ползунок и воспроизведение не должны драться: пока палец на ручке, время
  // показываем по ручке, а перемотку делаем один раз, когда палец поднят.
  // Стрелки клавиатуры перематывают сразу — у них нет «перетаскивания».
  const [preview, setPreview] = useState(null)
  const dragging = useRef(false)
  const pending = useRef(null)
  const previousVolume = useRef(0.8)
  const rangeRef = useRef(null)

  const commit = useCallback(() => {
    const target = pending.current
    dragging.current = false
    pending.current = null
    setPreview(null)
    if (target != null) player.seek(target)
  }, [player])
  const cancel = useCallback(() => {
    dragging.current = false
    pending.current = null
    setPreview(null)
  }, [])

  // Нативное change приходит и когда кнопку мыши отпустили ВНЕ ползунка, а
  // pointerup до него не доходит (Firefox): без него ручка застревала бы на
  // предпросмотре до потери фокуса. React отдаёт onChange на каждый input, а не
  // на change, поэтому слушатель вешается руками.
  useEffect(() => {
    const el = rangeRef.current
    if (!el) return undefined
    el.addEventListener('change', commit)
    return () => el.removeEventListener('change', commit)
  }, [commit])

  const shown = preview ?? p.position
  const status =
    p.state === 'loading'
      ? t('listenchoose.loading')
      : t('listenchoose.recorded') +
        (p.state === 'paused' ? ` · ${t('listenchoose.paused')}` : p.state === 'playing' ? ` · ${t('listenchoose.playing')}` : '')

  return (
    <>
      <div className={`lc-player${active ? ' is-playing' : ''}`}>
        <div className="lc-player__main">
          <button
            type="button"
            id="lc-play"
            ref={playRef}
            className="lc-play"
            aria-label={active ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space"
            disabled={busy}
            onClick={() => (active ? player.pause() : player.play())}
          >
            <LcIcon name={active ? 'pause' : 'play'} />
            <span>{active ? 'Pause' : 'Play'}</span>
          </button>
          <div className="lc-track">
            <div className="lc-track__top">
              <div className="lc-wave" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <span>
                {clock(shown)} / {p.duration ? clock(p.duration) : '—'}
              </span>
            </div>
            <input
              type="range"
              ref={rangeRef}
              className="lc-timeline"
              min={0}
              max={p.duration || 100}
              step={0.1}
              value={shown || 0}
              disabled={!p.duration || p.state === 'error'}
              aria-label="Playback position"
              aria-valuetext={`${clock(shown)} / ${clock(p.duration)}`}
              onPointerDown={() => {
                dragging.current = true
              }}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (dragging.current) {
                  pending.current = v
                  setPreview(v)
                } else player.seek(v)
              }}
              onPointerUp={commit}
              onPointerCancel={cancel}
              onBlur={() => (pending.current != null ? commit() : cancel())}
            />
          </div>
        </div>
        <div className="lc-player__bottom">
          <button type="button" ref={stopRef} className="lc-quiet" aria-label="Stop" onClick={() => player.stop()}>
            <LcIcon name="stop" />
            <span>Stop</span>
          </button>
          <button type="button" ref={replayRef} className="lc-quiet" aria-label="Replay" aria-keyshortcuts="R" disabled={busy} onClick={() => player.replay()}>
            <LcIcon name="replay" />
            <span>Replay</span>
          </button>
          <button type="button" className="lc-quiet lc-seekstep" aria-label="Back 5 seconds" disabled={!p.duration} onClick={() => player.seek(p.position - 5)}>
            −5s
          </button>
          <button type="button" className="lc-quiet lc-seekstep" aria-label="Forward 5 seconds" disabled={!p.duration} onClick={() => player.seek(p.position + 5)}>
            +5s
          </button>
          <span className="lc-divider" aria-hidden="true" />
          <label className="lc-speed">
            <span>{t('listenchoose.speed')}</span>
            <select value={String(p.rate)} aria-label="Playback speed" onChange={(e) => onRate(Number(e.target.value))}>
              {RATES.map((r) => (
                <option key={r} value={String(r)}>
                  {r}×
                </option>
              ))}
            </select>
          </label>
          <div className="lc-volume">
            <button
              type="button"
              className="lc-quiet"
              aria-label={t(p.volume === 0 ? 'listenchoose.unmute' : 'listenchoose.mute')}
              aria-pressed={p.volume === 0}
              onClick={() => {
                if (p.volume > 0) {
                  previousVolume.current = p.volume
                  onVolume(0)
                } else onVolume(previousVolume.current || 0.8)
              }}
            >
              <LcIcon name={p.volume === 0 ? 'muted' : 'volume'} />
            </button>
            <input type="range" min={0} max={1} step={0.05} value={p.volume} aria-label="Volume" onChange={(e) => onVolume(Number(e.target.value))} />
          </div>
        </div>
        <p className="lc-status" role="status">
          {status}
        </p>
      </div>
      {p.state === 'error' && (
        <div className="lc-error" role="alert">
          <span>{t('listenchoose.audioError')}</span>
          <button type="button" className="lc-secondary" onClick={onReload}>
            Try again
          </button>
        </div>
      )}
    </>
  )
}
