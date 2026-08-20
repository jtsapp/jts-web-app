import { useI18n } from '../../../i18n.jsx'
import TapText from '../TapText.jsx'
import { splitOptionLabel } from './optionLabel.js'

// Опрос про себя («нравится / не нравится», «как часто»): верного ответа нет
// и оценивать нечего — шаг засчитывается по самому факту выбора
// (gradeQuestion в practiceGrading.js). `multiple` — «отметь сколько хочешь»
// без ключа проверки: тогда answer — массив, иначе одна строка, как у
// ChoiceQuestion.
export default function PickQuestion({ question, answer, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const multiple = !!question?.multiple
  const selected = multiple ? (Array.isArray(answer) ? answer : []) : answer
  // Карточками — только варианты «картинка + слово» («☕️ Coffee»), как в макете.
  // Ответ из одного 👍 карточкой во всю колонку выглядел бы плитой без смысла:
  // такие варианты остаются пилюлями, как были.
  const asCards = (question?.options || []).some((opt) => splitOptionLabel(opt).emoji)

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
      {question?.prompt && <TapText as="p" className="lw-q__prompt" text={question.prompt} onWord={onWord} />}
      <p className="lw-pick__hint">{t('lesson.ws.pickHint')}</p>
      {/* Опрос про себя — карточками, как в макете: картинка сверху, слово под
          ней. Вариант без картинки остаётся той же карточкой с одним словом. */}
      <div className={`lw-opts${asCards ? ' lw-opts--cards' : ''}`}>
        {(question?.options || []).map((opt) => {
          const isSelected = multiple ? selected.includes(opt) : selected === opt
          const { emoji, text } = splitOptionLabel(opt)
          return (
            <button
              key={opt}
              type="button"
              className={`lw-opt${asCards ? ' lw-opt--card' : ''}${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              disabled={readOnly}
              onClick={() => toggle(opt)}
            >
              {asCards && emoji && <span className="lw-opt__emoji" aria-hidden="true">{emoji}</span>}
              <span className={asCards ? 'lw-opt__text' : undefined}>{asCards ? text : opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
