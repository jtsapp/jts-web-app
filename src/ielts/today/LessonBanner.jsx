import PillButton from '../ui/PillButton.jsx'
import { EventIcon, DescriptionIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Плашка «Сегодня урок с преподавателем» (прототип: раздел «Уроки»): в день
// урока план облегчается. Экран рисует её, только когда урок есть.
export default function LessonBanner({ time, onReport }) {
  const { t } = useI18n()
  return (
    <div className="ih-lesson" role="status">
      <span className="ih-lesson__icon" aria-hidden="true">
        <EventIcon size={22} />
      </span>
      <div className="ih-lesson__body">
        <b>{t('ieltsHub.lesson.title', { time })}</b>
        <span>{t('ieltsHub.lesson.text')}</span>
      </div>
      <PillButton variant="outline" icon={<DescriptionIcon size={16} />} onClick={onReport}>
        {t('ieltsHub.lesson.report')}
      </PillButton>
    </div>
  )
}
