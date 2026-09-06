import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'
import QuestionMedia from './QuestionMedia.jsx'

// Контролируемый вопрос-пропуск, заполняемый чипом из банка. `answer` —
// выбранное слово (или null); выбранный чип подставляется в предложение.
export default function ChipsQuestion({ question, answer, checked, onAnswer, readOnly, onWord, showAnswerKey = true }) {
  const userCorrect = checked && gradeQuestion(question, answer).correct
  const attempted = answer != null && answer !== ''

  let gapCls = 'lw-gap'
  if (checked && attempted) gapCls += userCorrect ? ' is-correct' : ' is-wrong'
  else if (answer) gapCls += ' is-filled'

  // В живом уроке эталон в пропуске не подставляем — только то, что выбрал ученик.
  const gapText = checked && showAnswerKey
    ? question.answer
    : (answer || '____')

  return (
    <div className="lw-q lw-q--chips">
      <QuestionMedia question={question} onWord={onWord} />
      <p className="lw-q__sentence">
        <TapText text={question.gapBefore} onWord={onWord} />
        <span className={gapCls}>
          {gapText}
          {checked && userCorrect && <CheckIcon size={14} />}
        </span>
        <TapText text={question.gapAfter} onWord={onWord} />
      </p>
      <div className="lw-bank">
        {(question.bank || []).map((word) => {
          const selected = answer === word
          const isCorrectWord = showAnswerKey && checked && word === question.answer
          const isYes = !showAnswerKey && checked && selected && userCorrect
          const isWrongWord = checked && selected && !userCorrect
          let cls = 'lw-chip'
          if (isCorrectWord || isYes) cls += ' is-correct'
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
