import { useEffect, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

const STEP_KEYS = [
  'analysis.step.tutor',
  'analysis.step.interests',
  'analysis.step.profession',
  'analysis.step.level',
]

// Финальный экран анализа перед дашбордом. Через delay вызывает onDone.
export default function TutorAnalysisPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  onDone,
  delay = 2600,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor

  // Галочки зажигаются по одной за время «подготовки» тьютора: пункт 1, потом 2…
  const [done, setDone] = useState(0)
  useEffect(() => {
    const per = Math.max(300, Math.floor(delay / (STEP_KEYS.length + 1)))
    const timers = STEP_KEYS.map((_, i) =>
      setTimeout(() => setDone((d) => Math.max(d, i + 1)), per * (i + 1)),
    )
    return () => timers.forEach(clearTimeout)
  }, [delay])

  useEffect(() => {
    if (!onDone) return
    const id = setTimeout(onDone, delay)
    return () => clearTimeout(id)
  }, [onDone, delay])

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      layout="flow"
    >
      <div className="t-status" style={{ paddingTop: 66 }}>
        <h1 className="t-status__heading">{t('analysis.heading', { name })}</h1>

        <div className="t-analysis__glow">
          <img src={avatar} alt="" />
        </div>

        <div className="t-analysis__list">
          {STEP_KEYS.map((key, i) => (
            <div className={'t-analysis__item' + (i < done ? ' is-done' : '')} key={key}>
              <span className="t-radio" />
              {t(key)}
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
