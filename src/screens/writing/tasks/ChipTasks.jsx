import { useMemo, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { shuffle, norm } from '../../../practice/writing/engine.js'
import TaskShell, { useTaskCtl, judgeFeedback, FbView, ItemBox } from '../TaskShell.jsx'

// Задания на фишках: word-order (порт rWordOrder, jtswriting.html:10685) и
// connectors (порт rConnectors, 10782). Drag-n-drop прототипа не переносим —
// остаётся его тап-механика: выбери фишку, тапни цель.

/* ── 1. word-order: банк слов → строка ─────────────────────────────────── */

function WordOrderItem({ task, item, idx, ctl }) {
  const { t } = useI18n()
  // Сид от задания и пункта, как в прототипе: порядок банка стабилен между
  // перерисовками и не совпадает с ответом.
  const bank = useMemo(() => shuffle(item.words, task.id + item.id), [item.words, task.id, item.id])
  const [placed, setPlaced] = useState([]) // индексы банка: дубли слов различимы
  const [fb, setFb] = useState(null)
  const closed = ctl.state.answered[item.id] !== undefined

  const tryCheck = (next) => {
    if (next.length !== item.words.length) return
    const words = next.map((i) => bank[i])
    const ok = words.join(' ') === item.words.join(' ')
    // Подсказка без ответа: номер первого слова не на месте (как в прототипе).
    let wrongAt = 0
    words.forEach((w, i) => {
      if (w !== item.words[i] && !wrongAt) wrongAt = i + 1
    })
    const hint = ok ? item.why : item.why + ' ' + t('writing.wordOrder.firstWrong', { n: wrongAt })
    const verdict = ctl.judge(item.id, ok, { n: idx + 1, your: words.join(' '), why: item.why })
    if (verdict === 'done') return
    setFb(judgeFeedback(t, verdict, hint))
    // Ретрай: слова возвращаются в банк — предложение собирается заново.
    if (verdict === 'retry') setPlaced([])
  }

  const takeChip = (i) => {
    if (closed || placed.includes(i)) return
    const next = [...placed, i]
    setPlaced(next)
    tryCheck(next)
  }

  return (
    <ItemBox n={idx + 1}>
      <div className="wr-slotline">
        {placed.length === 0 ? (
          <span className="wr-ph">{t('writing.wordOrder.ph')}</span>
        ) : (
          placed.map((bi, pos) => (
            <button
              key={pos}
              type="button"
              className="wr-chip wr-chip--task"
              onClick={() => {
                if (!closed) setPlaced(placed.filter((_, p) => p !== pos))
              }}
            >
              {bank[bi]}
            </button>
          ))
        )}
      </div>
      <div className="wr-chipbank">
        {bank.map((w, i) => (
          <button
            key={i}
            type="button"
            className={'wr-chip wr-chip--task' + (placed.includes(i) ? ' is-used' : '')}
            disabled={closed || placed.includes(i)}
            onClick={() => takeChip(i)}
          >
            {w}
          </button>
        ))}
      </div>
      <FbView fb={fb} />
    </ItemBox>
  )
}

export function WordOrderTask({ genre, task, onFirstTry }) {
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      {task.items.map((item, idx) => (
        <WordOrderItem key={item.id} task={task} item={item} idx={idx} ctl={ctl} />
      ))}
    </TaskShell>
  )
}

/* ── 3. connectors: общий банк связок + пропуски ────────────────────────── */

export function ConnectorsTask({ genre, task, onFirstTry }) {
  const { t } = useI18n()
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  const bank = useMemo(() => shuffle(task.bank, task.id), [task.bank, task.id])
  const [used, setUsed] = useState({}) // слово → потрачено верным ответом
  const [sel, setSel] = useState(null)
  const [gaps, setGaps] = useState({}) // itemId → {word, ok} | null
  const [fbs, setFbs] = useState({})

  const fill = (item, idx) => {
    if (!sel || ctl.state.answered[item.id] !== undefined) return
    const w = sel
    const ok = norm(w) === norm(item.answer)
    const verdict = ctl.judge(item.id, ok, { n: idx + 1, your: String(w), why: item.why })
    if (verdict === 'done') return
    setSel(null)
    setFbs({ ...fbs, [item.id]: judgeFeedback(t, verdict, item.why) })
    if (verdict === 'retry') {
      // Неверно — пропуск очищается, слово остаётся в банке.
      setGaps({ ...gaps, [item.id]: null })
      return
    }
    setGaps({ ...gaps, [item.id]: { word: w, ok } })
    // Слово тратится только верным ответом — как chips[..].used в прототипе.
    if (ok) setUsed({ ...used, [w]: true })
  }

  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      <div className="wr-chipbank">
        {bank.map((w) => (
          <button
            key={w}
            type="button"
            className={'wr-chip wr-chip--task' + (used[w] ? ' is-used' : '') + (sel === w ? ' is-sel' : '')}
            disabled={!!used[w]}
            onClick={() => setSel(sel === w ? null : w)}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="wr-hintline">{t('writing.connectors.hint')}</div>
      {task.items.map((item, idx) => {
        const gap = gaps[item.id]
        return (
          <ItemBox key={item.id} n={idx + 1}>
            <div className="wr-src">
              {item.before ? item.before + ' ' : ''}
              <button
                type="button"
                className={
                  'wr-gap' + (gap ? ' is-filled' + (gap.ok ? ' is-ok' : ' is-no') : '')
                }
                onClick={() => fill(item, idx)}
              >
                {gap ? gap.word : '…'}
              </button>
              {' ' + item.after}
            </div>
            <FbView fb={fbs[item.id]} />
          </ItemBox>
        )
      })}
    </TaskShell>
  )
}
