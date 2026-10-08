import { useI18n } from '../i18n.jsx'

// Шапка раздела по дизайну «IELTS new»: «IELTS» и чип трека (Academic / General Training) — метка формата, а не
// переключатель программы (ТЗ v4). Серии и XP в шапке макета нет; колокольчик стоит в общей раскладке (LearningLayout).
export default function IeltsHeader({ track }) {
  const { t } = useI18n()
  return (
    <header className="ih-header">
      <h1 className="ih-header__title">IELTS</h1>
      <span className="ih-ph__chip">{track === 'general' ? 'General Training' : 'Academic'}</span>
      <span className="ih-header__sr">{t('ieltsHub.trackLabel')}</span>
    </header>
  )
}
