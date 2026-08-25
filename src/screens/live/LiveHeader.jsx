import { useI18n } from '../../i18n.jsx'
import LiveStatusBadge from './LiveStatusBadge.jsx'

// Шапка живого урока (макет «Онлайн-уроки»): тёмная полоса над уроком —
// преподаватель слева, ссылка на звонок и выход справа.
//
// Таймера из макета здесь нет намеренно: бэкенд не отдаёт время старта урока
// (у занятия есть только `durationMinutes`), а отсчёт от загрузки страницы был
// бы выдуманным временем — ученик, открывший урок на двадцатой минуте, увидел
// бы «00:00». Вместо таймера — статус занятия, он приходит с бэкенда.
export default function LiveHeader({
  status,
  teacherName,
  meetingUrl,
  connected,
  onVocab,
  onExit,
}) {
  const { t } = useI18n()
  const initial = (teacherName || '·').trim().charAt(0).toUpperCase()

  return (
    <header className="lv-top">
      <div className="lv-top__left">
        <LiveStatusBadge status={status} />
        <span className="lv-top__teacher">
          <span className="lv-top__avatar" aria-hidden="true">{initial}</span>
          <span className="lv-top__teacher-body">
            <span className="lv-top__teacher-name">{teacherName || t('lesson.ws.teacher')}</span>
            <span className="lv-top__teacher-role">{t('live.yourTeacher')}</span>
          </span>
        </span>
        {/* Связь показываем только когда её нет: зелёная надпись «На связи» в
            шапке — шум, который висит весь урок, а обрыв надо заметить. */}
        {connected === false && <span className="lv-top__offline">{t('live.disconnected')}</span>}
      </div>

      <div className="lv-top__right">
        {onVocab && (
          <button type="button" className="lv-top__btn" onClick={onVocab}>
            {t('live.yourVocab')}
          </button>
        )}
        {meetingUrl && (
          <a className="lv-top__btn lv-top__btn--meet" href={meetingUrl} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"
              />
            </svg>
            {t('live.meetLink')}
          </a>
        )}
        <button type="button" className="lv-top__exit" onClick={onExit}>
          {t('lesson.ws.exit')}
        </button>
      </div>
    </header>
  )
}
