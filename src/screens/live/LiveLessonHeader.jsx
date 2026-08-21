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
export default function LiveLessonHeader({
  stage,
  lessonTitle,
  onOpenLesson,
  onExit,
  onOpenVocab,
  // Вкладки «Урок / Доска». Приходят сюда, а не рисуются отдельной полосой под
  // шапкой: полоса занимала целую белую строку и отодвигала материал вниз, хотя
  // в шапке место есть. Проп, а не жёстко внутри, потому что переключатель —
  // состояние страницы урока, а шапка про него ничего не знает.
  tab,
  onTab,
}) {
  const { t } = useI18n()

  return (
    <header className="llh">
      <button type="button" className="llh__exit" onClick={onExit}>
        <span className="llh__exit-icon" aria-hidden="true">×</span>
        {t('live.exit')}
      </button>

      <div className="llh__what">
        {/* Какой урок открыт — настоящая кнопка, а не подпись: в шапке всё
            остальное тоже кнопки, и элемент, который выглядит нажимаемым и не
            нажимается, экрану не нужен. Ведёт на сам урок — на вкладку «Урок»
            и к началу материала.

            Подпись живая: `stage` пересобирается, когда меняется материал
            раздела, а меняет его преподаватель — своим выбором раздела или
            командой «Внимание на упражнение», которая доезжает до ученика
            трансляцией. Ученику при этом ничего нажимать не надо. */}
        {stage && (
          <button type="button" className="llh__lesson-btn" onClick={onOpenLesson}>
            {stage}
          </button>
        )}
        {lessonTitle && <span className="llh__lesson">{lessonTitle}</span>}
      </div>

      {onTab && (
        <div className="ls__tabs llh__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'lesson'}
            className={`ls-tab ${tab === 'lesson' ? 'ls-tab--active' : ''}`}
            onClick={() => onTab('lesson')}
          >
            {t('lesson.ws.tabLesson')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'board'}
            className={`ls-tab ${tab === 'board' ? 'ls-tab--active' : ''}`}
            onClick={() => onTab('board')}
          >
            {t('lesson.ws.tabBoard')}
          </button>
        </div>
      )}

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
