import { useI18n } from '../../../i18n.jsx'
import { gradeQuestion, isGraded } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'

// Контролируемый вопрос со свободным вводом. `answer` — введённый текст;
// нормализация регистра/пробелов и сравнение с допустимыми `answers` — только
// через `gradeQuestion` (не дублируем `norm` здесь).
export default function GapQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const value = answer || ''
  // Свободный пропуск сверять не с чем: ответ принимается, но «верным» не
  // объявляется — иначе любой набор букв возвращался бы зелёной галочкой.
  const graded = isGraded(question)
  const userCorrect = checked && graded && gradeQuestion(question, value).correct

  let cls = 'lw-gap-input'
  if (checked) cls += graded ? (userCorrect ? ' is-correct' : ' is-wrong') : ' is-accepted'

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
        <TapText text={question.gapAfter} onWord={onWord} />
      </p>
      {checked && !graded && (
        <p className="lw-q__free" aria-live="polite">{t('lesson.freeAnswer')}</p>
      )}
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
