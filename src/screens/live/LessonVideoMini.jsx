import { useI18n } from '../../i18n.jsx'
import VideoIcon from './videoIcons.jsx'

// Плашка звонка на вкладке «Доска»: видео здесь не рисуем — звук SDK играет через AudioContext
// и без DOM-элемента, а картинка на доске только отвлекала бы от рисования.
export default function LessonVideoMini({ video, onBack }) {
  const { t } = useI18n()
  if (video.phase !== 'connected' && video.phase !== 'reconnecting') return null
  return (
    <div className="lw-video-mini" role="toolbar" aria-label={t('live.video.region')}>
      <span className="lw-video-mini__count">{t('live.video.participants', { n: video.tiles.length })}</span>
      <button type="button" className="lw-video__btn" aria-label={t(video.micOn ? 'live.video.micOff' : 'live.video.micOn')} onClick={video.toggleMic}>
        <VideoIcon name="mic" off={!video.micOn} />
      </button>
      <button type="button" className="lw-video__btn" aria-label={t(video.camOn ? 'live.video.camOff' : 'live.video.camOn')} onClick={video.toggleCamera}>
        <VideoIcon name="camera" off={!video.camOn} />
      </button>
      <button type="button" className="lw-video__btn lw-video__btn--leave" aria-label={t('live.video.leave')} title={t('live.video.leave')} onClick={video.leave}>
        <VideoIcon name="leave" />
      </button>
      <button type="button" className="lw-video__text-btn" onClick={onBack}>{t('live.video.backToCall')}</button>
    </div>
  )
}
