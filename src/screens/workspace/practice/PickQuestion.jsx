import { useI18n } from '../../../i18n.jsx'
import TapText from '../TapText.jsx'
import { optionsAreCards, splitOptionLabel } from './optionLabel.js'

// Опрос про себя («нравится / не нравится», «как часто»): верного ответа нет
// и оценивать нечего — шаг засчитывается по самому факту выбора
// (gradeQuestion в practiceGrading.js). `multiple` — «отметь сколько хочешь»
// без ключа проверки: тогда answer — массив, иначе одна строка, как у
// ChoiceQuestion.
export default function PickQuestion({ question, answer, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const multiple = !!question?.multiple
  const selected = multiple ? (Array.isArray(answer) ? answer : []) : answer
  // Карточки из макета — не режим отдельного экрана, а способ рисовать такие
  // данные: вариант с картинкой и словом («☕️ Coffee») становится карточкой,
  // ответ из одного 👍 остаётся пилюлей — карточкой во всю колонку он был бы
  // плитой без смысла.
  const asCards = optionsAreCards(question?.options)
  // Второй вид карточки: карточка — сам пункт, а оценка стоит внутри неё. Так
  // курс и пишет разминку: формулировка несёт картинку со словом, а варианты —
  // это 👍 и 👎, которыми пункт отмечают.
  const promptCard = !asCards && !!splitOptionLabel(question?.prompt).emoji
  const prompt = splitOptionLabel(question?.prompt)

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
    <div className={`lw-q lw-q--pick${promptCard ? ' lw-q--pick-card' : ''}`}>
      {promptCard ? (
        <p className="lw-pick__item">
          <span className="lw-opt__emoji" aria-hidden="true">{prompt.emoji}</span>
          <span className="lw-opt__text">{prompt.text}</span>
        </p>
      ) : (
        question?.prompt && <TapText as="p" className="lw-q__prompt" text={question.prompt} onWord={onWord} />
      )}
      {/* Подсказку «верного ответа нет» на карточке не печатаем: она повторялась бы
          под каждым пунктом сетки и заняла бы больше места, чем сами пункты. */}
      {!promptCard && <p className="lw-pick__hint">{t('lesson.ws.pickHint')}</p>}
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
