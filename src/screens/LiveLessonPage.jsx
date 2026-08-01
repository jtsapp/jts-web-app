import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'

export default function LiveLessonPage({ lessonId, userName, userLevel, token, onNav, onProfile, onBack }) {
  const { t } = useI18n()
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="live">
        <button className="live__back" onClick={onBack}>← {t('schedule.back')}</button>
        <div className="soon">
          <div className="soon__text">
            <b>{t('live.wipTitle')}</b>
            <span>{t('live.wipSubtitle', { id: lessonId })}</span>
          </div>
        </div>
      </div>
    </LearningLayout>
  )
}
