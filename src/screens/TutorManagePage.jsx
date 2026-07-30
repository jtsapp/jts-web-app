import TutorShell from '../tutor/TutorShell.jsx'
import { ArrowRightIcon } from '../tutor/TutorIcons.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { groupCallsByDate } from '../tutor/callHistory.js'

export default function TutorManagePage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onChangeTutor,
  // Сырые звонки из GET /api/profile/calls. Группировку по дате и локализацию
  // заголовков/статусов делаем здесь (зона тьютора: useLang). Строка звонка
  // кликабельна → onOpenCall(call) открывает транскрипт.
  calls = [],
  onOpenCall,
}) {
  const { lang, t } = useLang()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const history = groupCallsByDate(calls, t, lang)
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={t('manage.title')}
      layout="flow"
    >
      <div className="t-manage">
        <div className="t-manage__card">
          <img src={avatar} alt="" />
          <div className="t-manage__name">
            <b>{name}</b>
            <span>{t('role.tutor')}</span>
          </div>
          <button className="t-manage__change" type="button" onClick={onChangeTutor}>
            {t('manage.change')}
            <span className="t-seeall__arrow">
              <ArrowRightIcon size={14} />
            </span>
          </button>
        </div>

        <div className="t-manage__history">
          <h2>{t('manage.history')}</h2>
          {history.length === 0 ? (
            <p className="t-manage__empty">{t('manage.historyEmpty')}</p>
          ) : (
            history.map((g) => (
              <div className="t-histgroup" key={g.date}>
                <div className="t-histgroup__date">{g.date}</div>
                {g.items.map((it) => (
                  <button
                    className="t-histrow"
                    type="button"
                    key={it.id}
                    onClick={() => onOpenCall?.(it.call)}
                  >
                    <div className="t-histrow__text">
                      <b>{it.title}</b>
                      <span>{it.sub}</span>
                    </div>
                    <time>{it.time}</time>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </TutorShell>
  )
}
