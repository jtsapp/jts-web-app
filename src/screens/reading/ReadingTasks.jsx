'use client'

import { useCallback, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { initExercise, isChoice, isMatch, isOrder, solvedState } from '../../practice/reading/engine.js'
import { checkExercise } from '../../practice/reading/check.js'
import { loc } from '../../practice/reading/loc.js'
import { markExercise, textState } from '../../practice/reading/readingProgress.js'
import ChoiceTask from './tasks/ChoiceTask.jsx'
import MatchTask, { matchTap } from './tasks/MatchTask.jsx'
import GapTask, { gapPlace, gapTap, chipTap } from './tasks/GapTask.jsx'
import OrderTask, { orderMove, orderDrop } from './tasks/OrderTask.jsx'
import ReflectionTask from './tasks/ReflectionTask.jsx'

export default function ReadingTasks({ text }) {
  return (
    <>
      {text.exercises.map((ex, i) => (
        <Exercise key={`${text.id}:${i}`} textId={text.id} ex={ex} index={i} />
      ))}
    </>
  )
}

// Одно упражнение целиком: своё состояние ответа, свой результат, свои кнопки.
// Проверка и «показать ответ» разведены намеренно — как в прототипе: показ
// правильных ответов рисует ту же разметку, но НЕ пишет прогресс, иначе
// раздел проходился бы кнопкой «показать ответ».
function Exercise({ textId, ex, index }) {
  const { t, lang } = useI18n()
  const [st, setSt] = useState(() => initExercise(ex))
  const [res, setRes] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [showModel, setShowModel] = useState(false)
  // Лучший результат читаем один раз, при создании состояния: он показывает,
  // что задание уже сдавали, и переживает возврат из библиотеки. Дальше его
  // двигает только check() — перечитывать localStorage на каждый рендер незачем.
  const [best, setBest] = useState(() => {
    const saved = textState(textId)
    return saved && saved.ex[index] ? saved.ex[index] : null
  })
  const resultRef = useRef(null)

  const check = useCallback(() => {
    const r = checkExercise(ex, st)
    setRes(r)
    setRevealed(false)
    markExercise(textId, index, r.score, r.total)
    setBest((prev) => (prev && prev.score >= r.score ? prev : { score: r.score, total: r.total }))
    // Итог должен попасть в фокус: на длинном задании кнопка «Проверить» уже
    // уехала, и без переноса фокуса результат остаётся незамеченным.
    setTimeout(() => resultRef.current && resultRef.current.focus(), 0)
  }, [ex, st, textId, index])

  const reveal = useCallback(() => {
    if (ex.type === 'reflection') {
      setShowModel(true)
      return
    }
    const solved = solvedState(ex, st)
    setSt(solved)
    setRes(checkExercise(ex, solved))
    setRevealed(true) // прогресс не пишем: см. комментарий выше
  }, [ex, st])

  const retry = useCallback(() => {
    setSt(initExercise(ex))
    setRes(null)
    setRevealed(false)
  }, [ex])

  const body = () => {
    if (isChoice(ex.type)) {
      return (
        <ChoiceTask
          ex={ex}
          st={st}
          res={res}
          onPick={(k, j) => setSt((s) => ({ ...s, sel: { ...s.sel, [k]: j } }))}
        />
      )
    }
    if (isMatch(ex.type)) {
      return <MatchTask ex={ex} st={st} res={res} onTap={(side, k) => setSt((s) => matchTap(s, side, k))} />
    }
    if (ex.type === 'gap') {
      return (
        <GapTask
          ex={ex}
          index={index}
          st={st}
          res={res}
          onGap={(k, b) => setSt((s) => (b === undefined ? gapTap(s, k) : gapPlace(s, k, b)))}
          onChip={(b) => setSt((s) => chipTap(s, b))}
        />
      )
    }
    if (isOrder(ex.type)) {
      return (
        <OrderTask
          ex={ex}
          index={index}
          st={st}
          res={res}
          onMove={(pos, dir) => setSt((s) => orderMove(s, pos, dir))}
          onDrop={(from, to) => setSt((s) => orderDrop(s, from, to))}
        />
      )
    }
    if (ex.type === 'reflection') {
      return (
        <ReflectionTask
          ex={ex}
          st={st}
          res={res}
          showModel={showModel}
          onText={(v) => setSt((s) => ({ ...s, reflect: v }))}
        />
      )
    }
    return null
  }

  const hint = hintKey(ex.type)
  // Пояснение к приёму чтения показываем, когда оно ещё пригодится: после
  // полностью верного ответа на вопросы оно уже лишнее (правило прототипа).
  const showExpl = res && ex.explanation && (res.score < res.total || !isChoice(ex.type))

  return (
    <section className="rd-ex" id={`rd-ex-${index}`} aria-labelledby={`rd-ex-t-${index}`}>
      <div className="rd-ex__head">
        <span className="rd-ex__num" aria-hidden="true">{index + 1}</span>
        <span className="rd-ex__type">{t('reading.exType.' + ex.type)}</span>
        {best && <span className="rd-ex__best">✅ {best.score}/{best.total}</span>}
      </div>
      <h3 className="rd-ex__inst" id={`rd-ex-t-${index}`}>{loc(ex.instruction, lang)}</h3>
      <p className="rd-ex__hint">{t(hint)}</p>
      <div className="rd-ex__body">{body()}</div>
      <div className="rd-ex__foot">
        <div
          className={`rd-ex__res${res ? (revealed ? ' is-part' : res.score === res.total ? ' is-ok' : res.score > 0 ? ' is-part' : ' is-bad') : ''}`}
          ref={resultRef}
          tabIndex={-1}
        >
          {res &&
            (revealed
              ? `👀 ${t('reading.revealed')}`
              : res.score === res.total
                ? `🎉 ${t('reading.allCorrect')}`
                : res.score > 0
                  ? `👍 ${t('reading.answered', { n: res.score, t: res.total })}`
                  : `💪 ${t('reading.none')}`)}
        </div>
        {showExpl && <div className="rd-expl">💡 {loc(ex.explanation, lang)}</div>}
        {!res && (
          <button type="button" className="rd-btn rd-btn--primary" onClick={check}>
            ✓ {t('reading.check')}
          </button>
        )}
        {(!res || res.score < res.total || ex.type === 'reflection') && !(ex.type === 'reflection' && showModel) && (
          <button type="button" className="rd-btn rd-btn--ghost" onClick={reveal}>
            {t('reading.showAnswer')}
          </button>
        )}
        {res && (
          <button type="button" className="rd-btn rd-btn--secondary" onClick={retry}>
            ↻ {t('reading.tryAgain')}
          </button>
        )}
      </div>
    </section>
  )
}

// Подсказка «как отвечать» зависит от механики, а не от типа: у шести
// choice-типов она одна на всех, кроме true/false — там кнопок две.
function hintKey(type) {
  if (type === 'tf') return 'reading.hint.tf'
  if (type === 'tfng') return 'reading.hint.tfng'
  if (type === 'headings') return 'reading.hint.headings'
  if (type === 'reflection') return 'reading.hint.reflect'
  if (isChoice(type)) return 'reading.hint.choice'
  if (isMatch(type)) return 'reading.hint.match'
  if (type === 'gap') return 'reading.hint.gap'
  return 'reading.hint.order'
}
