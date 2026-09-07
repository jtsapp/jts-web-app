import { useI18n } from '../../../i18n.jsx'
import { gradeQuestion, hasAttempt } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'
import { tidyLessonText } from '../tidyLessonText.js'
import { inlineBold } from '../inlineBold.jsx'
import QuestionMedia from './QuestionMedia.jsx'

// Контролируемый вопрос со свободным вводом. `answer` — введённый текст;
// нормализация регистра/пробелов и сравнение с допустимыми `answers` — только
// через `gradeQuestion` (не дублируем `norm` здесь).
export default function GapQuestion({ question, answer, checked, onAnswer, readOnly, onWord, showAnswerKey = true }) {
  const { t } = useI18n()
  const value = answer || ''
  const attempted = hasAttempt(question, value)
  const verdict = checked && attempted ? gradeQuestion(question, value) : null
  // Открытый пропуск сверять не с чем: показывать по нему «верно» — врать.
  // Берём это из самого вопроса, а не из вердикта: у пропущенного вопроса
  // вердикта нет вовсе, а знать, есть ли эталон, надо и по нему.
  const isOpen = question.open === true
  const userCorrect = !!verdict?.correct && !isOpen
  // Ученик пропустил задание — самый повод показать, как было верно. Раньше
  // и ответ, и разбор висели на `attempted`, и пропущенный пропуск оставался
  // пустым полем без единого объяснения. `attempted` теперь решает только,
  // красить ли ОТВЕТ УЧЕНИКА: пустое поле не красное и не зелёное.
  // На живом уроке эталон/разбор всё равно только у преподавателя
  // (`showAnswerKey`), иначе ученик видит «Правильный ответ» без разбора с учителем.

  let cls = 'lw-gap-input'
  if (checked && attempted) {
    if (isOpen) cls += ' is-review'
    else cls += userCorrect ? ' is-correct' : ' is-wrong'
  }

  return (
    <div className="lw-q lw-q--gap">
      <QuestionMedia question={question} onWord={onWord} />
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
      {/* «Нужна проверка преподавателя» — только по данному ответу: проверять
          пропущенный пропуск нечего, и звать за этим преподавателя незачем. */}
      {checked && attempted && isOpen && (
        <p className="lw-q__review" aria-live="polite">{t('lesson.needsTeacherReview')}</p>
      )}
      {showAnswerKey && checked && !userCorrect && !isOpen && (
        <p className="lw-q__answer" aria-live="polite">
          {t('lesson.answerWas')}: {(question.answers || []).join(' / ')}
        </p>
      )}
      {showAnswerKey && checked && !userCorrect && !isOpen && question.why && (
        <p className="lw-q__why">{inlineBold(question.why)}</p>
      )}
    </div>
  )
}
