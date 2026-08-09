import { useI18n } from '../../i18n.jsx'
import { parseLessonDate } from './lessonFormat.js'

// Полоса «урок идёт» над календарём.
//
// Календарь показывает один выбранный день, и это скрывало главное: урок,
// начатый в другой день и не закрытый преподавателем, продолжает идти, но
// ученику его не найти — он видит только сегодняшнюю клетку. Вход в класс —
// самое срочное действие на этом экране, поэтому оно вынесено наверх и не
// зависит от того, какой день открыт.
export default function LiveNowBanner({ occ, onOpenLesson }) {
  const { t, lang } = useI18n()
  if (!occ) return null

  const time = parseLessonDate(occ.scheduledAt)
    .toLocaleTimeString(lang || 'ru', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="sch-live" role="status">
      <span className="sch-live__pulse" aria-hidden="true" />
      <div className="sch-live__text">
        <div className="sch-live__title">{t('schedule.liveNow')}</div>
        <div className="sch-live__sub">
          {occ.teacherName
            ? t('schedule.liveNowWith', { name: occ.teacherName })
            : time}
        </div>
      </div>
      <button className="sch-live__join" onClick={() => onOpenLesson(occ.lessonId)}>
        {t('schedule.join')}
      </button>
    </div>
  )
}
