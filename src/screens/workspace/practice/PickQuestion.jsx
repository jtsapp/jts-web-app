import QuestionMedia from './QuestionMedia.jsx'

// Опрос про себя («нравится / не нравится», «как часто»): верного ответа нет
// и оценивать нечего — шаг засчитывается по самому факту выбора
// (gradeQuestion в practiceGrading.js). `multiple` — «отметь сколько хочешь»
// без ключа проверки: тогда answer — массив, иначе одна строка, как у
// ChoiceQuestion.
//
// Подпись «верного ответа нет» рисует не вопрос, а карточка упражнения: правило
// одно на всё упражнение, и в опросе из десяти слов десять одинаковых строк
// только прячут сами вопросы, а заодно ломают строку «слово — кнопки».
export default function PickQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const multiple = !!question?.multiple
  const selected = multiple ? (Array.isArray(answer) ? answer : []) : answer
  const locked = checked || readOnly

  function toggle(opt) {
    if (locked) return
    if (!multiple) {
      onAnswer(question.id, opt)
      return
    }
    const set = new Set(selected)
    if (set.has(opt)) set.delete(opt)
    else set.add(opt)
    onAnswer(question.id, [...set])
  }

  return (
    <div className="lw-q lw-q--pick">
      <QuestionMedia question={question} onWord={onWord} />
      <div className="lw-opts">
        {(question?.options || []).map((opt) => {
          const isSelected = multiple ? selected.includes(opt) : selected === opt
          return (
            <button
              key={opt}
              type="button"
              className={`lw-opt${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              disabled={locked}
              onClick={() => toggle(opt)}
            >
              <span>{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
