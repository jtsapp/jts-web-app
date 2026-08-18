import { useI18n } from '../../../i18n.jsx'
import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'

// Контролируемый вопрос со свободным вводом. `answer` — введённый текст;
// нормализация регистра/пробелов и сравнение с допустимыми `answers` — только
// через `gradeQuestion` (не дублируем `norm` здесь).
export default function GapQuestion({ question, answer, checked, onAnswer, readOnly }) {
  const { t } = useI18n()
  const value = answer || ''
  const userCorrect = checked && gradeQuestion(question, value).correct

  let cls = 'lw-gap-input'
  if (checked) cls += userCorrect ? ' is-correct' : ' is-wrong'

  return (
    <div className="lw-q lw-q--gap">
      <p className="lw-q__sentence">
        {question.gapBefore}
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
        {question.gapAfter}
      </p>
      {checked && !userCorrect && !question.open && (
        <p className="lw-q__answer" aria-live="polite">
          {t('lesson.answerWas')}: {(question.answers || []).join(' / ')}
        </p>
      )}
      {/* Разбор из `data-why` курса — правило, которое проверяет задание. Показываем
          только после ошибки: до неё это была бы подсказка с ответом. */}
      {checked && !userCorrect && question.why && (
        <p className="lw-q__why">{question.why}</p>
      )}
    </div>
  )
}
