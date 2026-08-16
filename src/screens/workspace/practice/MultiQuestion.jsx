import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'

// «Отметь всё, что услышал»: верных вариантов несколько. `answer` — массив
// выбранных строк; выбор снимается повторным нажатием.
//
// Отдельный компонент, а не ChoiceQuestion с флагом: у выбора клик означает
// «ответил», и результат виден сразу, а здесь ответ готов только когда отмечено
// всё нужное — поэтому и подсветка появляется лишь после «Проверить».
export default function MultiQuestion({ question, answer, checked, onAnswer, readOnly }) {
  const chosen = Array.isArray(answer) ? answer : []
  const userCorrect = checked && gradeQuestion(question, chosen).correct
  const locked = checked || readOnly

  const toggle = (option) => {
    if (locked) return
    onAnswer(
      question.id,
      chosen.includes(option) ? chosen.filter((item) => item !== option) : [...chosen, option],
    )
  }

  return (
    <div className="lw-q lw-q--multi">
      {question.prompt && <p className="lw-q__prompt">{question.prompt}</p>}
      <div className="lw-opts">
        {(question.options || []).map((option) => {
          const selected = chosen.includes(option)
          const isAnswer = (question.answers || []).includes(option)
          // После проверки показываем и пропущенное верное, и лишнее выбранное —
          // иначе на ошибке не видно, чего не хватило, а что лишнее.
          let cls = 'lw-opt'
          if (checked && isAnswer) cls += ' is-ok'
          else if (checked && selected) cls += ' is-no'
          else if (selected) cls += ' is-selected'

          return (
            <button
              key={option}
              type="button"
              className={cls}
              aria-pressed={selected}
              disabled={locked}
              onClick={() => toggle(option)}
            >
              <span>{option}</span>
              {checked && isAnswer && <CheckIcon size={14} />}
              {checked && selected && !isAnswer && (
                <span className="lw-opt__mark" aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
          )
        })}
      </div>
      {checked && !userCorrect && (
        <p className="lw-q__answer" aria-live="polite">
          {(question.answers || []).join(', ')}
        </p>
      )}
    </div>
  )
}
