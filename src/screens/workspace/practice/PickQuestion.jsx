import { useI18n } from '../../../i18n.jsx'

// Опрос про себя («нравится / не нравится», «как часто»): верного ответа нет
// и оценивать нечего — шаг засчитывается по самому факту выбора
// (gradeQuestion в practiceGrading.js). `multiple` — «отметь сколько хочешь»
// без ключа проверки: тогда answer — массив, иначе одна строка, как у
// ChoiceQuestion.
export default function PickQuestion({ question, answer, onAnswer, readOnly }) {
  const { t } = useI18n()
  const multiple = !!question?.multiple
  const selected = multiple ? (Array.isArray(answer) ? answer : []) : answer

  function toggle(opt) {
    if (readOnly) return
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
      {question?.prompt && <p className="lw-q__prompt">{question.prompt}</p>}
      <p className="lw-pick__hint">{t('lesson.ws.pickHint')}</p>
      <div className="lw-opts">
        {(question?.options || []).map((opt) => {
          const isSelected = multiple ? selected.includes(opt) : selected === opt
          return (
            <button
              key={opt}
              type="button"
              className={`lw-opt${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              disabled={readOnly}
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
