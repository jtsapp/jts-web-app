import { useI18n } from '../../i18n.jsx'
import LiveStatusBadge from './LiveStatusBadge.jsx'
import { VocabIcon } from '../../components/icons.jsx'

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
  lessonKind,
  meetingUrl,
  connected,
  onVocab,
  onTopics,
  onChat,
  onExit,
}) {
  const { t } = useI18n()
  // Инициалы в кружке — две буквы, как в макете («АА»): по имени и фамилии,
  // а если пришло одно слово, то первая буква.
  const initial = (teacherName || '·')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <header className="lv-top">
      <div className="lv-top__left">
        <LiveStatusBadge status={status} />
        <span className="lv-top__teacher">
          <span className="lv-top__avatar" aria-hidden="true">{initial}</span>
          <span className="lv-top__teacher-body">
            <span className="lv-top__teacher-name">{teacherName || t('lesson.ws.teacher')}</span>
            <span className="lv-top__teacher-role">{lessonKind || t('live.yourTeacher')}</span>
          </span>
        </span>
        {/* Связь показываем только когда её нет: зелёная надпись «На связи» в
            шапке — шум, который висит весь урок, а обрыв надо заметить. */}
        {connected === false && <span className="lv-top__offline">{t('live.disconnected')}</span>}
      </div>

      {/* Словарь — по центру шапки, отдельной зоной: его открывают походя, и
          рядом с «Выйти из урока» он спорил с ней за внимание. */}
      <div className="lv-top__center">
        {onVocab && (
          <button
            type="button"
            className="lv-top__icon-btn"
            onClick={onVocab}
            title={t('live.yourVocab')}
            aria-label={t('live.yourVocab')}
          >
            <VocabIcon size={20} />
          </button>
        )}
      </div>

      {/* Ряд значков — только на телефоне (скрыт стилями на десктопе): там
          подписи «Ссылка на Google Meet» и «Выйти из урока» в 440 не помещаются
          и наезжают друг на друга. Состав и порядок — с макета верхнего меню:
          темы, чат, словарь | звонок и красный выход. */}
      <div className="lv-top__actions">
        {onTopics && (
          <button type="button" className="lv-top__act" onClick={onTopics} aria-label={t('lesson.ws.topics')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="4.5" cy="6" r="1.5" fill="currentColor" />
              <circle cx="4.5" cy="12" r="1.5" fill="currentColor" />
              <circle cx="4.5" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </button>
        )}
        {onChat && (
          <button type="button" className="lv-top__act" onClick={onChat} aria-label={t('lesson.ws.chat')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        {onVocab && (
          <button type="button" className="lv-top__act" onClick={onVocab} aria-label={t('live.yourVocab')}>
            <VocabIcon size={20} />
          </button>
        )}
        {meetingUrl && (
          <>
            <span className="lv-top__sep" aria-hidden="true" />
            {/* Значок Google Meet цветной — он и в макете фирменный. */}
            <a className="lv-top__act" href={meetingUrl} target="_blank" rel="noreferrer" aria-label={t('live.meetLink')}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#00832d" d="M14 12 17 8.6h4.2c.5 0 .8.4.8.8v5.2c0 .5-.4.8-.8.8H17z" />
                <path fill="#0066da" d="M2 7.6c0-.9.7-1.6 1.6-1.6h9.8c.9 0 1.6.7 1.6 1.6v8.8c0 .9-.7 1.6-1.6 1.6H3.6c-.9 0-1.6-.7-1.6-1.6z" />
                <path fill="#e94235" d="M15 15.4 22 20v-3.6l-5-3.4z" />
                <path fill="#ffba00" d="M15 8.6 22 4v3.6l-5 3.4z" />
              </svg>
            </a>
          </>
        )}
        <button
          type="button"
          className="lv-top__act lv-top__act--exit"
          onClick={onExit}
          aria-label={t('lesson.ws.exit')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="m9 8 4 4-4 4M13 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="lv-top__right">
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
