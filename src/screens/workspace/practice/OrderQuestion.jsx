import { useI18n } from '../../../i18n.jsx'
import { gradeQuestion, hasAttempt } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import QuestionMedia from './QuestionMedia.jsx'

/**
 * Слова банка, ещё не поставленные в предложение: жадно вычёркиваем из
 * `question.words` (слева направо) по одному вхождению на каждое слово уже
 * собранного `answer` — так повторяющиеся слова («the», «a») не путаются
 * между собой, и банк не считается пустым раньше времени.
 */
function bankIndices(words, answer) {
  const used = new Array(words.length).fill(false)
  const remaining = [...answer]
  words.forEach((word, i) => {
    const pos = remaining.indexOf(word)
    if (pos !== -1) {
      used[i] = true
      remaining.splice(pos, 1)
    }
  })
  return used
}

// Контролируемый order-вопрос («собери предложение»): банк слов сверху,
// собранное предложение снизу. Клик по слову банка добавляет его в конец
// предложения; клик по слову в предложении откатывает всё ПОСЛЕ него тоже
// (включая само слово) — простое и всегда однозначное правило, в отличие от
// удаления одного слова из середины при повторяющихся словах в банке.
export default function OrderQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const words = question?.words || []
  const built = Array.isArray(answer) ? answer : []
  const used = bankIndices(words, built)
  const done = built.length === words.length
  const attempted = hasAttempt(question, built)
  const correct = done && gradeQuestion(question, built).correct

  function pick(word, index) {
    if (checked || readOnly || used[index]) return
    onAnswer(question.id, [...built, word])
  }

  function removeFrom(pos) {
    if (checked || readOnly) return
    onAnswer(question.id, built.slice(0, pos))
  }

  let sentenceCls = 'lw-order__sentence'
  if (checked && attempted) sentenceCls += correct ? ' is-correct' : ' is-wrong'

  return (
    <div className="lw-q lw-q--order">
      <QuestionMedia question={question} onWord={onWord} />
      {!checked && <p className="lw-order__hint">{t('lesson.ws.orderHint')}</p>}

      <div className={sentenceCls} role="group" aria-label={question?.prompt}>
        {built.length === 0 && <span className="lw-order__placeholder">…</span>}
        {built.map((word, i) => (
          <button
            key={`${word}-${i}`}
            type="button"
            className="lw-ochip lw-ochip--placed"
            disabled={checked || readOnly}
            onClick={() => removeFrom(i)}
          >
            {word}
          </button>
        ))}
        {checked && (correct ? <CheckIcon size={16} /> : null)}
      </div>

      <div className="lw-order__bank">
        {words.map((word, i) => {
          // Взятое слово не прячем через visibility — оно держало бы свою
          // ширину в потоке. У коротких слов это неважно, но у банка из
          // предложений-фраз (`Are you really my friend?`, s5-o0) несколько
          // невидимых, но всё ещё широких плашек подряд отодвигали оставшиеся
          // слова в случайные на вид места. Не рисуем взятое слово вовсе —
          // банк просто сжимается, а не оставляет за собой дыры.
          if (used[i]) return null
          return (
            <button
              key={`${word}-${i}`}
              type="button"
              className="lw-ochip"
              disabled={checked || readOnly}
              onClick={() => pick(word, i)}
            >
              {word}
            </button>
          )
        })}
      </div>

      {/* И на ошибке, и на пропуске: собранного предложения нет — тем более
          нужно показать, каким оно должно было получиться. */}
      {checked && !correct && (
        <p className="lw-q__answer" aria-live="polite">
          {t('lesson.answerWas')}: {(question.answer || []).join(' ')}
        </p>
      )}
    </div>
  )
}
