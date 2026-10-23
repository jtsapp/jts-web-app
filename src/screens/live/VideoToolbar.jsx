import { useI18n } from '../../i18n.jsx'
import VideoIcon from './videoIcons.jsx'

// Панель управления своим звонком. «Развернуть» есть только у сетки, «выключить у всех» — только у хоста.
export default function VideoToolbar({ micOn, camOn, isHost, canExpand, expanded, expandRef, onToggleMic, onToggleCamera, onToggleExpand, onMuteAll, onLeave }) {
  const { t } = useI18n()
  return (
    <div className="lw-video__toolbar" role="toolbar" aria-label={t('live.video.region')}>
      <button type="button" className="lw-video__btn" aria-label={t(micOn ? 'live.video.micOff' : 'live.video.micOn')} onClick={onToggleMic}>
        <VideoIcon name="mic" off={!micOn} />
      </button>
      <button type="button" className="lw-video__btn" aria-label={t(camOn ? 'live.video.camOff' : 'live.video.camOn')} onClick={onToggleCamera}>
        <VideoIcon name="camera" off={!camOn} />
      </button>
      {canExpand && (
        <button type="button" className="lw-video__btn" ref={expandRef} aria-label={t(expanded ? 'live.video.collapse' : 'live.video.expand')} onClick={onToggleExpand}>
          <VideoIcon name={expanded ? 'collapse' : 'expand'} />
        </button>
      )}
      {isHost && (
        <button type="button" className="lw-video__text-btn" onClick={onMuteAll}>{t('live.video.muteAll')}</button>
      )}
      <button type="button" className="lw-video__btn lw-video__btn--leave" aria-label={t('live.video.leave')} title={t('live.video.leave')} onClick={onLeave}>
        <VideoIcon name="leave" />
      </button>
    </div>
  )
}
