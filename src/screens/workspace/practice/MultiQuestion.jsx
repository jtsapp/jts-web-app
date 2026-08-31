import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'

// «Отметь всё, что услышал»: несколько вариантов верны одновременно.
// `answer` — массив отмеченных строк; засчитывается только полный набор
// (gradeQuestion в practiceGrading.js). После «Проверить» подсвечиваем и
// пропущенные верные варианты — иначе на ошибке не видно, чего не хватило.
export default function MultiQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
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
      {question?.prompt && <TapText as="p" className="lw-q__prompt" text={question.prompt} onWord={onWord} />}
      <div className="lw-opts">
        {(question?.options || []).map((opt) => {
          const selected = picked.includes(opt)
          const isAnswer = (question.answers || []).includes(opt)
          // Все верные варианты — после «Проверить», даже если ученик не отметил
          // ничего: иначе на пропущенном вопросе не видно, что вообще требовалось.
          const isOk = checked && isAnswer
          // Крест — только на своём выборе.
          const isNo = checked && selected && !isAnswer

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
              disabled={checked || readOnly}
              onClick={() => toggle(opt)}
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
    </div>
  )
}
