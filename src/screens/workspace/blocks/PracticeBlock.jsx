import { useI18n } from '../../../i18n.jsx'
import TapText from '../TapText.jsx'
import ChoiceQuestion from '../practice/ChoiceQuestion.jsx'
import ChipsQuestion from '../practice/ChipsQuestion.jsx'
import GapQuestion from '../practice/GapQuestion.jsx'
import MatchQuestion from '../practice/MatchQuestion.jsx'
import OrderQuestion from '../practice/OrderQuestion.jsx'
import MultiQuestion from '../practice/MultiQuestion.jsx'
import PickQuestion from '../practice/PickQuestion.jsx'

const QUESTION_BY_TYPE = {
  choice: ChoiceQuestion,
  chips: ChipsQuestion,
  gap: GapQuestion,
  match: MatchQuestion,
  order: OrderQuestion,
  multi: MultiQuestion,
  pick: PickQuestion,
}

// Карточка практики: заголовок + подсказка, список вопросов, кнопка
// «Проверить» внизу. `checked` — уже вычисленный родителем флаг для ЭТОЙ
// карточки (см. `practiceBlockKey` в LessonContent) — прокидывается в вопросы
// как есть. Повторное нажатие «Проверить» разрешено (просто снова вызывает
// `onCheck(block)`; чей это ключ — знает только родитель).
export default function PracticeBlock({ block, answers, checked, onAnswer, onCheck, readOnly, liveQuestionId, onWord }) {
  const { t } = useI18n()

  return (
    <div className="lw-card lw-practice">
      <div className="lw-practice__head">
        {block?.title && <TapText as="h3" className="lw-practice__title" text={block.title} onWord={onWord} />}
        {block?.hint && <TapText as="p" className="lw-practice__hint" text={block.hint} onWord={onWord} />}
      </div>

      <div className="lw-practice__list">
        {(block?.questions || []).map((question) => {
          const Question = QUESTION_BY_TYPE[question.type]
          if (!Question) return null
          return (
            // data-question-id — якорь для двух вещей на разных концах: у
            // ученика по нему live-трекер (useActiveQuestionTracker) считает,
            // какой вопрос сейчас в кадре; у смотрящего преподавателя по нему
            // же ищет, куда проскроллить (см. эффект в LessonContent).
            <div
              key={question.id}
              data-question-id={question.id}
              className={question.id === liveQuestionId ? 'lw-q--live-here' : undefined}
            >
              <Question
                question={question}
                answer={answers?.[question.id] ?? null}
                checked={checked}
                onAnswer={onAnswer}
                readOnly={readOnly}
                onWord={onWord}
              />
            </div>
          )
        })}
      </div>

      {/* Смотрящему кнопка не нужна: проверяет свою работу тот, кто её делает,
          а чужую «Проверить» нажимать нечем — ответы приходят зеркалом. */}
      {!readOnly && (
        <button type="button" className="lw-practice__check" onClick={() => onCheck(block)}>
          {t('lesson.ws.check')}
        </button>
      )}
    </div>
  )
}
