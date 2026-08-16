import { useI18n } from '../../../i18n.jsx'
import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'

// «Собери предложение»: слова из банка складываются в строку сверху, повторный
// тап по слову в строке возвращает его в банк.
//
// Ответ наверх уходит массивом СЛОВ, а не индексов: в этом же виде его читают
// грейдинг и учительский экран, и лишний слой перевода там не нужен.
//
// Слова в предложении повторяются («I like coffee, I …»), поэтому банк считается
// вычитанием по одному вхождению, а не фильтром по вхождению в массив: иначе
// первый же выбранный «I» убрал бы из банка сразу оба.
function remainingWords(words, chosen) {
  const left = [...chosen]
  return words.filter((word) => {
    const at = left.indexOf(word)
    if (at < 0) return true
    left.splice(at, 1)
    return false
  })
}

export default function OrderQuestion({ question, answer, checked, onAnswer, readOnly }) {
  const { t } = useI18n()
  const chosen = Array.isArray(answer) ? answer : []
  const bank = remainingWords(question.words || [], chosen)
  const userCorrect = checked && gradeQuestion(question, chosen).correct

  const locked = checked || readOnly

  const put = (word) => {
    if (locked) return
    onAnswer(question.id, [...chosen, word])
  }

  const take = (index) => {
    if (locked) return
    onAnswer(
      question.id,
      chosen.filter((_, i) => i !== index),
    )
  }

  let lineCls = 'lw-order__line'
  if (checked) lineCls += userCorrect ? ' is-correct' : ' is-wrong'

  return (
    <div className="lw-q lw-q--order">
      {question.prompt && <p className="lw-q__prompt">{question.prompt}</p>}

      <div className={lineCls}>
        {chosen.length === 0 && <span className="lw-order__empty">{t('lesson.order.empty')}</span>}
        {chosen.map((word, index) => (
          <button
            // Одинаковые слова в предложении разводятся позицией: ключом по слову
            // React перепутал бы два «I» местами при возврате одного в банк.
            key={`${word}-${index}`}
            type="button"
            className="lw-chip lw-chip--placed"
            disabled={locked}
            onClick={() => take(index)}
          >
            {word}
          </button>
        ))}
        {checked && userCorrect && <CheckIcon size={14} />}
      </div>

      <div className="lw-bank">
        {bank.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            className="lw-chip"
            disabled={locked}
            onClick={() => put(word)}
          >
            {word}
          </button>
        ))}
      </div>

      {checked && !userCorrect && (
        <p className="lw-q__answer" aria-live="polite">
          {t('lesson.answerWas')}: {(question.answer || []).join(' ')}
        </p>
      )}
    </div>
  )
}
