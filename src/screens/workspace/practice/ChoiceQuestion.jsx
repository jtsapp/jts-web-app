import { useI18n } from '../../../i18n.jsx'
import { speak } from '../../../practice/vocab/audio.js'
import { gradeQuestion, hasAttempt } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'
import { tidyLessonText } from '../tidyLessonText.js'

// Контролируемый выбор одного варианта из ряда кнопок. `answer` — текущая
// выбранная строка (или null); `onAnswer(question.id, value)` репортит выбор
// наверх. Грейдинг — только через `gradeQuestion` (не дублируем сравнение).
//
// До «Проверить» пилюля только `is-selected`: зелёный/красный до проверки —
// это подсказка с ответом, а после проверки ряд закрывается. Повторно
// ответить можно, только если преподаватель сбросит этот вопрос.
export default function ChoiceQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const chosen = hasAttempt(question, answer)
  const correct = chosen && gradeQuestion(question, answer).correct
  const locked = checked || readOnly
  const open = !!question.open

  return (
    <div className="lw-q lw-q--choice">
      {/* В заданиях Listening формулировка — «🔊 Word 1», а что именно звучит,
          знает только `say`: без кнопки вопрос не отвечаем в принципе. Речь
          синтезируется — записи слова в курсе нет, есть только вызов синтеза. */}
      {question.say && (
        <button
          type="button"
          className="lw-say"
          onClick={() => speak(question.say)}
          aria-label={t('lesson.play')}
        >
          🔊
        </button>
      )}
      {question.prompt && <TapText as="p" className="lw-q__prompt" text={question.prompt} onWord={onWord} />}
      {question.imageUrl && <img className="lw-q__img" src={question.imageUrl} alt="" />}
      <div className="lw-opts">
        {(question.options || []).map((opt) => {
          const selected = answer === opt
          const isOk = !open && checked && chosen && ((selected && correct) || opt === question.answer)
          const isNo = !open && checked && chosen && selected && !correct

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
              disabled={locked}
              onClick={() => onAnswer(question.id, opt)}
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
      {checked && chosen && !correct && question.why && (
        <p className="lw-q__why">{tidyLessonText(question.why)}</p>
      )}
    </div>
  )
}
