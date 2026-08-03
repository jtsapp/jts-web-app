import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'

// Контролируемый выбор одного варианта из ряда кнопок. `answer` — текущая
// выбранная строка (или null); `onAnswer(question.id, value)` репортит выбор
// наверх. Грейдинг — только через `gradeQuestion` (не дублируем сравнение).
export default function ChoiceQuestion({ question, answer, checked, onAnswer }) {
  const userCorrect = checked && gradeQuestion(question, answer).correct

  return (
    <div className="lw-q lw-q--choice">
      {question.prompt && <p className="lw-q__prompt">{question.prompt}</p>}
      <div className="lw-opts">
        {(question.options || []).map((opt) => {
          const selected = answer === opt
          const isCorrectOpt = checked && opt === question.answer
          const isWrongOpt = checked && selected && !userCorrect
          let cls = 'lw-opt'
          if (isCorrectOpt) cls += ' is-correct'
          else if (isWrongOpt) cls += ' is-wrong'
          else if (selected) cls += ' is-selected'
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              aria-pressed={selected}
              disabled={checked}
              onClick={() => onAnswer(question.id, opt)}
            >
              <span>{opt}</span>
              {isCorrectOpt && <CheckIcon size={14} />}
              {isWrongOpt && (
                <span className="lw-opt__mark" aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
