import { useI18n } from '../../../i18n.jsx'
import { gradeQuestion, hasAttempt } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'
import { tidyLessonText } from '../tidyLessonText.js'

// Контролируемый вопрос со свободным вводом. `answer` — введённый текст;
// нормализация регистра/пробелов и сравнение с допустимыми `answers` — только
// через `gradeQuestion` (не дублируем `norm` здесь).
export default function GapQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const value = answer || ''
  const attempted = hasAttempt(question, value)
  const verdict = checked && attempted ? gradeQuestion(question, value) : null
  // Открытый пропуск сверять не с чем: показывать по нему «верно» — врать.
  const needsReview = !!verdict?.manual
  const userCorrect = !!verdict?.correct && !needsReview

  let cls = 'lw-gap-input'
  if (checked && attempted) {
    if (needsReview) cls += ' is-review'
    else cls += userCorrect ? ' is-correct' : ' is-wrong'
  }

  return (
    <div className="lw-q lw-q--gap">
      <p className="lw-q__sentence">
        <TapText text={question.gapBefore} onWord={onWord} />
        <span className="lw-gap-input-wrap">
          <input
            type="text"
            className={cls}
            value={value}
            onChange={(e) => onAnswer(question.id, e.target.value)}
            disabled={checked || readOnly}
            autoComplete="off"
            spellCheck="false"
            aria-label={t('lesson.yourAnswer')}
          />
          {checked && userCorrect && (
            <span className="lw-gap-input__check" aria-hidden="true">
              <CheckIcon size={14} />
            </span>
          )}
        </span>
        <TapText text={tidyLessonText(question.gapAfter)} onWord={onWord} />
      </p>
      {needsReview && (
        <p className="lw-q__review" aria-live="polite">{t('lesson.needsTeacherReview')}</p>
      )}
      {checked && attempted && !userCorrect && !needsReview && (
        <p className="lw-q__answer" aria-live="polite">
          {t('lesson.answerWas')}: {(question.answers || []).join(' / ')}
        </p>
      )}
      {/* Разбор из `data-why` курса — правило, которое проверяет задание. Показываем
          только после ошибки: до неё это была бы подсказка с ответом. */}
      {checked && attempted && !userCorrect && !needsReview && question.why && (
        <p className="lw-q__why">{tidyLessonText(question.why)}</p>
      )}
    </div>
  )
}
