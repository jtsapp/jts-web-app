import { gradeQuestion, hasAttempt } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import { inlineBold } from '../inlineBold.jsx'
import QuestionMedia from './QuestionMedia.jsx'

// Контролируемый выбор одного варианта из ряда кнопок. `answer` — текущая
// выбранная строка (или null); `onAnswer(question.id, value)` репортит выбор
// наверх. Грейдинг — только через `gradeQuestion` (не дублируем сравнение).
//
// До «Проверить» пилюля только `is-selected`: зелёный/красный до проверки —
// это подсказка с ответом, а после проверки ряд закрывается. Повторно
// ответить можно, только если преподаватель сбросит этот вопрос.
export default function ChoiceQuestion({ question, answer, checked, onAnswer, readOnly, onWord, showAnswerKey = true }) {
  const chosen = hasAttempt(question, answer)
  const correct = chosen && gradeQuestion(question, answer).correct
  const locked = checked || readOnly
  const open = !!question.open

  return (
    <div className="lw-q lw-q--choice">
      <QuestionMedia question={question} onWord={onWord} />
      <div className="lw-opts">
        {(question.options || []).map((opt) => {
          const selected = answer === opt
          // Эталон подсвечиваем только когда ключ открыт (staff / самообучение).
          // На живом уроке ученик видит только вердикт по СВОЕМУ выбору —
          // иначе зелёная галочка на чужой кнопке и есть «ответ без нажатия».
          const isOk = showAnswerKey && !open && checked && opt === question.answer
          const isYes = !showAnswerKey && !open && checked && chosen && selected && correct
          const isNo = !open && checked && chosen && selected && !correct

          let cls = 'lw-opt'
          if (isOk || isYes) cls += ' is-ok'
          else if (isNo) cls += ' is-no'
          else if (selected) cls += ' is-selected'

          return (
            <button
              key={opt}
              type="button"
              className={cls}
              aria-pressed={selected}
              disabled={locked}
              onClick={() => onAnswer(question.id, opt)}
            >
              <span>{opt}</span>
              {(isOk || isYes) && <CheckIcon size={14} />}
              {isNo && (
                <span className="lw-opt__mark" aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
          )
        })}
      </div>
      {showAnswerKey && checked && !open && !correct && question.why && (
        <p className="lw-q__why">{inlineBold(question.why)}</p>
      )}
    </div>
  )
}
