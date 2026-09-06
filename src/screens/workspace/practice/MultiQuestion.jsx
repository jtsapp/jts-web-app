import { CheckIcon } from '../../../components/icons.jsx'
import QuestionMedia from './QuestionMedia.jsx'

// «Отметь всё, что услышал»: несколько вариантов верны одновременно.
// `answer` — массив отмеченных строк; засчитывается только полный набор
// (gradeQuestion в practiceGrading.js). После «Проверить» подсвечиваем и
// пропущенные верные варианты — иначе на ошибке не видно, чего не хватило.
export default function MultiQuestion({ question, answer, checked, onAnswer, readOnly, onWord, showAnswerKey = true }) {
  const picked = Array.isArray(answer) ? answer : []

  function toggle(opt) {
    if (checked || readOnly) return
    const set = new Set(picked)
    if (set.has(opt)) set.delete(opt)
    else set.add(opt)
    onAnswer(question.id, [...set])
  }

  return (
    <div className="lw-q lw-q--multi">
      <QuestionMedia question={question} onWord={onWord} />
      <div className="lw-opts">
        {(question?.options || []).map((opt) => {
          const selected = picked.includes(opt)
          const isAnswer = (question.answers || []).includes(opt)
          const isOk = showAnswerKey && checked && isAnswer
          const isYes = !showAnswerKey && checked && selected && isAnswer
          const isNo = checked && selected && !isAnswer

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
              disabled={checked || readOnly}
              onClick={() => toggle(opt)}
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
    </div>
  )
}
