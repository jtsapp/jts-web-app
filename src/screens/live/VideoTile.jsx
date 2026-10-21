import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { initials } from './videoLayout.js'
import VideoIcon from './videoIcons.jsx'

// Плитка участника: видео из SDK, пока камера включена, иначе кружок с инициалами.
// Любой сбой SDK оставляет инициалы — звонок не должен ронять урок.
export default function VideoTile({ tile, quality, className = '', moderation, attachVideo, detachVideo }) {
  const { t } = useI18n()
  const mediaRef = useRef(null)
  const [broken, setBroken] = useState(false)
  const showVideo = tile.videoOn && !broken

  useEffect(() => {
    if (!tile.videoOn) return undefined
    let cancelled = false
    const media = mediaRef.current
    const release = () => {
      try {
        // Освобождаем поток синхронно: иначе при смене качества отсоединение
        // пришло бы уже после нового attachVideo и сняло бы свежую картинку.
        Promise.resolve(detachVideo(tile.userId)).catch(() => {})
      } catch {
        // Клиента уже нет — отсоединять нечего.
      }
    }
    Promise.resolve()
      .then(() => attachVideo(tile.userId, quality))
      .then((el) => {
        // Плитка успела уйти: поток уже привязан к элементу, который никто не покажет.
        if (cancelled || !media) release()
        else media.replaceChildren(el)
      })
      .catch(() => { if (!cancelled) setBroken(true) })
    return () => {
      cancelled = true
      setBroken(false)
      media?.replaceChildren()
      release()
    }
  }, [tile.videoOn, tile.userId, quality, attachVideo, detachVideo])

  const name = tile.isSelf ? t('live.video.you') : tile.name
  const classes = ['lw-video__tile', tile.speaking && 'lw-video__tile--speaking', className].filter(Boolean).join(' ')

  return (
    <figure className={classes}>
      {showVideo
        ? <div className="lw-video__media" ref={mediaRef} />
        : <span className="lw-video__avatar" aria-hidden="true">{initials(tile.name)}</span>}
      <figcaption className="lw-video__caption">
        <span className="lw-video__name">{name}</span>
        {tile.isHost && <span className="lw-video__role">{t('live.video.teacher')}</span>}
        {tile.audioMuted && (
          <span className="lw-video__muted" role="img" aria-label={t('live.video.micMuted')}>
            <VideoIcon name="mic" off size={14} />
          </span>
        )}
      </figcaption>
      {moderation && (
        <div className="lw-video__mod">
          {!tile.audioMuted && (
            <button type="button" className="lw-video__mod-btn" aria-label={t('live.video.muteUser')} title={t('live.video.muteUser')} onClick={moderation.onMute}>
              <VideoIcon name="mic" off size={16} />
            </button>
          )}
          <button type="button" className="lw-video__mod-btn" aria-label={t('live.video.removeUser')} title={t('live.video.removeUser')} onClick={moderation.onRemove}>
            <VideoIcon name="leave" size={16} />
          </button>
        </div>
      )}
    </figure>
  )
}
