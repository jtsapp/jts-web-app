import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'

// Контролируемый вопрос-пропуск, заполняемый чипом из банка. `answer` —
// выбранное слово (или null); выбранный чип подставляется в предложение.
export default function ChipsQuestion({ question, answer, checked, onAnswer, readOnly }) {
  const userCorrect = checked && gradeQuestion(question, answer).correct

  let gapCls = 'lw-gap'
  if (checked) gapCls += userCorrect ? ' is-correct' : ' is-wrong'
  else if (answer) gapCls += ' is-filled'

  return (
    <div className="lw-q lw-q--chips">
      <p className="lw-q__sentence">
        {question.gapBefore}
        <span className={gapCls}>
          {checked ? question.answer : answer || '____'}
          {checked && userCorrect && <CheckIcon size={14} />}
        </span>
        {question.gapAfter}
      </p>
      <div className="lw-bank">
        {(question.bank || []).map((word) => {
          const selected = answer === word
          const isCorrectWord = checked && word === question.answer
          const isWrongWord = checked && selected && !userCorrect
          let cls = 'lw-chip'
          if (isCorrectWord) cls += ' is-correct'
          else if (isWrongWord) cls += ' is-wrong'
          else if (selected) cls += ' is-selected'
          return (
            <button
              key={word}
              type="button"
              className={cls}
              aria-pressed={selected}
              disabled={checked || readOnly}
              onClick={() => onAnswer(question.id, selected ? null : word)}
            >
              {word}
            </button>
          )
        })}
      </div>
    </div>
  )
}
