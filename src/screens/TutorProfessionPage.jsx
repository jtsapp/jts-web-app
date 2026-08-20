import { useState } from 'react'
import TutorThumb from '../tutor/TutorThumb.jsx'
import TutorShell from '../tutor/TutorShell.jsx'
import { SendIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Спрашиваем СОЦИАЛЬНЫЙ СТАТУС, а не отрасль: тьютору для тем, регистра и
// примеров важно «школьник / студент / работаю», а не «маркетинг vs логистика».
// Отрасль при желании ученик допишет текстом в поле выше.
const PROF_KEYS = [
  'prof.opt.pupil',
  'prof.opt.student',
  'prof.opt.working',
  'prof.opt.business',
  'prof.opt.jobsearch',
  'prof.opt.retired',
]

// Каноническая (английская) метка для профиля: её читает голосовой тьютор в
// промпте, поэтому сохраняем не локализованный текст кнопки.
const PROF_EN = {
  'prof.opt.pupil': 'School student (teen)',
  'prof.opt.student': 'University student',
  'prof.opt.working': 'Working professional',
  'prof.opt.business': 'Business owner / entrepreneur',
  'prof.opt.jobsearch': 'Job seeker',
  'prof.opt.retired': 'Retired',
}

// Профиль хранит статус ОДНОЙ строкой (CSV английских меток + свободный текст),
// поэтому для правки из «Управления тьютором» её надо разобрать обратно:
// знакомые метки — в отмеченные плитки, остальное — в поле ввода.
const EN_TO_KEY = new Map(Object.entries(PROF_EN).map(([key, en]) => [en.toLowerCase(), key]))

function parseInitial(value) {
  const parts =
    typeof value === 'string' ? value.split(',').map((x) => x.trim()).filter(Boolean) : []
  const picked = []
  const rest = []
  for (const part of parts) {
    const key = EN_TO_KEY.get(part.toLowerCase())
    if (key && !picked.includes(key)) picked.push(key)
    else rest.push(part)
  }
  return { picked, text: rest.join(', ') }
}

// Экран «тьютор хочет узнать, чем ты занимаешься» — ввод или выбор статуса.
export default function TutorProfessionPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  // Уже сохранённый статус: пусто на онбординге, заполнено при правке из
  // «Управления тьютором» — экран открывается с прежним ответом.
  initialValue = '',
  onSubmit,
  onSkip,
}) {
  const t = useT()
  const { name = 'Спарк' } = tutor
  const [initial] = useState(() => parseInitial(initialValue))
  const [value, setValue] = useState(initial.text)
  // Мультивыбор: несколько профессий сразу. Клик по плитке переключает её,
  // submit — по кнопке «Продолжить». Собираем выбранное + текст в одну строку
  // (её читает голосовой тьютор в промпте, поэтому просто CSV английских меток).
  const [picked, setPicked] = useState(initial.picked)

  const toggle = (key) =>
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const submit = () => {
    const parts = picked.map((k) => PROF_EN[k])
    const typed = value.trim()
    if (typed) parts.push(typed)
    const combined = parts.join(', ')
    if (combined) onSubmit && onSubmit(combined)
  }

  const canSubmit = picked.length > 0 || value.trim().length > 0

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
          <TutorThumb tutor={tutor} className="t-status__avatar" />
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
            submit()
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
              className={'t-prof__opt' + (picked.includes(key) ? ' is-picked' : '')}
              // Мультивыбор: клик переключает плитку, submit — кнопкой ниже.
              onClick={() => toggle(key)}
            >
              <span>{t(key)}</span>
              <span className="t-radio" />
            </button>
          ))}
        </div>

        <button
          className="t-pill t-pill--primary"
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          style={{ marginTop: 24, width: 370 }}
        >
          {t('common.continue')}
        </button>

        <button
          className="t-pill t-pill--blue"
          type="button"
          onClick={onSkip}
          style={{ marginTop: 12, width: 370 }}
        >
          {t('prof.skip')}
        </button>
      </div>
    </TutorShell>
  )
}
