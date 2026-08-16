// Опрос про себя: «нравится или нет», «как часто», «согласен или нет».
//
// Верного ответа тут нет, поэтому после проверки ничего не краснеет и не
// зеленеет — выбор просто остаётся отмеченным. Отдельный компонент, а не
// ChoiceQuestion без ключа: там весь смысл в подсветке попадания, и разделять
// их флагом значило бы тащить через весь компонент ветку «а тут не оценивать».
export default function PickQuestion({ question, answer, checked, onAnswer, readOnly }) {
  const locked = checked || readOnly
  // «Выбери сколько хочешь» (data-multi без ключа) — тот же опрос, только отметок
  // может быть несколько. Ответ тогда массив, иначе строка.
  const many = question.multiple === true
  const chosen = many ? (Array.isArray(answer) ? answer : []) : []
  const isOn = (option) => (many ? chosen.includes(option) : answer === option)

  const toggle = (option) => {
    if (locked) return
    if (!many) return onAnswer(question.id, option)
    onAnswer(
      question.id,
      chosen.includes(option) ? chosen.filter((item) => item !== option) : [...chosen, option],
    )
  }

  return (
    <div className="lw-q lw-q--pick">
      {question.prompt && <p className="lw-q__prompt">{question.prompt}</p>}
      <div className="lw-opts">
        {(question.options || []).map((option) => (
          <button
            key={option}
            type="button"
            className={`lw-opt${isOn(option) ? ' is-selected' : ''}`}
            aria-pressed={isOn(option)}
            disabled={locked}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
