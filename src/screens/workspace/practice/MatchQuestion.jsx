import { useMemo, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { CheckIcon } from '../../../components/icons.jsx'
import { hasAttempt } from '../practiceGrading.js'
import QuestionMedia from './QuestionMedia.jsx'
import { stableShuffle } from './optionOrder.js'

function matchedLabel(pair, chosen) {
  if (pair?.full && chosen === pair.right) return pair.full
  return chosen ?? '—'
}

// Определение из банка — жетон с вместимостью: держать его вправе столько слов,
// сколько раз оно стоит правой половиной пары (у категории — все её слова).
// И вместимость, и занятость считаем ТОЛЬКО по question.pairs: в сохранённом
// ответе живут ключи слов, которых в задании уже нет — методист поправил урок в
// каталоге, а ответ ученика остался прежним. Пока занятость считалась по
// Object.values(answer), такой осиротевший ключ занимал место живого слова:
// вариант гас «использованным» и выключался при пустом слоте, а убрать ключ было
// нечем — вытеснение ходит по pairs и о нём не знает.
//
// Функции лежат снаружи компонента: они чистые, а внутри пересоздавались на
// каждый рендер, хотя зовёт их каждый вариант банка.
function capacityOf(pairs, right) {
  return pairs.filter((pair) => pair.right === right).length
}

function placedCount(pairs, map, right) {
  return pairs.filter((pair) => map[pair.left] === right).length
}

// Одна формула на вид и на поведение: пока они жили порознь, вариант красился
// серым «использовано», но клик по нему всё равно проходил.
function isUsedUp(pairs, map, right) {
  return placedCount(pairs, map, right) >= capacityOf(pairs, right)
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
export default function MatchQuestion({ question, answer, checked, onAnswer, readOnly, onWord, showAnswerKey = true }) {
  const { t } = useI18n()
  const [activeLeft, setActiveLeft] = useState(null)
  const pairs = question?.pairs || []
  const map = answer && typeof answer === 'object' ? answer : {}
  const attempted = hasAttempt(question, map)
  // Пары, которые ученик не сопоставил или сопоставил неверно. Ключ к ответу
  // ниже показываем и на пропущенном вопросе: цветом тут ничего не скажешь —
  // неразложенной фишки просто нет ни в одной колонке.
  const missed = pairs.filter((pair) => map[pair.left] !== pair.right)

  // Порядок один на вопрос и одинаковый у преподавателя и ученика: раньше он
  // брался из Math.random, то есть у каждого свой — и клик преподавателя по
  // варианту («поправить ответ прямо здесь») попадал не туда, куда он метил.
  const rightOptions = useMemo(
    () => stableShuffle([...new Set(pairs.map((p) => p.right))], question?.id),
    [pairs, question?.id],
  )
  const categories = useMemo(() => [...new Set(pairs.map((p) => p.right))], [pairs])
  // Сортировка — когда категорий заметно меньше слов (Nouns/Verbs/…). Один
  // общий перевод на hello+hi (A0 L02) — обычный матчинг, не колонки.
  const isSort = categories.length >= 2 && pairs.length >= categories.length + 2

  const hasFreeSlot = pairs.some((p) => map[p.left] == null)

  function pickLeft(left) {
    if (checked || readOnly) return
    // Клик по уже заполненному слову возвращает его определение в банк и
    // оставляет слово выбранным: «поменять ответ» — это один понятный клик по
    // самому ответу. Раньше клик только переключал выделение, и когда все слоты
    // были заполнены, банк переставал делать хоть что-нибудь: ученик видел
    // мёртвый экран и не знал, что слово вообще кликабельно.
    //
    // В «разложи по категориям» ничего не меняем: там возврат в банк — своя
    // работающая механика (клик по слову, затем по банку, см. sortHint).
    if (!isSort && map[left] != null) {
      const next = { ...map }
      delete next[left]
      onAnswer(question.id, next)
      setActiveLeft(left)
      return
    }
    setActiveLeft((prev) => (prev === left ? null : left))
  }

  function pickRight(right) {
    if (checked || readOnly) return
    const left = activeLeft ?? pairs.find((p) => map[p.left] == null)?.left
    if (!left) return
    const next = { ...map, [left]: right }
    if (!isSort) {
      // Держателей у определения не больше его вместимости: в обычном матчинге
      // это одно слово, у общего перевода (A0 hello/hi) — два. Только что
      // выбранное слово стоит в очереди первым и ответ не теряет никогда,
      // лишний хвост очереди — теряет. Без вытеснения одно и то же определение
      // вставало сразу у двух слов, а правильное для второго так и лежало в
      // банке — ровно это и видели на проде. У категорий вытеснять некого:
      // категория честно принадлежит всем своим словам.
      const holders = [
        left,
        ...pairs.map((pair) => pair.left).filter((other) => other !== left && next[other] === right),
      ]
      holders.slice(capacityOf(pairs, right)).forEach((other) => {
        delete next[other]
      })
    }
    onAnswer(question.id, next)
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
        <QuestionMedia question={question} onWord={onWord} />
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
                      const isCorrect = checked && attempted && category === pair.right
                      const isWrong = checked && attempted && category !== pair.right
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
        {showAnswerKey && checked && missed.length > 0 && (
          <p className="lw-q__answer" aria-live="polite">
            {t('lesson.answerWas')}: {missed.map((pair) => `${pair.left} — ${pair.right}`).join('; ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="lw-q lw-q--match">
      <QuestionMedia question={question} onWord={onWord} />
      {!checked && <p className="lw-match__hint">{t('lesson.ws.matchHint')}</p>}
      <div className="lw-match" role="group" aria-label={question?.prompt || t('lesson.ws.matchHint')}>
        <div className="lw-match__col">
          {pairs.map((pair) => {
            const chosen = map[pair.left]
            const isCorrect = checked && attempted && chosen === pair.right
            const isWrong = checked && attempted && chosen != null && chosen !== pair.right
            let cls = 'lw-match__left'
            if (isCorrect) cls += ' is-correct'
            else if (isWrong) cls += ' is-wrong'
            else if (activeLeft === pair.left) cls += ' is-selected'
            else if (chosen != null) cls += ' is-filled'
            // Урок закрыт снаружи (перерыв, завершён, смотрит преподаватель):
            // плитка должна выглядеть закрытой. Свой ответ и вердикт красятся
            // выше и остаются видимыми.
            else if (readOnly) cls += ' is-locked'
            return (
              <button
                key={pair.left}
                type="button"
                className={cls}
                aria-pressed={activeLeft === pair.left}
                aria-label={chosen != null ? `${pair.left}: ${matchedLabel(pair, chosen)}` : pair.left}
                disabled={checked || readOnly}
                onClick={() => pickLeft(pair.left)}
              >
                <span className="lw-match__left-label">{pair.left}</span>
                <span className="lw-match__chosen">{matchedLabel(pair, chosen)}</span>
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
            const used = isUsedUp(pairs, map, right)
            // Без выбранного слева вариант ложится в первый свободный слот —
            // значит класть некуда, когда свободных нет или вариант уже
            // разложен. Такой клик раньше молча не делал ничего; теперь кнопка
            // об этом честно говорит, а выбранное слово снова её оживляет.
            const nowhereToPut = activeLeft == null && (!hasFreeSlot || used)
            return (
              <button
                key={`${right}-${i}`}
                type="button"
                className={`lw-match__right${used ? ' is-used' : ''}${!used && readOnly ? ' is-locked' : ''}`}
                aria-label={right}
                disabled={checked || readOnly || nowhereToPut}
                onClick={() => pickRight(right)}
              >
                {right}
              </button>
            )
          })}
        </div>
      </div>
      {showAnswerKey && checked && missed.length > 0 && (
        <p className="lw-q__answer" aria-live="polite">
          {t('lesson.answerWas')}: {missed.map((pair) => `${pair.left} — ${pair.right}`).join('; ')}
        </p>
      )}
    </div>
  )
}
