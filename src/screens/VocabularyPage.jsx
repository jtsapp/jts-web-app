import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'

// Словарь: standalone-прототип (public/vocab/index.html) целиком в iframe,
// сайдбар обучающей зоны остаётся снаружи.
export default function VocabularyPage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { t } = useI18n()

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="vocab" token={token} onNav={onNav} onProfile={onProfile}>
      <iframe className="vocab__frame" src="/vocab/index.html" title={t('nav.vocab')} />
    </LearningLayout>
  )
}
