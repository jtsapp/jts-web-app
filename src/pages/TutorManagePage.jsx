import TutorShell from '../tutor/TutorShell.jsx'
import { ArrowRightIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

const ITEMS = [
  { title: 'Практика Present Continious', sub: 'Практика не пройдена', time: '12:45' },
  { title: 'Свободный разговор', sub: 'Общаемся о семье', time: '12:45' },
  { title: 'Сценарий Job Interview', sub: 'Успешно пройдено', time: '12:45' },
]
const GROUPS = [
  { date: 'Четверг, 12.06', items: ITEMS },
  { date: 'среда, 11.06', items: ITEMS },
]

export default function TutorManagePage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onChangeTutor,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
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
          {GROUPS.map((g) => (
            <div className="t-histgroup" key={g.date}>
              <div className="t-histgroup__date">{g.date}</div>
              {g.items.map((it, i) => (
                <div className="t-histrow" key={i}>
                  <div className="t-histrow__text">
                    <b>{it.title}</b>
                    <span>{it.sub}</span>
                  </div>
                  <time>{it.time}</time>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
