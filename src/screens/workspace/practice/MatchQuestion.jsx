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
//
// «Разложи по категориям» (`trySortboxWidget` в web-admin/convert-course.ts)
// приезжает той же самой match-структурой: каждое слово — свой `pairs[].left`,
// а категория, к которой оно относится, — `pairs[].right`, повторяющийся у
// всех слов этой категории. Один-два общих перевода (A0: hello и hi → «привет»)
// такого не дают — колонки только когда категорий заметно меньше, чем слов.
export default function MatchQuestion({ question, answer, checked, onAnswer, readOnly, onWord }) {
  const { t } = useI18n()
  const [activeLeft, setActiveLeft] = useState(null)
  const pairs = question?.pairs || []
  const map = answer && typeof answer === 'object' ? answer : {}

  // Перемешиваем один раз на вопрос, а не на каждый рендер — иначе правый
  // столбец «прыгал» бы при каждом клике.
  const rightOptions = useMemo(() => shuffled([...new Set(pairs.map((p) => p.right))]), [question?.id])
  const categories = useMemo(() => [...new Set(pairs.map((p) => p.right))], [pairs])
  // Сортировка — когда категорий заметно меньше слов (Nouns/Verbs/…). Один
  // общий перевод на hello+hi (A0 L02) — обычный матчинг, не колонки.
  const isSort = categories.length >= 2 && pairs.length >= categories.length + 2

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

  // Возврат слова из колонки в банк — клик по уже размещённому слову, потом
  // по серой área банка (см. `lesson.ws.sortHint`).
  function sendToBank() {
    if (checked || readOnly || activeLeft == null || map[activeLeft] == null) return
    const next = { ...map }
    delete next[activeLeft]
    onAnswer(question.id, next)
    setActiveLeft(null)
  }

  if (isSort) {
    return (
      <div className="lw-q lw-q--match">
        {question?.prompt && <TapText as="p" className="lw-q__prompt" text={question.prompt} onWord={onWord} />}
        {!checked && <p className="lw-match__hint">{t('lesson.ws.sortHint')}</p>}
        <div className="lw-sort" role="group" aria-label={question?.prompt || t('lesson.ws.sortHint')}>
          <div className="lw-sort__bank" onClick={sendToBank}>
            {pairs
              .filter((pair) => map[pair.left] == null)
              .map((pair) => (
                <button
                  key={pair.left}
                  type="button"
                  className={`lw-chip${activeLeft === pair.left ? ' is-selected' : ''}`}
                  aria-pressed={activeLeft === pair.left}
                  disabled={checked || readOnly}
                  onClick={(e) => {
                    e.stopPropagation()
                    pickLeft(pair.left)
                  }}
                >
                  {pair.left}
                </button>
              ))}
          </div>
          <div className="lw-sort__cols">
            {categories.map((category) => (
              <div
                key={category}
                className="lw-sort__col"
                role="button"
                tabIndex={-1}
                onClick={() => pickRight(category)}
              >
                <div className="lw-sort__col-label">{category}</div>
                <div className="lw-sort__col-body">
                  {pairs
                    .filter((pair) => map[pair.left] === category)
                    .map((pair) => {
                      const isCorrect = checked && category === pair.right
                      const isWrong = checked && category !== pair.right
                      let cls = 'lw-chip'
                      if (isCorrect) cls += ' is-correct'
                      else if (isWrong) cls += ' is-wrong'
                      else if (activeLeft === pair.left) cls += ' is-selected'
                      return (
                        <button
                          key={pair.left}
                          type="button"
                          className={cls}
                          aria-pressed={activeLeft === pair.left}
                          disabled={checked || readOnly}
                          onClick={(e) => {
                            e.stopPropagation()
                            pickLeft(pair.left)
                          }}
                        >
                          {pair.left}
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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
            const used = pairs.filter((p) => p.right === right).length
              <= Object.values(map).filter((v) => v === right).length
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
