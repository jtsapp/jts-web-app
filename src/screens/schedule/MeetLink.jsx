import { useI18n } from '../../i18n.jsx'

// Ссылка на видеозвонок урока. Открывается новой вкладкой: расписание —
// живой экран (статус урока обновляется при возврате), и уводить с него нельзя.
export default function MeetLink({ url }) {
  const { t } = useI18n()
  if (!url) return null

  return (
    <a className="meet-link" href={url} target="_blank" rel="noreferrer noopener">
      <svg className="meet-link__icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="6" width="13" height="12" rx="2.5" fill="#1a73e8" />
        <path d="M15.5 10.4 21 6.8v10.4l-5.5-3.6v-3.2Z" fill="#00832d" />
      </svg>
      {t('schedule.meet')}
    </a>
  )
}
