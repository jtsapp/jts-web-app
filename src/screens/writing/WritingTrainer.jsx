import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { STEPS, TASKS_PER_GENRE, pct } from '../../practice/writing/engine.js'
import { genreDoneCount, stepDone, taskState } from '../../practice/writing/writingProgress.js'
import WritingInfoSteps from './WritingInfoSteps.jsx'
import { tOr } from './TaskShell.jsx'
import { WordOrderTask, ConnectorsTask } from './tasks/ChipTasks.jsx'
import { TransformTask, PunctuationTask, ExpandTask } from './tasks/TypedTasks.jsx'
import RegisterTask from './tasks/ChoiceTask.jsx'
import { IdeaBankTask, OutlineTask } from './tasks/SortTasks.jsx'
import { GuidedWriteTask, FreeWriteTask } from './tasks/WriteTasks.jsx'
import OverallTask from './tasks/OverallTask.jsx'

// Тренажёр жанра из 6 шагов (порт renderTrainer, data/jtswriting.html:10374):
// шапка с жанром, чипы шагов, тело шага, поздравление за пройденный жанр и
// футер «назад/дальше». Шаги 1–3 — теория, 4–6 — задания жанра по task.step.

const TASK_COMPONENTS = {
  'word-order': WordOrderTask,
  transform: TransformTask,
  connectors: ConnectorsTask,
  punctuation: PunctuationTask,
  expand: ExpandTask,
  register: RegisterTask,
  'idea-bank': IdeaBankTask,
  'outline-builder': OutlineTask,
  'guided-write': GuidedWriteTask,
  'free-write': FreeWriteTask,
  overall: OverallTask,
}

export default function WritingTrainer({ genre, meta, step, onStep, onOpenPad }) {
  const { t } = useI18n()

  // Сессионные монеты: +10 за пункт, решённый с первой попытки. Живут только
  // в этом экране (сервер про них не знает); смена жанра обнуляет счётчик —
  // сброс derived-паттерном, без эффекта.
  const [coinState, setCoinState] = useState({ genreId: genre.id, n: 0 })
  const coins = coinState.genreId === genre.id ? coinState.n : 0
  const onFirstTry = (ok) => {
    if (!ok) return
    setCoinState((s) => ({ genreId: genre.id, n: (s.genreId === genre.id ? s.n : 0) + 10 }))
  }

  const stepBody = () => {
    if (step <= 3) return <WritingInfoSteps genre={genre} meta={meta} step={step} />
    const list = genre.tasks.filter((tk) => tk.step === step)
    if (!list.length) return <div className="wr-card">{t('writing.trainer.noTasks')}</div>
    const doneN = list.filter((tk) => !!taskState(genre.id, tk.id)).length
    return (
      <>
        <div className="wr-progressline">
          <span>{t('writing.trainer.stepProgress', { n: step, done: doneN, total: list.length })}</span>
          <div className="wr-bar">
            <i style={{ width: pct(doneN, list.length) + '%' }} />
          </div>
        </div>
        {list.map((task) => {
          const Comp = TASK_COMPONENTS[task.type]
          if (!Comp) return null
          return (
            // key от жанра: смена жанра сбрасывает состояние судейства.
            <Comp
              key={genre.id + ':' + task.id}
              genre={genre}
              task={task}
              meta={meta}
              onFirstTry={onFirstTry}
              onOpenPad={onOpenPad}
            />
          )
        })}
      </>
    )
  }

  return (
    <div>
      <div className="wr-taskhead wr-taskhead--top">
        <h2 className="wr-sec-title">{genre.title}</h2>
        <span className="wr-pill">{genre.register}</span>
        <span className="wr-pill wr-pill--score">
          {genre.targetWords[0]}–{genre.targetWords[1]} {t('writing.words')}
        </span>
        <span className="wr-pill wr-pill--coins">
          {/* Монетка — общий ассет тренажёров (как в TrainerResult);
              статическая иконка 15px, next/image тут не окупается. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/practice/listening/coin.png" alt="" />+{coins}
        </span>
      </div>

      <div className="wr-steps">
        {STEPS.map((s) => {
          const done = stepDone(genre, s.n)
          return (
            <button
              key={s.n}
              type="button"
              className={'wr-stepchip' + (step === s.n ? ' is-on' : '') + (done ? ' is-done' : '')}
              onClick={() => onStep(s.n)}
            >
              <i>{done ? '✓' : s.n}</i>
              <span>{tOr(t, 'writing.step.' + s.n, s.name)}</span>
            </button>
          )
        })}
      </div>

      {stepBody()}

      {/* Поздравление, когда жанр пройден целиком. */}
      {genreDoneCount(genre.id) >= TASKS_PER_GENRE ? (
        <div className="wr-card wr-done-card">
          <h3>{t('writing.congrats.title')}</h3>
          <p>{t('writing.congrats.goal', { goal: genre.goal })}</p>
          <p>{t('writing.trainer.congratsBody', { n: TASKS_PER_GENRE, title: genre.title })}</p>
        </div>
      ) : null}

      <div className="wr-footnav">
        <button
          type="button"
          className="wr-ghost"
          disabled={step === 1}
          onClick={() => onStep(Math.max(1, step - 1))}
        >
          {t('writing.trainer.back')}
        </button>
        <button
          type="button"
          className="wr-primary"
          onClick={() => (step === 6 ? onOpenPad({}) : onStep(Math.min(6, step + 1)))}
        >
          {step === 6 ? t('writing.trainer.openPad') : t('writing.trainer.next')}
        </button>
      </div>
    </div>
  )
}
