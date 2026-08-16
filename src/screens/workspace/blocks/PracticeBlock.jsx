import { useI18n } from '../../../i18n.jsx'
import ChoiceQuestion from '../practice/ChoiceQuestion.jsx'
import ChipsQuestion from '../practice/ChipsQuestion.jsx'
import GapQuestion from '../practice/GapQuestion.jsx'
import MatchQuestion from '../practice/MatchQuestion.jsx'
import MultiQuestion from '../practice/MultiQuestion.jsx'
import OrderQuestion from '../practice/OrderQuestion.jsx'
import PickQuestion from '../practice/PickQuestion.jsx'

const QUESTION_BY_TYPE = {
  choice: ChoiceQuestion,
  chips: ChipsQuestion,
  gap: GapQuestion,
  match: MatchQuestion,
  multi: MultiQuestion,
  order: OrderQuestion,
  pick: PickQuestion,
}

// Карточка практики: заголовок + подсказка, список вопросов, кнопка
// «Проверить» внизу. `checked` — уже вычисленный родителем флаг (весь шаг
// проверен хотя бы раз) — прокидывается в вопросы как есть. Повторное
// нажатие «Проверить» разрешено (просто снова вызывает `onCheck(block)`).
export default function PracticeBlock({ block, answers, checked, onAnswer, onCheck, readOnly }) {
  const { t } = useI18n()

  return (
    <div className="lw-card lw-practice">
      <div className="lw-practice__head">
        {block?.title && <h3 className="lw-practice__title">{block.title}</h3>}
        {block?.hint && <p className="lw-practice__hint">{block.hint}</p>}
      </div>

      <div className="lw-practice__list">
        {(block?.questions || []).map((question) => {
          const Question = QUESTION_BY_TYPE[question.type]
          if (!Question) return null
          return (
            <Question
              key={question.id}
              question={question}
              answer={answers?.[question.id] ?? null}
              checked={checked}
              onAnswer={onAnswer}
              readOnly={readOnly}
            />
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
