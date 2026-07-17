import { useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import { SendIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

const PROF_KEYS = [
  'prof.opt.it',
  'prof.opt.management',
  'prof.opt.marketing',
  'prof.opt.logist',
  'prof.opt.design',
  'prof.opt.actor',
]

// Каноническая (английская) метка для профиля: её читает голосовой тьютор в
// промпте, поэтому сохраняем не локализованный текст кнопки.
const PROF_EN = {
  'prof.opt.it': 'IT/Development',
  'prof.opt.management': 'Management',
  'prof.opt.marketing': 'Marketing',
  'prof.opt.logist': 'Logistics',
  'prof.opt.design': 'Design',
  'prof.opt.actor': 'Actor',
}

// Экран «тьютор хочет узнать кем ты работаешь» — ввод или выбор профессии.
export default function TutorProfessionPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onSubmit,
  onSkip,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const [value, setValue] = useState('')
  const [picked, setPicked] = useState(null)

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      layout="flow"
    >
      <div className="t-status" style={{ paddingTop: 63 }}>
        <div className="t-status__head">
          <img className="t-status__avatar" src={avatar} alt="" />
          <div className="t-status__meta">
            <span className="t-status__name">{name}</span>
            <span className="t-status__role">{t('role.tutor')}</span>
          </div>
        </div>

        <h1 className="t-status__heading" style={{ marginTop: 20 }}>
          {t('prof.heading', { name })}
        </h1>

        <form
          className="t-prof__input"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit && onSubmit(value)
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('prof.placeholder')}
          />
          <button className="t-prof__send" type="submit" aria-label="Отправить">
            <SendIcon size={14} />
          </button>
        </form>

        <div className="t-prof__or">{t('prof.or')}</div>

        <div className="t-prof__grid">
          {PROF_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={'t-prof__opt' + (picked === key ? ' is-picked' : '')}
              // Клик по плитке = выбор: подтверждающей кнопки на макете нет,
              // поэтому сразу отдаём профессию наверх (раньше выбор терялся).
              onClick={() => {
                setPicked(key)
                onSubmit && onSubmit(PROF_EN[key])
              }}
            >
              <span>{t(key)}</span>
              <span className="t-radio" />
            </button>
          ))}
        </div>

        <button
          className="t-pill t-pill--blue"
          type="button"
          onClick={onSkip}
          style={{ marginTop: 24, width: 370 }}
        >
          {t('prof.skip')}
        </button>
      </div>
    </TutorShell>
  )
}
