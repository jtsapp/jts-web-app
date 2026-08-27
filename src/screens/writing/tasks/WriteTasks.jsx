import { useEffect, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { wordsOf } from '../../../practice/writing/engine.js'
import { analyseText } from '../../../practice/writing/localCheck.js'
import { markTask, taskState } from '../../../practice/writing/writingProgress.js'
import { getGuided, setGuided, noteAnswer } from '../../../practice/writing/writingStore.js'
import TaskShell, { CheckCard } from '../TaskShell.jsx'

// Письменные задания шага 6: guided-write (порт rGuidedWrite,
// jtswriting.html:11094) — мастер «вопрос за вопросом», и free-write
// (rFreeWrite, 11172) — баннер задания с выходом в Блокнот.

/* ── 9. guided-write ────────────────────────────────────────────────────── */

export function GuidedWriteTask({ genre, task, meta, onOpenPad }) {
  const { t } = useI18n()
  // Ответы переживают перерисовку и перезаход — как guided.<genre> в прототипе.
  const [answers, setAnswers] = useState(() => getGuided(genre.id))
  const [idx, setIdx] = useState(0)
  const [checkedInfo, setCheckedInfo] = useState(null) // {text, findings} текущего шага
  const [note, setNote] = useState('')

  const total = task.items.length
  const atEnd = idx >= total

  // Черновик собирается из ответов ученика; готового текста тут нет.
  const draft = task.items
    .map((q) => (answers[q.id] || '').trim())
    .filter(Boolean)
    .join('\n\n')

  // Сборка финала засчитывает задание один раз (как markTask в прототипе).
  useEffect(() => {
    if (atEnd && !taskState(genre.id, task.id)) {
      markTask(genre.id, task.id, total, total)
    }
  }, [atEnd, genre.id, task.id, total])

  const st = taskState(genre.id, task.id)
  const scoreText = atEnd || st ? total + ' / ' + total : '0 / ' + total

  if (atEnd) {
    const findings = analyseText(draft, { rules: meta.rules, wholeSentence: true })
    return (
      <TaskShell genre={genre} task={task} scoreText={scoreText}>
        <div className="wr-fb wr-fb--ok">
          <b>{t('writing.guided.doneHead')} </b>
          {t('writing.guided.doneBody')}
        </div>
        <div className="wr-src wr-pre">{draft}</div>
        <CheckCard text={draft} findings={findings} />
        <div className="wr-row">
          <button
            type="button"
            className="wr-primary wr-btn-sm"
            onClick={() => onOpenPad({ seedText: draft })}
          >
            {t('writing.guided.openPad')}
          </button>
          <button
            type="button"
            className="wr-ghost wr-btn-sm"
            onClick={() => {
              setIdx(0)
              setCheckedInfo(null)
            }}
          >
            {t('writing.guided.again')}
          </button>
        </div>
      </TaskShell>
    )
  }

  const q = task.items[idx]
  const value = answers[q.id] || ''

  const persist = (next) => {
    setAnswers(next)
    setGuided(genre.id, next)
  }

  const onMain = () => {
    if (!wordsOf(value).length) {
      setNote(t('writing.guided.needSentence'))
      return
    }
    setNote('')
    const next = { ...answers, [q.id]: value.trim() }
    persist(next)
    if (!checkedInfo) {
      // Сначала разбор написанного, и только потом переход дальше.
      const findings = analyseText(value, { rules: meta.rules, wholeSentence: true })
      noteAnswer(genre.id, task.id, {
        n: idx + 1,
        label: 'STEP',
        your: value.trim(),
        right: '',
        why: q.hint,
        findings,
        ok: findings.length === 0,
      })
      setCheckedInfo({ text: value, findings })
      return
    }
    setIdx(idx + 1)
    setCheckedInfo(null)
  }

  const mainLabel = !checkedInfo
    ? t('writing.checkBtn')
    : idx === total - 1
      ? t('writing.guided.assemble')
      : t('writing.guided.next')

  return (
    <TaskShell genre={genre} task={task} scoreText={scoreText}>
      <div className="wr-item">
        <div className="wr-item-n">{t('writing.guided.stepOf', { i: idx + 1, n: total })}</div>
        <h4 className="wr-guided-q">{q.q}</h4>
        <div className="wr-howto">{q.hint}</div>
        <textarea
          className="wr-inp"
          rows={3}
          placeholder={t('writing.guided.placeholder')}
          value={value}
          onChange={(e) => {
            setAnswers({ ...answers, [q.id]: e.target.value })
          }}
        />
        <div className="wr-row">
          <button type="button" className="wr-primary wr-btn-sm" onClick={onMain}>
            {mainLabel}
          </button>
          {idx > 0 ? (
            <button
              type="button"
              className="wr-ghost wr-btn-sm"
              onClick={() => {
                persist({ ...answers, [q.id]: value })
                setIdx(idx - 1)
                setCheckedInfo(null)
                setNote('')
              }}
            >
              {t('writing.guided.back')}
            </button>
          ) : null}
        </div>
        {note ? <div className="wr-fb wr-fb--tip">{note}</div> : null}
        {checkedInfo ? <CheckCard text={checkedInfo.text} findings={checkedInfo.findings} /> : null}
      </div>
    </TaskShell>
  )
}

/* ── 10. free-write ─────────────────────────────────────────────────────── */

export function FreeWriteTask({ genre, task, onOpenPad }) {
  const { t } = useI18n()
  // Отметка «сдано» приходит из Блокнота после проверки текста — само задание
  // ничего не судит (как в прототипе).
  const st = taskState(genre.id, task.id)
  const scoreText = st ? t('writing.free.done') : t('writing.free.notSubmitted')
  return (
    <TaskShell genre={genre} task={task} scoreText={scoreText}>
      <div className="wr-banner-task">
        <h4>{t('writing.free.theTask')}</h4>
        <p>{task.prompt}</p>
      </div>
      <div className="wr-row">
        <span className="wr-pill">
          {t('writing.free.target', { a: task.target[0], b: task.target[1] })}
        </span>
        <span className="wr-pill">{t('writing.free.examMode', { n: task.minutes })}</span>
      </div>
      <div className="wr-row">
        <button type="button" className="wr-primary" onClick={() => onOpenPad({})}>
          {t('writing.free.writeInPad')}
        </button>
        <button
          type="button"
          className="wr-ghost"
          onClick={() => onOpenPad({ withTimer: true })}
        >
          {t('writing.free.withTimer', { n: task.minutes })}
        </button>
      </div>
    </TaskShell>
  )
}
