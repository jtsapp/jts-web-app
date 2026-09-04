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
export default function ChoiceQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
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
          // Верный вариант подсвечиваем после «Проверить» даже если ученик не
          // выбрал ничего: пропущенный вопрос — повод узнать ответ, а не
          // остаться с рядом одинаковых кнопок.
          const isOk = !open && checked && opt === question.answer
          // А вот КРЕСТ ставим только на своём ответе: на пустом вопросе
          // отмечать нечего, и красить его красным было бы враньём.
          const isNo = !open && checked && chosen && selected && !correct

          let cls = 'lw-opt'
          if (isOk) cls += ' is-ok'
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
              {isOk && <CheckIcon size={14} />}
              {isNo && (
                <span className="lw-opt__mark" aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
          )
        })}
      </div>
      {/* Разбор — и на ошибке, и на пропуске. У открытых вопросов эталона нет,
          поэтому там его по-прежнему не показываем. */}
      {checked && !open && !correct && question.why && (
        <p className="lw-q__why">{inlineBold(question.why)}</p>
      )}
    </div>
  )
}
