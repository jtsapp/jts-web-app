import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'

// Контролируемый выбор одного варианта из ряда кнопок. `answer` — текущая
// выбранная строка (или null); `onAnswer(question.id, value)` репортит выбор
// наверх. Грейдинг — только через `gradeQuestion` (не дублируем сравнение).
//
// Валидация мгновенная: клик сразу красит выбранный вариант в ok или no, без
// кнопки «Проверить» (спека §4.3 — «Один клик — сразу видно, попал или нет»).
// Кнопкой проверяются пропуски, у них ответ печатают, а не выбирают. Выбор
// остаётся доступным после клика: спека не запрещает переспросить себя, а
// заблокированный ряд читался бы как «шаг закрыт».
export default function ChoiceQuestion({ question, answer, checked, onAnswer }) {
  const chosen = answer != null
  const correct = chosen && gradeQuestion(question, answer).correct

  return (
    <div className="lw-q lw-q--choice">
      {question.prompt && <p className="lw-q__prompt">{question.prompt}</p>}
      <div className="lw-opts">
        {(question.options || []).map((opt) => {
          const selected = answer === opt
          const isOk = selected && correct
          const isNo = selected && !correct
          // После «Проверить» подсвечиваем верный вариант, даже если ученик
          // его не выбрал — иначе на ошибке не видно, где правильный ответ.
          const revealCorrect = checked && !correct && opt === question.answer

          let cls = 'lw-opt'
          if (isOk || revealCorrect) cls += ' is-ok'
          else if (isNo) cls += ' is-no'

          return (
            <button
              key={opt}
              type="button"
              className={cls}
              aria-pressed={selected}
              onClick={() => onAnswer(question.id, opt)}
            >
              <span>{opt}</span>
              {(isOk || revealCorrect) && <CheckIcon size={14} />}
              {isNo && (
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
