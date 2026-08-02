import { useI18n } from '../../i18n.jsx'
import { MicIcon, CameraIcon, CloseIcon } from '../../components/icons.jsx'

// Плитка звонка (заглушка №1): область превью учителя (градиент — реального
// видео нет, см. дизайн-спека «плитка звонка — визуальная заглушка»), малое
// PiP ученика поверх, подпись имени учителя, ряд круглых кнопок
// Mic/Camera/Leave. Кнопки нефункциональны — это ожидаемо для под-проекта №1
// (роадмап: внешний Meet), но остаются доступными: title/aria-label заданы,
// disabled — чтобы не создавать ложное ощущение рабочего управления звонком.
export default function CallTile({ teacherName }) {
  const { t } = useI18n()

  return (
    <div className="lw-card lw-call">
      <div className="lw-call__preview">
        <span className="lw-call__student-pip" aria-hidden="true" />
        {teacherName && <span className="lw-call__name">{teacherName}</span>}
      </div>
      <div className="lw-call__controls">
        <button type="button" className="lw-call__btn" disabled title={t('lesson.ws.mic')} aria-label={t('lesson.ws.mic')}>
          <MicIcon size={18} />
        </button>
        <button type="button" className="lw-call__btn" disabled title={t('lesson.ws.camera')} aria-label={t('lesson.ws.camera')}>
          <CameraIcon size={18} />
        </button>
        <button type="button" className="lw-call__btn lw-call__btn--leave" disabled title={t('lesson.ws.leave')} aria-label={t('lesson.ws.leave')}>
          <CloseIcon size={18} />
        </button>
      </div>
    </div>
  )
}
