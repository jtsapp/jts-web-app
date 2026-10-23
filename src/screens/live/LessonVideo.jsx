import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { videoLayout } from './videoLayout.js'
import VideoTile from './VideoTile.jsx'
import VideoToolbar from './VideoToolbar.jsx'

const SKELETONS = [0, 1]

// Фокус не уходит из развёрнутого вида: с последней кнопки Tab ведёт на первую и обратно.
function trapFocus(event, root) {
  const items = [...(root?.querySelectorAll('button:not([disabled])') ?? [])]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const inside = root.contains(document.activeElement)
  if (event.shiftKey && (!inside || document.activeElement === first)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
    event.preventDefault()
    first.focus()
  }
}

// Звонок урока в правой колонке. Состояние звонка (video) живёт на уровне страницы,
// чтобы звонок не рвался при смене вкладки. Пока звонок не открыт или недоступен, показывает
// кнопку, сообщение или прежнюю карточку со ссылкой (renderFallback).
export default function LessonVideo({ video, lessonType, enabled, renderFallback }) {
  const { t } = useI18n()
  const layout = videoLayout(lessonType)
  const [expanded, setExpanded] = useState(false)
  const expandRef = useRef(null)
  const rootRef = useRef(null)
  const { phase, fallback, tiles } = video

  useEffect(() => {
    if (!expanded) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setExpanded(false)
        expandRef.current?.focus()
      } else if (e.key === 'Tab') {
        trapFocus(e, rootRef.current)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded])

  // Звонок закрылся — развёрнутому виду не на чем держаться.
  const inCall = phase === 'connected' || phase === 'reconnecting'
  if (expanded && !inCall) setExpanded(false)

  if (phase === 'failed' && fallback === 'link') return renderFallback ? renderFallback() : null

  const joinButton = (label) => (
    <button type="button" className="lw-video__join" disabled={!enabled} onClick={video.join}>{t(label)}</button>
  )

  function renderBody() {
    if (phase === 'idle') return joinButton('live.video.join')
    // Zoom не пускает удалённого хостом обратно в эту сессию — кнопки входа нет.
    if (phase === 'removed') return <p className="lw-video__msg">{t('live.video.removed')}</p>
    if (phase === 'failed') {
      if (fallback === 'ended') return <p className="lw-video__msg">{t('live.video.ended')}</p>
      const failed = <p className="lw-video__msg">{t('live.video.failed')}</p>
      if (fallback !== 'retry') return failed
      return <>{failed}{joinButton('live.video.retry')}</>
    }
    if (phase === 'connecting') {
      return (
        <>
          <p className="lw-video__msg">{t('live.video.connecting')}</p>
          <div className="lw-video__tiles">
            {SKELETONS.map((i) => <div key={i} className="lw-video__tile lw-video__tile--skeleton" aria-busy="true" />)}
          </div>
        </>
      )
    }
    return renderTiles()
  }

  function renderTiles() {
    const tileProps = { attachVideo: video.attachVideo, detachVideo: video.detachVideo }
    const moderationFor = (tile) => (video.isHost && !tile.isSelf
      ? {
        onMute: () => video.muteUser(tile.userId),
        onRemove: () => { if (window.confirm(t('live.video.removeConfirm', { name: tile.name }))) video.removeUser(tile.userId) },
      }
      : null)
    const renderTile = (tile, quality, className) => (
      <VideoTile key={tile.userId} tile={tile} quality={quality} className={className} moderation={moderationFor(tile)} {...tileProps} />
    )
    let content
    if (layout === 'duo') {
      const peer = tiles.find((x) => !x.isSelf)
      const self = tiles.find((x) => x.isSelf)
      content = peer
        ? [renderTile(peer, 'medium'), self && renderTile(self, 'low', 'lw-video__self')]
        : self && renderTile(self, 'medium')
    } else {
      content = tiles.map((tile) => renderTile(tile, expanded ? 'medium' : 'low'))
    }
    return (
      <>
        {phase === 'reconnecting' && <p className="lw-video__msg" role="status">{t('live.video.reconnecting')}</p>}
        {/* video-player-container: элемент SDK, в нём обязаны лежать видео из attachVideo. */}
        <video-player-container class="lw-video__tiles">{content}</video-player-container>
        {video.deviceError && <p className="lw-video__msg lw-video__msg--error" role="alert">{t('live.video.noDevice')}</p>}
        <VideoToolbar
          micOn={video.micOn}
          camOn={video.camOn}
          isHost={video.isHost}
          canExpand={layout === 'grid'}
          expanded={expanded}
          expandRef={expandRef}
          onToggleMic={video.toggleMic}
          onToggleCamera={video.toggleCamera}
          onToggleExpand={() => setExpanded((v) => !v)}
          onMuteAll={video.muteAll}
          onLeave={video.leave}
        />
      </>
    )
  }

  const classes = ['lw-card', 'lw-video', `lw-video--${layout}`, expanded && 'lw-video--expanded'].filter(Boolean).join(' ')
  return (
    <section
      ref={rootRef}
      className={classes}
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? 'true' : undefined}
      aria-label={t('live.video.region')}
    >
      {renderBody()}
    </section>
  )
}
