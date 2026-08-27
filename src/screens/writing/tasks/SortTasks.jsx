import { useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { shuffle } from '../../../practice/writing/engine.js'
import { taskState } from '../../../practice/writing/writingProgress.js'
import { setIdeas, setPlan } from '../../../practice/writing/writingStore.js'
import TaskShell, { useTaskCtl, judgeFeedback, FbView, tOr } from '../TaskShell.jsx'

// Сортировочные задания: idea-bank (порт rIdeaBank, jtswriting.html:10926) и
// outline-builder (rOutline, 11003). Механика прототипа без DnD: выбери
// фишку — тапни колонку/часть плана.

/* ── 7. idea-bank: две колонки + выбор сильнейших идей ─────────────────── */

export function IdeaBankTask({ genre, task, onFirstTry }) {
  const { t } = useI18n()
  const ctl = useTaskCtl(genre, task, { onFirstTry })
  // Сид по id задания, как в прототипе; в state — только порядок пула,
  // сами идеи достаются по id.
  const [pool, setPool] = useState(() => shuffle(task.items, task.id).map((i) => i.id))
  const [sel, setSel] = useState(null)
  const [tiles, setTiles] = useState({}) // colId → [{id, ok}]
  const [colFb, setColFb] = useState({}) // colId → отзыв (один на колонку, как .fb в box)
  const [picked, setPicked] = useState([])
  const [pickFb, setPickFb] = useState(null)
  const [pickDone, setPickDone] = useState(false)

  const byId = {}
  task.items.forEach((i) => {
    byId[i.id] = i
  })
  const colLabel = (c) => tOr(t, 'writing.ideaBank.col.' + c.id, c.label)

  const drop = (c) => {
    if (!sel) return
    const item = byId[sel]
    if (!item || ctl.state.answered[item.id] !== undefined) return
    const ok = item.side === c.id
    const verdict = ctl.judge(item.id, ok, {
      n: task.items.indexOf(item) + 1,
      label: 'IDEA',
      your: item.text + ' → ' + colLabel(c),
      why: item.why,
    })
    if (verdict === 'done') return
    setSel(null)
    setColFb({ ...colFb, [c.id]: judgeFeedback(t, verdict, item.why) })
    if (verdict === 'retry') {
      // Идея возвращается в конец банка — можно положить в другую колонку.
      setPool([...pool.filter((id) => id !== item.id), item.id])
      return
    }
    setPool(pool.filter((id) => id !== item.id))
    setTiles({ ...tiles, [c.id]: [...(tiles[c.id] || []), { id: item.id, ok }] })
  }

  // Этап выбора сильных идей: после закрытия всех пунктов или если задание
  // уже было пройдено раньше (как pickStage() при taskState в прототипе).
  const allClosed = Object.keys(ctl.state.answered).length >= task.items.length
  const showPick = allClosed || !!taskState(genre.id, task.id)
  const inIdeas = task.items.filter((i) => i.side === 'in')
  const strongIds = task.items.filter((i) => i.strong).map((i) => i.id)

  const togglePick = (id) => {
    if (pickDone) return
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id))
    else if (picked.length < task.pickCount) setPicked([...picked, id])
  }

  const finishPick = () => {
    const hit = picked.filter((id) => strongIds.includes(id)).length
    setPickFb({
      kind: hit >= 2 ? 'ok' : 'tip',
      head: t('writing.ideaBank.pickResult', { hit, n: task.pickCount }),
      text: t('writing.ideaBank.pickWhy'),
    })
    // В Блокнот уходят выбранные учеником идеи, а не эталонный список.
    setIdeas(genre.id, picked)
    setPickDone(true)
  }

  return (
    <TaskShell genre={genre} task={task} ctl={ctl}>
      <div className="wr-chipbank">
        {pool.map((id) => (
          <button
            key={id}
            type="button"
            className={'wr-chip' + (sel === id ? ' is-sel' : '')}
            onClick={() => setSel(sel === id ? null : id)}
          >
            {byId[id].text}
          </button>
        ))}
      </div>
      <div className="wr-hintline">{t('writing.ideaBank.hint')}</div>
      <div className="wr-cols2">
        {task.columns.map((c) => (
          <div
            key={c.id}
            className={'wr-dropcol' + (c.id === 'in' ? ' wr-dropcol--in' : ' wr-dropcol--out')}
            onClick={() => drop(c)}
          >
            <h5>{colLabel(c)}</h5>
            {(tiles[c.id] || []).map(({ id, ok }) => (
              <div key={id} className={'wr-tile ' + (ok ? 'is-ok' : 'is-no')}>
                <b>{byId[id].text}</b>
                <small>{byId[id].why}</small>
                {byId[id].strong && ok ? (
                  <span className="wr-tag-g">{t('writing.ideaBank.strongTag')}</span>
                ) : null}
              </div>
            ))}
            <FbView fb={colFb[c.id]} />
          </div>
        ))}
      </div>
      {showPick ? (
        <div>
          <div className="wr-fnhead">{t('writing.ideaBank.pickHead', { n: task.pickCount })}</div>
          {inIdeas.map((item) => (
            <button
              key={item.id}
              type="button"
              className={'wr-opt' + (picked.includes(item.id) ? ' is-sel' : '')}
              onClick={() => togglePick(item.id)}
            >
              {item.text}
            </button>
          ))}
          <div className="wr-row">
            <button
              type="button"
              className="wr-primary wr-btn-sm"
              disabled={pickDone || picked.length !== task.pickCount}
              onClick={finishPick}
            >
              {t('writing.ideaBank.done')}
            </button>
          </div>
          <FbView fb={pickFb} />
        </div>
      ) : null}
    </TaskShell>
  )
}

