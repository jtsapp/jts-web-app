'use client'

// Рабочая часть экрана: выбор сложности, панель набора, карточка упражнения
// (или итог), низ страницы и окна. Подписана на контроллер набора
// (ListenChooseSession) через useSyncExternalStore — всё состояние живёт в нём,
// здесь только раскладка, клавиатура и перенос фокуса.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { LEVELS } from '../../practice/listenchoose/engine.js'
import { isDeviceStorageBroken } from '../../practice/listenchoose/listenchooseSettings.js'
import LcFeedback from './LcFeedback.jsx'
import { LcHelpDialog, LcZoomDialog } from './LcDialogs.jsx'
import { LcIcon } from './LcIcons.jsx'
import LcPictures from './LcPictures.jsx'
import LcPlayer from './LcPlayer.jsx'
import LcResult from './LcResult.jsx'
import LcSetup from './LcSetup.jsx'

// Названия сложностей — язык упражнения, как в прототипе; переводится только
// подсказка под ними.
const LEVEL_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
// В этих элементах клавиши их собственные: печать, стрелки списка и ползунка.
// На кнопке и ссылке своё только у Space и Enter (они нажимают её) — цифры, R и S
// ничему не мешают, иначе после клика по Play горячие клавиши, которые обещает
// справка, молчали бы.
const TYPING_TAGS = ['INPUT', 'SELECT', 'TEXTAREA']

export function LcDifficulty({ session, t }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  return (
    <div className="lc-difficulty">
      <div className="lc-seg" role="group" aria-label="Difficulty">
        {LEVELS.map((l) => (
          <button key={l} type="button" data-level={l} aria-pressed={l === snap.level} onClick={() => session.setLevel(l)}>
            {LEVEL_NAMES[l]}
          </button>
        ))}
      </div>
      <p className="lc-levelhint">{t(`listenchoose.${snap.level}`)}</p>
    </div>
  )
}

