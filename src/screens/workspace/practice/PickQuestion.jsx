import QuestionMedia from './QuestionMedia.jsx'
import { stableShuffle } from './optionOrder.js'

// Опрос про себя («нравится / не нравится», «как часто»): верного ответа нет
// и оценивать нечего — шаг засчитывается по самому факту выбора
// (gradeQuestion в practiceGrading.js). `multiple` — «отметь сколько хочешь»
// без ключа проверки: тогда answer — массив, иначе одна строка, как у
// ChoiceQuestion.
//
// Подпись «верного ответа нет» рисует не вопрос, а карточка упражнения: правило
// одно на всё упражнение, и в опросе из десяти слов десять одинаковых строк
// только прячут сами вопросы, а заодно ломают строку «слово — кнопки».

/** Короткие ответы (emoji / 1–2 слова) — слово и кнопки в одну строку.
 *  Длинные фразы в одну строку сжимают формулировку до одной буквы в столбец
 *  (grid 1fr + auto + overflow-wrap:anywhere на живом уроке). */
export function isCompactPick(options) {
  const opts = Array.isArray(options) ? options : []
  if (!opts.length) return false
  return opts.every((o) => {
    const s = String(o ?? '').trim()
    if (!s || s.length > 14) return false
    return s.split(/\s+/).length <= 2
  })
}

export default function PickQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const multiple = !!question?.multiple
  const selected = multiple ? (Array.isArray(answer) ? answer : []) : answer
  const locked = checked || readOnly
  const row = isCompactPick(question?.options)

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
    <div className={`lw-q lw-q--pick${row ? ' lw-q--pick-row' : ''}`}>
      {/* Обёртка: QuestionMedia отдаёт фрагмент (🔊 + текст + картинка), и без
          неё каждый кусок становился отдельной колонкой грида. */}
      <div className="lw-q__media">
        <QuestionMedia question={question} onWord={onWord} />
      </div>
      <div className="lw-opts">
        {stableShuffle(question?.options, question?.id).map((opt) => {
          const isSelected = multiple ? selected.includes(opt) : selected === opt
          return (
            <button
              key={opt}
              type="button"
              className={`lw-opt${isSelected ? ' is-selected' : ''}${!isSelected && readOnly ? ' is-locked' : ''}`}
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