/* ── 8. outline-builder: блоки → четыре части плана ─────────────────────── */

export function OutlineTask({ genre, task, onFirstTry }) {
  const { t } = useI18n()
  // Судится одним пунктом "outline" — знаменатель 1, как в прототипе.
  const ctl = useTaskCtl(genre, task, { onFirstTry, total: 1 })
  const [pool, setPool] = useState(() => shuffle(task.items, task.id).map((i) => i.id))
  const [sel, setSel] = useState(null)
  const [placed, setPlaced] = useState({}) // itemId → slotId
  const [flagged, setFlagged] = useState({}) // itemId → блок стоит не на месте
  const [fb, setFb] = useState(null)
  const [savedNote, setSavedNote] = useState('')

  const byId = {}
  task.items.forEach((i) => {
    byId[i.id] = i
  })
  const closed = ctl.state.answered.outline !== undefined
  const allPlaced = Object.keys(placed).length === task.items.length

  const putInSlot = (s) => {
    if (closed || !sel) return
    setPlaced({ ...placed, [sel]: s.id })
    setPool(pool.filter((id) => id !== sel))
    setSel(null)
  }

  const takeBack = (item) => {
    if (closed) return
    const next = { ...placed }
    delete next[item.id]
    setPlaced(next)
    setPool([...pool, item.id])
    const fl = { ...flagged }
    delete fl[item.id]
    setFlagged(fl)
  }

  const check = () => {
    if (closed) return
    const wrong = task.items.filter((it) => placed[it.id] !== it.slot)
    const ok = wrong.length === 0
    // Куда именно переставить — не говорим: называем блок и правило.
    let fbNext
    if (ok) {
      fbNext = { kind: 'ok', head: t('writing.outline.rightHead'), text: t('writing.outline.rightBody') }
      setFlagged({})
    } else {
      const lines = wrong.map((w) => '“' + w.text + '”: ' + w.why).join(' ')
      let broke = false
      task.items.forEach((it) => {
        if (it.slot === 'conc' && placed[it.id] === 'intro') broke = true
        if (it.slot === 'body1' && placed[it.id] === 'conc') broke = true
      })
      fbNext = {
        kind: 'no',
        head: t('writing.outline.wrongHead', { n: wrong.length }),
        text: lines,
        lines: broke ? (task.rules || []).map((r) => r.msg) : [],
      }
      const fl = {}
      wrong.forEach((w) => {
        fl[w.id] = true
      })
      setFlagged(fl)
    }
    const verdict = ctl.judge('outline', ok, {
      n: 1,
      label: 'PLAN',
      your: wrong.map((w) => '“' + w.text + '”').join(', '),
      why: wrong.map((w) => w.why).join(' '),
    })
    if (verdict === 'retry') {
      fbNext = { ...fbNext, text: fbNext.text + ' ' + t('writing.fb.tryAgain') }
      setFb(fbNext)
      return
    }
    setFb(fbNext)
    // В Блокнот уходит план ученика, а не готовый ответ — даже после провала.
    const outline = task.slots.map((s) => ({
      slot: s.label,
      items: task.items.filter((i) => placed[i.id] === s.id).map((i) => i.text),
    }))
    setPlan(genre.id, outline)
    setSavedNote(t('writing.outline.saved'))
  }

  const st = taskState(genre.id, task.id)
  const scoreText =
    ctl.state.answered.outline !== undefined
      ? (ctl.state.answered.outline ? 1 : 0) + ' / 1'
      : st
        ? st.correct + ' / ' + st.total
        : '0 / 1'

  return (
    <TaskShell genre={genre} task={task} ctl={ctl} scoreText={scoreText}>
      <div className="wr-chipbank">
        {pool.map((id) => (
          <button
            key={id}
            type="button"
            className={'wr-chip' + (sel === id ? ' is-sel' : '')}
            disabled={closed}
            onClick={() => setSel(sel === id ? null : id)}
          >
            {byId[id].text}
          </button>
        ))}
      </div>
      <div className="wr-hintline">{t('writing.outline.hint')}</div>
      <div className="wr-cols2">
        {task.slots.map((s) => (
          <div key={s.id} className="wr-dropcol" onClick={() => putInSlot(s)}>
            <h5>{tOr(t, 'writing.outline.slot.' + s.id, s.label)}</h5>
            {task.items
              .filter((i) => placed[i.id] === s.id)
              .map((item) => (
                <div
                  key={item.id}
                  className={'wr-tile' + (flagged[item.id] ? ' is-no' : '')}
                  onClick={(e) => {
                    e.stopPropagation()
                    takeBack(item)
                  }}
                >
                  {item.text}
                </div>
              ))}
          </div>
        ))}
      </div>
      <div className="wr-row">
        <button
          type="button"
          className="wr-primary wr-btn-sm"
          disabled={closed || !allPlaced}
          onClick={check}
        >
          {t('writing.outline.checkBtn')}
        </button>
      </div>
      <FbView fb={fb} />
      {savedNote ? <div className="wr-fb wr-fb--tip">{savedNote}</div> : null}
    </TaskShell>
  )
}
