import LangSelector from '../../components/LangSelector.jsx'
import { useI18n } from '../../i18n.jsx'
import { VocabIcon } from '../../components/icons.jsx'

// Шапка живого урока по макету: выход слева, что сейчас идёт — в центре,
// язык интерфейса и словарь справа.
//
// Стадия крупнее названия урока намеренно: на уроке ученик держит в голове «где
// я сейчас», а не «как называется занятие» — название стоит подписью.
export default function LiveLessonHeader({ stage, lessonTitle, onExit, onOpenVocab }) {
  const { t } = useI18n()

  return (
    <header className="llh">
      <button type="button" className="llh__exit" onClick={onExit}>
        <span className="llh__exit-icon" aria-hidden="true">×</span>
        {t('live.exit')}
      </button>

      <div className="llh__what">
        {stage && <span className="llh__stage">{stage}</span>}
        {lessonTitle && <span className="llh__lesson">{lessonTitle}</span>}
      </div>

      <div className="llh__tools">
        <LangSelector />
        {onOpenVocab && (
          <button type="button" className="llh__vocab" onClick={onOpenVocab}>
            <VocabIcon size={20} />
            {t('nav.vocab')}
          </button>
        )}
      </div>
    </header>
  )
}
