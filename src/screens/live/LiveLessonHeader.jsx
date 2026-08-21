import { useI18n } from '../../i18n.jsx'
import { VocabIcon } from '../../components/icons.jsx'

// Шапка живого урока: выход слева, какой урок открыт — в центре, словарь справа.
//
// В центре стоит «уровень · название урока» (A0 · Coffee — yes. Mondays — no.),
// а не название раздела занятия. Раздел назывался «Материал урока» — служебная
// строка, по которой не понять ни уровня, ни того, какой это урок; уровень и
// название приходят из каталога по ссылке материала (catalogLessonByUrl).
//
// Чего здесь намеренно нет:
//   • значка состояния (идёт / на паузе / завершён) — в макете его нет, и
//     владелец просил убрать;
//   • переключателя языка — в макете он есть (пилюля 119×33 r40), но убран по
//     той же просьбе. Язык остаётся переключаемым на других экранах.
export default function LiveLessonHeader({ stage, lessonTitle, onExit, onOpenVocab }) {
  const { t } = useI18n()

  return (
    <header className="llh">
      <button type="button" className="llh__exit" onClick={onExit}>
        <span className="llh__exit-icon" aria-hidden="true">×</span>
        {t('live.exit')}
      </button>

      <div className="llh__what">
        <span className="llh__line">
          {stage && <span className="llh__stage">{stage}</span>}
        </span>
        {lessonTitle && <span className="llh__lesson">{lessonTitle}</span>}
      </div>

      <div className="llh__tools">
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