export default function LcMain({ session, data, t }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  const [helpOpen, setHelpOpen] = useState(false)
  const [zoom, setZoom] = useState(null)
  const playRef = useRef(null)
  const replayRef = useRef(null)
  const stopRef = useRef(null)
  const nextRef = useRef(null)
  const titleRef = useRef(null)
  // Куда вернуть фокус после ответа: на «Дальше» (задание закрыто) или на
  // Replay (первая ошибка — слушать заново). Кнопки появляются только после
  // рендера, поэтому фокус ставит эффект ниже, а не обработчик клика.
  const focusAfter = useRef(null)
  const qid = snap.question ? snap.question.id : null

  const onReady = useCallback((ok) => session.setImagesReady(ok, qid), [session, qid])

  const pick = useCallback(
    (optionIndex) => {
      const before = session.getSnapshot()
      if (!before.question) return
      if (session.answer(optionIndex)) {
        focusAfter.current = session.getSnapshot().round.resolved ? 'next' : 'replay'
      } else if (!before.round.resolved && !before.heard) {
        // Нажал картинку, не дослушав: подсказываем, с чего начать.
        playRef.current?.focus({ preventScroll: true })
      }
    },
    [session],
  )

  useEffect(() => {
    const which = focusAfter.current
    if (!which) return
    focusAfter.current = null
    ;(which === 'next' ? nextRef.current : replayRef.current)?.focus({ preventScroll: true })
  })

  // Новое задание (следующее, другая сложность, новый набор): фокус на заголовок
  // упражнения и прокрутка к нему — на телефоне шапка иначе остаётся на экране.
  const lastQuestion = useRef(qid)
  useEffect(() => {
    if (lastQuestion.current === qid) return
    lastQuestion.current = qid
    if (qid && titleRef.current) {
      titleRef.current.focus({ preventScroll: true })
      titleRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }, [qid])

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || document.querySelector('dialog[open]')) return
      const tag = e.target.tagName
      if (TYPING_TAGS.includes(tag) || e.target.isContentEditable) return
      const onButton = tag === 'BUTTON' || tag === 'A'
      const s = session.getSnapshot()
      if (s.complete) return
      // Буквы — по физической клавише (code): на русской и казахской раскладке
      // key даёт «к» и «ы», и R с S молчали бы.
      if (e.code === 'Space') {
        if (onButton) return
        e.preventDefault()
        playRef.current?.click()
      } else if (e.code === 'KeyR') replayRef.current?.click()
      else if (e.code === 'KeyS') stopRef.current?.click()
      else if (/^[1-4]$/.test(e.key)) pick(s.round.order[Number(e.key) - 1])
      else if (e.key === 'Enter' && s.round.resolved) {
        if (onButton) return
        e.preventDefault()
        session.next()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [session, pick])

  // Спрятали вкладку — запись не должна играть в пустоту.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) session.pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [session])

  const { question, round, options, complete, score, total } = snap
  const gate = !complete && (
    <span className="lc-gate" role="status">
      <LcIcon name={snap.heard || round.resolved ? 'check' : 'headphones'} />
      <span>
        {t(
          `listenchoose.${
            !snap.imagesReady ? 'imageLoading' : round.resolved ? 'listened' : snap.heard ? 'ready' : round.wrong.length ? 'retryGate' : 'locked'
          }`,
        )}
      </span>
    </span>
  )

  return (
    <>
      <LcSetup key={snap.level} snap={snap} t={t} onCount={(n) => session.setCount(n)} onNewSet={() => session.startNewSet()} />

      <section className="lc-bench" aria-label="Listening exercise">
        {complete ? (
          <LcResult snap={snap} data={data} t={t} onNewSet={() => session.startNewSet()} onRetry={() => session.retryMistakes()} />
        ) : (
          <>
            <div className="lc-shead">
              <div className="lc-round">
                <strong>
                  {snap.index + 1} / {total}
                </strong>
                <div className="lc-progress" aria-hidden="true">
                  <span style={{ width: `${((score.first + score.second + score.missed) / total) * 100}%` }} />
                </div>
              </div>
              <div className="lc-score" title={t('listenchoose.scoreHelp')}>
                <LcIcon name="check" />
                <span>
                  {score.first + score.second} {t('listenchoose.correct')}
                </span>
              </div>
            </div>
            <div className="lc-exercise">
              <div className="lc-instruction">
                <h2 id="lc-exercise-title" ref={titleRef} tabIndex={-1} lang="en">
                  Listen and choose the correct picture
                </h2>
                <span className="lc-step">
                  {t('listenchoose.attempt')} {Math.min(2, round.wrong.length + 1)} / 2
                </span>
              </div>
              <LcPlayer
                player={session.player}
                t={t}
                onRate={(r) => session.setRate(r)}
                onVolume={(v) => session.setVolume(v)}
                onReload={() => session.reloadAudio()}
                playRef={playRef}
                replayRef={replayRef}
                stopRef={stopRef}
              />
              <LcPictures
                key={question.id}
                question={question}
                options={options}
                round={round}
                heard={snap.heard}
                imagesReady={snap.imagesReady}
                t={t}
                onPick={pick}
                onZoom={setZoom}
                onReady={onReady}
              />
              <div className="lc-under">
                {gate}
                <span className="lc-keys">
                  <kbd>Space</kbd> Play / Pause &nbsp; <kbd>1</kbd>–<kbd>4</kbd> {t('listenchoose.choose')}
                </span>
              </div>
            </div>
            <LcFeedback snap={snap} t={t} nextRef={nextRef} onNext={() => session.next()} onToggleTranscript={() => session.toggleTranscript()} />
          </>
        )}
      </section>

      <div className="lc-bottom">
        <span>{t('listenchoose.sessionNote')}</span>
        <button type="button" className="lc-quiet" onClick={() => setHelpOpen(true)}>
          <LcIcon name="help" />
          <span>{t('listenchoose.help')}</span>
        </button>
      </div>
      {isDeviceStorageBroken() && <p className="lc-storage">{t('listenchoose.storageError')}</p>}

      <LcHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} t={t} />
      <LcZoomDialog
        index={zoom}
        onIndex={setZoom}
        onClose={() => setZoom(null)}
        question={question}
        options={options}
        order={round ? round.order : [0, 1, 2, 3]}
        t={t}
      />
    </>
  )
}
