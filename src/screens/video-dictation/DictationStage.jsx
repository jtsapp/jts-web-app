'use client'

// Прогон диктанта под плеером: «Начать» → фраза → набор → проверка → «Дальше» → итог. Сессия
// (practice/video-dictation/session.js) одна на монтирование: LessonRun пересоздаёт прогон по nonce («Пройти ошибки
// заново»). Звук — через play(phrase) из LessonRun; первый play идёт прямо в обработчике «Начать», иначе iPhone не
// даст плееру играть. Каждая закрытая фраза пишет навык: recordSkill('listening', с первого раза, уровень урока).
//
// Для Луны (screenSnapshot.js): вердикт поля и набранное до показа ставит DictationLine, а эталон — вся фраза — лежит в
// data-assistant-expected только после показа (двух неудач): до этого сайт даёт перепробовать, и Луна лишь подсказывает.
//
// Контракт onFinish(summary): вызывается один раз, когда закрыта последняя фраза прогона; summary — итог сессии
// ({ n, clean, items, mistakes, ... }) плюс retry: true, если это повтор ошибок (`only` задан), и false, если полный
// прогон. Лучший результат урока пишет только вызывающий и только при retry === false. Берётся всегда последний
// переданный onFinish (через ref), а не тот, что был при создании сессии.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PlayIcon } from '../../components/icons.jsx'
import { DictationSession } from '../../practice/video-dictation/session.js'
import { recordSkill } from '../../practice/skillStats.js'
import Icon from '../listen/ListenIcons.jsx'
import DictationLine from './DictationLine.jsx'
import DictationResult from './DictationResult.jsx'

function Verdict({ item, t }) {
  const mark = item?.mark
  const kind = !mark ? null : mark === 'ok' ? 'ok' : mark === 'near' ? 'near' : 'bad'
  let title = ''
  if (mark === 'ok') title = t(item.outcome === 'clean' ? 'videoDictation.verdict.clean' : 'videoDictation.verdict.ok')
  else if (mark) title = t(`videoDictation.verdict.${mark}`)
  return (
    <div
      className="vd-verdict"
      role="status"
      aria-live="polite"
      data-assistant-expected={mark === 'shown' ? item.phrase.plain : undefined}
    >
      {kind && (
        <div className={`jl-fb jl-fb--${kind}`}>
          <span className="jl-fb__ic">
            <Icon name={kind === 'ok' ? 'check' : kind === 'near' ? 'bang' : 'x'} />
          </span>
          <div>
            <b>{title}</b>
            {mark === 'shown' && item.attempt ? <span>{t('videoDictation.verdict.typed', { typed: item.attempt })}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DictationStage({ lesson, only, ready, slow, autoStart, t, play, onToggleSlow, onFinish, onRedo, onExit }) {
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })
  const finish = useCallback((summary) => onFinishRef.current(summary), [])
  const [session] = useState(
    // eslint-disable-next-line react-hooks/refs -- finish читает ref только при закрытии фразы, не в рендере
    () =>
      new DictationSession({
        phrases: only ? lesson.phrases.filter((p) => only.includes(p.n)) : lesson.phrases,
        onPhrase: ({ outcome }) => recordSkill('listening', outcome === 'clean', lesson.level),
        onDone: (summary) => finish({ ...summary, retry: Boolean(only) }),
      }),
  )
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  const inputRef = useRef(null)
  const nextRef = useRef(null)
  const item = snap.item
  const done = Boolean(item?.done)
  const tries = item?.tries ?? 0

  const begin = () => {
    session.start()
    const s = session.getSnapshot()
    if (s.item) play(s.item.phrase)
  }

  // «Пройти ошибки заново»: ролик уже играл по нажатию «Начать», iPhone следующий play пропустит и без жеста.
  useEffect(() => {
    if (autoStart) begin()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз на прогон
  }, [])

  // Фокус идёт за фразой: новое — в поле, закрытая — на «Дальше» (Enter сразу ведёт дальше).
  useEffect(() => {
    if (snap.phase !== 'phrase') return
    if (done) nextRef.current?.focus({ preventScroll: true })
    else inputRef.current?.focus({ preventScroll: true })
  }, [snap.phase, snap.index, done])

  // После неверной попытки набранное выделено: следующий набор его заменяет.
  useEffect(() => {
    if (tries > 0 && !done) inputRef.current?.select()
  }, [tries, done])

  const next = () => {
    session.next()
    const s = session.getSnapshot()
    if (s.phase === 'phrase') play(s.item.phrase)
  }

  if (snap.phase === 'result') {
    return <DictationResult summary={snap.summary} redo={Boolean(only)} t={t} onRedo={onRedo} onExit={onExit} />
  }

  if (snap.phase === 'intro') {
    return (
      <section className="jl-card vd-intro">
        <p>{t('videoDictation.startNote')}</p>
        <button type="button" className="jl-btn" disabled={!ready} onClick={begin}>
          <PlayIcon size={20} /> {ready ? t('videoDictation.start') : t('videoDictation.loadingVideo')}
        </button>
      </section>
    )
  }

  const passed = done ? snap.index + 1 : snap.index
  const last = snap.index + 1 >= snap.total
  return (
    <section className="jl-card vd-stage">
      <div className="vd-stage__top">
        <span className="vd-count">{t('videoDictation.counter', { i: snap.index + 1, n: snap.total })}</span>
        <div
          className="jl-pbar"
          role="progressbar"
          aria-label={t('videoDictation.progress')}
          aria-valuemin={0}
          aria-valuemax={snap.total}
          aria-valuenow={passed}
        >
          <i style={{ width: `${(passed / snap.total) * 100}%` }} />
        </div>
      </div>
      <DictationLine
        key={snap.index}
        item={item}
        number={snap.index + 1}
        inputRef={inputRef}
        t={t}
        onType={(v) => session.type(v)}
        onSubmit={() => session.check()}
      />
      <div className="jl-tools">
        <button
          type="button"
          className="jl-tool"
          onClick={() => {
            play(item.phrase)
            inputRef.current?.focus({ preventScroll: true })
          }}
        >
          <Icon name="sound" /> {t('videoDictation.again')}
        </button>
        <button
          type="button"
          className="jl-tool"
          aria-pressed={slow}
          onClick={() => {
            onToggleSlow(item.phrase)
            inputRef.current?.focus({ preventScroll: true })
          }}
        >
          {t('videoDictation.slower')}
        </button>
        <button
          type="button"
          className="jl-tool"
          disabled={done}
          onClick={() => {
            session.hint()
            inputRef.current?.focus({ preventScroll: true })
          }}
        >
          <Icon name="bulb" /> {t('videoDictation.hint')}
        </button>
      </div>
      <Verdict item={item} t={t} />
      <div className="jl-foot">
        {done ? (
          <button type="button" ref={nextRef} className="jl-btn" onClick={next}>
            {t(last ? 'videoDictation.finish' : 'videoDictation.next')} <Icon name="arrow" />
          </button>
        ) : (
          <button type="button" className="jl-btn" disabled={!item.typed} onClick={() => session.check()}>
            {t('videoDictation.check')}
          </button>
        )}
      </div>
    </section>
  )
}
