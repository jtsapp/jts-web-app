import { useI18n } from '../../i18n.jsx'
import { MicIcon, CameraIcon, CloseIcon, PhoneIcon } from '../../components/icons.jsx'

// Плитка звонка — два состояния из спеки (§5.1):
//
//   A. активный звонок — превью учителя, PiP ученика, ряд Mic/Camera/Leave;
//   B. свёрнутый — одна карточка-CTA «Позвонить учителю», когда учителя ещё
//      нет на связи или звонок завершён.
//
// Превью — плоская заливка, а не градиент: реального видеопотока в №1 нет
// (роадмап: внешний Meet), а спека запрещает градиенты явным правилом.
// Кнопки управления нефункциональны и потому disabled — чтобы не создавать
// ложное ощущение рабочего звонка, — но остаются подписанными для скринридера.
export default function CallTile({ teacherName, connected = true, onCall }) {
  const { t } = useI18n()

  if (!connected) {
    return (
      <div className="lw-card lw-call lw-call--collapsed">
        <button type="button" className="lw-call__cta" onClick={onCall}>
          <PhoneIcon size={20} />
          {t('lesson.ws.callTeacher')}
        </button>
      </div>
    )
  }

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
