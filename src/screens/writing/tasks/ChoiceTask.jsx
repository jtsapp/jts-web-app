import { useMemo, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { shuffle } from '../../../practice/writing/engine.js'
import TaskShell, { useTaskCtl, judgeFeedback, FbView, ItemBox } from '../TaskShell.jsx'

// 6. register — «кому ты это пишешь?» (порт rRegister, jtswriting.html:10893):
// контекст и два варианта одной мысли в сидированном порядке; клик судит сразу.

function RegisterItem({ task, item, idx, ctl }) {
  const { t } = useI18n()
  // Сидированный порядок вариантов: правильный не всегда первым.
  const opts = useMemo(
    () => shuffle([{ k: 'a', v: item.a }, { k: 'b', v: item.b }], task.id + item.id),
    [task.id, item.id, item.a, item.b],
  )
  const [pick, setPick] = useState(null) // {k, ok} — выбранная кнопка и её судьба
  const [fb, setFb] = useState(null)
  const closed = ctl.state.answered[item.id] !== undefined

  const choose = (o) => {
    if (closed) return
    const ok = o.k === item.answer
    const verdict = ctl.judge(item.id, ok, { n: idx + 1, your: o.v, why: item.why })
    if (verdict === 'done') return
    setFb(judgeFeedback(t, verdict, item.why))
    // Ретрай снимает красную подсветку (прототип убирал класс .no), при
    // закрытии пункта подсветка остаётся.
    setPick(verdict === 'retry' ? null : { k: o.k, ok })
  }

  return (
    <ItemBox n={idx + 1}>
      <div className="wr-row">
        <span className="wr-pill">{item.ctx}</span>
      </div>
      {opts.map((o) => (
        <button
          key={o.k}
          type="button"
          className={
            'wr-opt' + (pick && pick.k === o.k ? (pick.ok ? ' is-ok' : ' is-no') : '')
          }
          disabled={closed}
          onClick={() => choose(o)}
        >
          {o.v}
        </button>
      ))}
      <FbView fb={fb} />
    </ItemBox>
  )
}

export default function RegisterTask({ genre, task, onFirstTry }) {
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      {task.items.map((item, idx) => (
        <RegisterItem key={item.id} task={task} item={item} idx={idx} ctl={ctl} />
      ))}
    </TaskShell>
  )
}
