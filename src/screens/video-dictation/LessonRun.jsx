'use client'

// Урок Видеодиктанта: плеер YouTube сверху, диктант под ним. Плеер — официальный встроенный (youtube-nocookie, IFrame
// API, как у Шэдоуинга), поверх него ничего не кладём; управление — только методами API через player.js. Плеер один
// на урок и переживает «Пройти ошибки заново»: прогон (DictationStage) пересоздаётся по nonce, ролик не грузится
// заново. Узел плеера создаётся вручную внутри пустой обёртки: YT.Player заменяет его своим iframe, и React этот узел
// не трогает. Ошибка ролика — плашка «Видео недоступно» под плеером; лучший результат такого урока не пишется. Та же
// плашка, если плеер не ответил за READY_TIMEOUT_MS: YouTube закрыт сетью — иначе «Начать» висела бы вечно.
// Фраза не сыграна по сроку (onError('timeout')) — не конец: плеер годен, под плеером «Видео не загрузилось» и «Ещё раз».

import { useEffect, useRef, useState } from 'react'
import { loadYouTubeApi } from '../../lib/youtube.js'
import { SLOW_RATE, TIMEOUT_REASON, createPhrasePlayer } from '../../practice/video-dictation/player.js'
import { recordBest } from '../../practice/video-dictation/progress.js'
import DictationStage from './DictationStage.jsx'

export const READY_TIMEOUT_MS = 20_000

function Unavailable({ lesson, t, onExit }) {
  const at = Math.floor(lesson.phrases[0]?.start || 0)
  return (
    <div className="jl-notice jl-notice--err vd-gone" role="alert">
      <div>
        <b>{t('videoDictation.unavailable.title')}</b>
        <p>{t('videoDictation.unavailable.text')}</p>
      </div>
      <div className="jl-row">
        <a
          className="jl-btn jl-btn--ghost jl-btn--sm"
          href={`https://www.youtube.com/watch?v=${encodeURIComponent(lesson.video)}&t=${at}s`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('videoDictation.watchOnYoutube')}
        </a>
        <button type="button" className="jl-btn jl-btn--sm" onClick={onExit}>
          {t('videoDictation.toList')}
        </button>
      </div>
    </div>
  )
}

export default function LessonRun({ lesson, t, onExit }) {
  const hostRef = useRef(null)
  const phraseRef = useRef(null)
  const failedRef = useRef(false)
  const lastPhraseRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [stalled, setStalled] = useState(false)
  const [slow, setSlow] = useState(false)
  // only — номера фраз «Пройти ошибки заново», null — весь урок
  const [run, setRun] = useState({ nonce: 0, only: null })
  // Другой ролик — другой урок: состояние прошлого сбрасываем в рендере (не в эффекте), чтобы не мигала старая плашка.
  const [videoOf, setVideoOf] = useState(lesson.video)
  if (videoOf !== lesson.video) {
    setVideoOf(lesson.video)
    setReady(false)
    setFailed(false)
    setStalled(false)
    setSlow(false)
    setRun({ nonce: 0, only: null })
  }

  useEffect(() => {
    const host = hostRef.current
    // Новый ролик — новый урок: ссылки прошлого не переносим (состояние сброшено при рендере выше).
    failedRef.current = false
    phraseRef.current = null
    lastPhraseRef.current = null
    let cancelled = false
    let yt = null
    const markFailed = () => {
      failedRef.current = true
      if (!cancelled) setFailed(true)
    }
    const timer = setTimeout(() => {
      if (!phraseRef.current) markFailed()
    }, READY_TIMEOUT_MS)
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !YT || !host) return
        const mount = document.createElement('div')
        host.replaceChildren(mount)
        yt = new YT.Player(mount, {
          // youtube-nocookie + origin — как у Шэдоуинга: privacy-домен реже режут блокировщики, origin помогает на localhost.
          host: 'https://www.youtube-nocookie.com',
          videoId: lesson.video,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              phraseRef.current = createPhrasePlayer({
                player: yt,
                frame: (fn) => window.requestAnimationFrame(fn),
                cancel: (id) => window.cancelAnimationFrame(id),
                onError: (reason) => (reason === TIMEOUT_REASON ? setStalled(true) : markFailed()),
              })
              setReady(true)
            },
            onStateChange: (e) => phraseRef.current?.onPlayerState(e?.data),
            onError: (e) => (phraseRef.current ? phraseRef.current.fail(e?.data ?? null) : markFailed()),
          },
        })
      })
      .catch(markFailed)
    return () => {
      cancelled = true
      clearTimeout(timer)
      phraseRef.current?.destroy()
      phraseRef.current = null
      try {
        yt?.destroy?.()
      } catch {
        /* плеер уже разрушен */
      }
      host?.replaceChildren()
    }
  }, [lesson.video])

  // false — плеер в ошибке: onError уже показал плашку. Новый play снимает «Видео не загрузилось».
  const play = (phrase) => {
    lastPhraseRef.current = phrase
    setStalled(false)
    return phraseRef.current?.play(phrase) ?? false
  }

  // «Медленнее» — переключатель 1 ↔ 0,75: новая скорость сразу звучит на этой же фразе.
  const toggleSlow = (phrase) => {
    const next = !slow
    setSlow(next)
    phraseRef.current?.setRate(next ? SLOW_RATE : 1)
    play(phrase)
  }

  // Лучший результат — только у прогона всего урока и только если ролик не падал.
  const finish = (summary) => {
    setStalled(false)
    if (run.only || failedRef.current) return
    recordBest(lesson.slug, { clean: summary.clean, n: summary.n })
  }

  return (
    <div className="vd-run">
      <div className={`vd-player${ready ? ' is-ready' : ''}`}>
        <div className="vd-player__host" ref={hostRef} />
      </div>
      {stalled && !failed && (
        <div className="jl-notice jl-notice--err vd-gone" role="status">
          <p>{t('videoDictation.videoTimeout')}</p>
          <button type="button" className="jl-btn jl-btn--sm" onClick={() => play(lastPhraseRef.current)}>
            {t('videoDictation.again')}
          </button>
        </div>
      )}
      {failed ? (
        <Unavailable lesson={lesson} t={t} onExit={onExit} />
      ) : (
        <DictationStage
          key={`${lesson.slug}:${run.nonce}`}
          lesson={lesson}
          only={run.only}
          ready={ready}
          slow={slow}
          autoStart={run.nonce > 0}
          t={t}
          play={play}
          onToggleSlow={toggleSlow}
          onFinish={finish}
          onRedo={(only) => setRun((r) => ({ nonce: r.nonce + 1, only }))}
          onExit={onExit}
        />
      )}
    </div>
  )
}
