import TutorShell from '../tutor/TutorShell.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import TemperToggle from '../tutor/TemperToggle.jsx'
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
  // Нрав тьютора и его переключение. Менять характер, не меняя тьютора, нужно
  // и после онбординга — не гонять же ученика заново через экран выбора.
  temper = null,
  onToggleTemper,
  // Сырые звонки из GET /api/profile/calls. Группировку по дате и локализацию
  // заголовков/статусов делаем здесь (зона тьютора: useLang). Строка звонка
  // кликабельна → onOpenCall(call) открывает транскрипт.
  calls = [],
  onOpenCall,
}) {
  const { lang, t } = useLang()
  const { name = 'Спарк' } = tutor
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
          <TutorThumb tutor={tutor} />
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

        {tutor.tempers && (
          <div className="t-manage__temper">
            <span>{t('tutor.temper')}</span>
            <TemperToggle tutor={tutor} temper={temper} onToggle={onToggleTemper} />
          </div>
        )}

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
