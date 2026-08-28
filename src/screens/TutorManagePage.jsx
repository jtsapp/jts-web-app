import TutorShell from '../tutor/TutorShell.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import TemperToggle from '../tutor/TemperToggle.jsx'
import { ArrowRightIcon } from '../tutor/TutorIcons.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { groupCallsByDate } from '../tutor/callHistory.js'
import { INTEREST_TOPICS } from '../tutor/interests.js'

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
  // Ученику нет 18 — жёсткий нрав не включить (см. TemperToggle).
  adultLocked = false,
  // Ответы опросника и уровень. Опросник проходится один раз при первом
  // онбординге (смена тьютора его больше не гоняет), поэтому правка интересов,
  // статуса и пересдача теста живут здесь — иначе их негде поменять.
  level = '',
  interestIds = [],
  profession = '',
  onEditInterests,
  onEditProfession,
  onRetakeTest,
  // Сырые звонки из GET /api/profile/calls. Группировку по дате и локализацию
  // заголовков/статусов делаем здесь (зона тьютора: useLang). Строка звонка
  // кликабельна → onOpenCall(call) открывает отчёт о разговоре, а расшифровка
  // открывается уже из него.
  calls = [],
  onOpenCall,
}) {
  const { lang, t } = useLang()
  const { name = 'Спарк' } = tutor
  const history = groupCallsByDate(calls, t, lang)
  const interestsText = INTEREST_TOPICS.filter((topic) => interestIds.includes(topic.id))
    .map((topic) => t(topic.tKey))
    .join(', ')
  // Профессия в профиле лежит английскими метками (их читает голосовой тьютор),
  // поэтому показываем строку как есть: перевода для неё нет.
  const prefs = [
    { key: 'interests', label: t('manage.interests'), value: interestsText, onClick: onEditInterests },
    { key: 'profession', label: t('manage.profession'), value: profession, onClick: onEditProfession },
    { key: 'level', label: t('manage.retest'), value: level, onClick: onRetakeTest },
  ].filter((row) => typeof row.onClick === 'function')
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
        {/* Левая колонка: карточка тьютора, характер и ответы опросника. */}
        <div className="t-manage__side">
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
              <TemperToggle
                tutor={tutor}
                temper={temper}
                onToggle={onToggleTemper}
                locked={adultLocked}
              />
            </div>
          )}

          {prefs.length > 0 && (
            <div className="t-manage__prefs">
              {prefs.map((row) => (
                <button className="t-manage__pref" type="button" key={row.key} onClick={row.onClick}>
                  <span className="t-manage__pref-label">{row.label}</span>
                  <span className="t-manage__pref-value">{row.value || t('manage.notSet')}</span>
                  <span className="t-seeall__arrow">
                    <ArrowRightIcon size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
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
