import { useMemo, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { CheckIcon } from '../../../components/icons.jsx'
import TapText from '../TapText.jsx'

// Перемешивает копию массива (Fisher–Yates) — правый столбец не должен идти
// в том же порядке, что и левый, иначе пары угадываются по позиции.
function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Контролируемый match-вопрос (live-уроки): слева — question.pairs[].left,
// справа — перемешанные pairs[].right. UX: клик по левому слову выделяет
// его, следующий клик по правому — сопоставляет; повторный клик по тому же
// левому слову снимает выделение. `answer` — карта {left: chosenRight},
// репортится наверх через onAnswer(question.id, map) — грейдинг только через
// gradeQuestion (practiceGrading.js), здесь не дублируется.
export default function MatchQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const [activeLeft, setActiveLeft] = useState(null)
  const pairs = question?.pairs || []
  const map = answer && typeof answer === 'object' ? answer : {}

  // Перемешиваем один раз на вопрос, а не на каждый рендер — иначе правый
  // столбец «прыгал» бы при каждом клике.
  const rightOptions = useMemo(() => shuffled(pairs.map((p) => p.right)), [question?.id])

  function pickLeft(left) {
    if (checked || readOnly) return
    setActiveLeft((prev) => (prev === left ? null : left))
  }

  function pickRight(right) {
    if (checked || readOnly) return
    const left = activeLeft ?? pairs.find((p) => map[p.left] == null)?.left
    if (!left) return
    onAnswer(question.id, { ...map, [left]: right })
    setActiveLeft(null)
  }

  return (
    <div className="lw-q lw-q--match">
      {question?.prompt && <TapText as="p" className="lw-q__prompt" text={question.prompt} onWord={onWord} />}
      {!checked && <p className="lw-match__hint">{t('lesson.ws.matchHint')}</p>}
      <div className="lw-match" role="group" aria-label={question?.prompt || t('lesson.ws.matchHint')}>
        <div className="lw-match__col">
          {pairs.map((pair) => {
            const chosen = map[pair.left]
            const isCorrect = checked && chosen === pair.right
            const isWrong = checked && chosen != null && chosen !== pair.right
            let cls = 'lw-match__left'
            if (isCorrect) cls += ' is-correct'
            else if (isWrong) cls += ' is-wrong'
            else if (activeLeft === pair.left) cls += ' is-selected'
            else if (chosen != null) cls += ' is-filled'
            return (
              <button
                key={pair.left}
                type="button"
                className={cls}
                aria-pressed={activeLeft === pair.left}
                aria-label={chosen != null ? `${pair.left}: ${chosen}` : pair.left}
                disabled={checked || readOnly}
                onClick={() => pickLeft(pair.left)}
              >
                <span className="lw-match__left-label">{pair.left}</span>
                <span className="lw-match__chosen">{chosen ?? '—'}</span>
                {isCorrect && <CheckIcon size={14} />}
                {isWrong && (
                  <span className="lw-match__mark" aria-hidden="true">
                    ✕
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="lw-match__col">
          {rightOptions.map((right, i) => {
            const used = Object.values(map).includes(right)
            return (
              <button
                key={`${right}-${i}`}
                type="button"
                className={`lw-match__right${used ? ' is-used' : ''}`}
                aria-label={right}
                disabled={checked || readOnly}
                onClick={() => pickRight(right)}
              >
                {right}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
