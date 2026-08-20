import { useI18n } from '../../../i18n.jsx'
import { speak } from '../../../practice/vocab/audio.js'
import { gradeQuestion } from '../practiceGrading.js'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'

// Контролируемый выбор одного варианта из ряда кнопок. `answer` — текущая
// выбранная строка (или null); `onAnswer(question.id, value)` репортит выбор
// наверх. Грейдинг — только через `gradeQuestion` (не дублируем сравнение).
//
// Валидация мгновенная: клик сразу красит выбранный вариант в ok или no, без
// кнопки «Проверить» (спека §4.3 — «Один клик — сразу видно, попал или нет»).
// Кнопкой проверяются пропуски, у них ответ печатают, а не выбирают. Выбор
// остаётся доступным после клика: спека не запрещает переспросить себя, а
// заблокированный ряд читался бы как «шаг закрыт».
//
// `readOnly` — единственное, что закрывает выбор: так преподаватель смотрит
// работу ученика. Отвечать за него он не должен, и дело не в дисциплине — его
// клик ушёл бы в его же состояние, разъехавшись с тем, что видит ученик.
export default function ChoiceQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const chosen = answer != null
  const correct = chosen && gradeQuestion(question, answer).correct

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
          const isOk = selected && correct
          const isNo = selected && !correct
          // После «Проверить» подсвечиваем верный вариант, даже если ученик
          // его не выбрал — иначе на ошибке не видно, где правильный ответ.
          const revealCorrect = checked && !correct && opt === question.answer

          let cls = 'lw-opt'
          if (isOk || revealCorrect) cls += ' is-ok'
          else if (isNo) cls += ' is-no'

          return (
            <button
              key={opt}
              type="button"
              className={cls}
              aria-pressed={selected}
              disabled={readOnly}
              onClick={() => onAnswer(question.id, opt)}
            >
              <span>{opt}</span>
              {(isOk || revealCorrect) && <CheckIcon size={14} />}
              {isNo && (
                <span className="lw-opt__mark" aria-hidden="true">
                  ✕
                </span>
              )}
            </button>
          )
        })}
      </div>
      {/* Разбор из `data-why` курса — правило, по которому строка «какое слово
          лишнее» проверяется. Выбор здесь мгновенный (без «Проверить»), поэтому
          и разбор всплывает сразу за неверным кликом, а не ждёт общей проверки. */}
      {chosen && !correct && question.why && (
        <p className="lw-q__why">{question.why}</p>
      )}
    </div>
  )
}
