import { useEffect } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorStatus from '../tutor/TutorStatus.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Переходный экран загрузки: аватар тьютора + крупный заголовок по центру.
// Через delay автоматически вызывает onDone (имитация обработки).
export default function TutorLoadingPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  heading,
  onDone,
  delay = 2200,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const head = heading ?? t('loading.heading', { name })
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
      layout="center"
    >
      <TutorStatus heading={head} name={name} avatar={avatar} pulse dots />
    </TutorShell>
  )
}
