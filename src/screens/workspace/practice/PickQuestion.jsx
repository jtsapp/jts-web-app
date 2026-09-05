import { useI18n } from '../../../i18n.jsx'
import QuestionMedia from './QuestionMedia.jsx'

// Опрос про себя («нравится / не нравится», «как часто»): верного ответа нет
// и оценивать нечего — шаг засчитывается по самому факту выбора
// (gradeQuestion в practiceGrading.js). `multiple` — «отметь сколько хочешь»
// без ключа проверки: тогда answer — массив, иначе одна строка, как у
// ChoiceQuestion.
//
// `showHint` — показать ли подпись «верного ответа нет». Родитель гасит её у
// всех пунктов, кроме первого: в опросе из семи слов правило одно на всё
// упражнение, а семь одинаковых строк только прячут сами вопросы.
export default function PickQuestion({ question, answer, checked, onAnswer, readOnly, onWord, showHint = true }) {
  const { t } = useI18n()
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
      {showHint && <p className="lw-pick__hint">{t('lesson.ws.pickHint')}</p>}
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
