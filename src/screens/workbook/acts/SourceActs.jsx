'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { trackSources, videoSource } from '../../../practice/workbook/audioSrc.js'
import { playTrack, speak, stopAudio } from '../../../practice/workbook/voice.js'

// Источник материала: аудио или текст, а под ним — обычное задание.
// Порт wrapper()/R.listen/R.read (data/jtsworkbook-a0.html:6083–6115).
// Прототип не возит mp3 с собой: если файла нет, реплики читает синтез —
// поэтому кнопка «играть» одна и та же в обоих случаях.

export function ListenAct({ act, level, slow, onSlow, children }) {
  const { t } = useI18n()
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => stopAudio(), [])

  return (
    <>
      <div className="wb-src">
        <div className="wb-player">
          <button
            type="button"
            className={'wb-play' + (playing ? ' is-on' : '')}
            aria-label={t('workbook.audio')}
            onClick={() => {
              if (playing) {
                stopAudio()
                setPlaying(false)
                return
              }
              playTrack(trackSources(level, act.track), act.tts, { slow, onState: setPlaying })
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <div className="wb-player__label">
            <b>
              {t('workbook.audio')}
              {act.track ? ' · ' + String(act.track).replace('_', '.') : ''}
            </b>
            <span>{t('workbook.audioHint')}</span>
          </div>
          <button
            type="button"
            className={'wb-slow' + (slow ? ' is-on' : '')}
            onClick={() => {
              stopAudio()
              setPlaying(false)
              onSlow(!slow)
            }}
          >
            🐢 {t('workbook.slow')}
          </button>
        </div>
      </div>
      {children}
    </>
  )
}

export function ReadAct({ act, slow, children }) {
  const { t } = useI18n()
  useEffect(() => () => stopAudio(), [])
  return (
    <>
      <div className="wb-src">
        <div className="wb-src__k">{act.title || t('workbook.read')}</div>
        <div className="wb-src__body">
          {act.text.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="wb-ghost wb-ghost--gap"
        onClick={() => {
          stopAudio()
          speak(act.text, { slow })
        }}
      >
        🔊 {t('workbook.listenRead')}
      </button>
      {children}
    </>
  )
}

/* ── Материал без задания сверху: правило, разбор, образец, видео ──────── */
/* Порт R.rule/R.worked/R.model/R.video (data/jtsworkbook-b1.html:10398,
   data/jtsworkbook-b2.html:13257). Все четыре — обёртки: судится то, что под
   ними, а сам блок только объясняет. */

/** Правило с пунктами и примерами (B2). */
export function RuleAct({ act, children }) {
  const { t } = useI18n()
  return (
    <>
      <div className="wb-rule">
        <div className="wb-rule__k">{act.title || t('workbook.howItWorks')}</div>
        {(act.rule || []).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {act.points && act.points.length ? (
          <ul className="wb-rule__points">
            {act.points.map((p, i) => (
              <li key={i}>
                <b>{p[0]}</b> — {p[1]}
              </li>
            ))}
          </ul>
        ) : null}
        {act.eg && act.eg.length ? (
          <div className="wb-egbank">
            {act.eg.map((e, i) => (
              <div key={i}>
                {e[0]}
                {e[1] ? <em>{e[1]}</em> : null}
              </div>
            ))}
          </div>
        ) : null}
        {act.careful ? <div className="wb-warnnote">⚠️ {act.careful}</div> : null}
      </div>
      {children}
    </>
  )
}

/** Один пример, разобранный по шагам, перед тем как делать самому (B1+). */
export function WorkedAct({ act, children }) {
  const { t } = useI18n()
  return (
    <>
      <div className="wb-worked">
        <div className="wb-worked__k">{act.title || t('workbook.type.worked')}</div>
        {act.steps.map((st, i) => (
          <div className="wb-wstep" key={i}>
            <span className="wb-wstep__n" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <b>{st[0]}</b>
              {st[1] ? <em>{st[1]}</em> : null}
            </span>
          </div>
        ))}
      </div>
      {children}
    </>
  )
}

/** Модельный текст жанра, который студент будет писать сам (B1+). */
export function ModelAct({ act, slow, children }) {
  const { t } = useI18n()
  useEffect(() => () => stopAudio(), [])
  return (
    <>
      <div className="wb-src">
        {act.genre ? <div className="wb-src__genre">{act.genre}</div> : null}
        <div className="wb-src__k">{act.title || t('workbook.type.model')}</div>
        <div className="wb-src__body">
          {act.text.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {act.parts && act.parts.length ? (
          <div className="wb-parts">
            {act.parts.map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="wb-ghost wb-ghost--gap"
        onClick={() => {
          stopAudio()
          speak(act.text, { slow })
        }}
      >
        🔊 {t('workbook.listenRead')}
      </button>
      {children}
    </>
  )
}

/**
 * Видео-репортаж юнита (B2). Прототип ролика не возил и читал расшифровку
 * синтезом; у нас файл лежит в материалах курса, поэтому играем его, а синтез
 * оставляем запасным путём — на случай, если ролика для юнита нет.
 */
export function VideoAct({ act, level, unit, slow, children }) {
  const { t } = useI18n()
  const src = videoSource(level, unit)
  const [broken, setBroken] = useState(false)
  useEffect(() => () => stopAudio(), [])
  return (
    <>
      <div className="wb-vid">
        {src && !broken ? (
          <video className="wb-vid__pl" controls preload="metadata" onError={() => setBroken(true)}>
            <source src={src} type="video/mp4" />
          </video>
        ) : (
          <div className="wb-vid__ph">
            <span className="wb-vid__big" aria-hidden="true">
              🎬
            </span>
            <b>{act.title || t('workbook.type.video')}</b>
            <span>{t('workbook.videoHint')}</span>
          </div>
        )}
      </div>
      <div className="wb-vid__meta">
        <b>{act.title || t('workbook.type.video')}</b>
        <span>{t('workbook.videoHint')}</span>
      </div>
      <button
        type="button"
        className="wb-ghost wb-ghost--gap"
        onClick={() => {
          stopAudio()
          speak(act.tts || [], { slow })
        }}
      >
        🔊 {t('workbook.listenRead')}
      </button>
      {children}
    </>
  )
}

/** Раскрывающийся образец ответа. Порт modelBox (:6116). */
function ModelBox({ text, spoken, slow }) {
  const { t } = useI18n()
  const [on, setOn] = useState(false)
  return (
    <>
      <div className="wb-modelrow">
        <button type="button" className="wb-ghost" onClick={() => setOn((v) => !v)}>
          💡 {t('workbook.model')}
        </button>
        {spoken ? (
          <button
            type="button"
            className="wb-ghost"
            aria-label={t('workbook.model')}
            onClick={() => {
              stopAudio()
              speak([text], { slow })
            }}
          >
            🔊
          </button>
        ) : null}
      </div>
      {on ? (
        <div className="wb-model">
          <b>{t('workbook.model')}</b>
          {text}
        </div>
      ) : null}
    </>
  )
}

/* ── Свободные экраны: их никто не судит, есть только образец ──────────── */
export function WriteAct({ act, slow, draft, onDraft }) {
  return (
    <>
      <div className="wb-qline">
        <span>{act.write.q}</span>
      </div>
      <textarea
        className="wb-ta"
        placeholder={act.write.ph || ''}
        aria-label={act.write.q}
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
      />
      <ModelBox text={act.write.model} spoken={false} slow={slow} />
    </>
  )
}

export function SpeakAct({ act, slow }) {
  const { t } = useI18n()
  const [url, setUrl] = useState(null)
  const [state, setState] = useState('idle') // idle | rec | done | nomic
  const rec = useRef(null)
  const chunks = useRef([])

  useEffect(
    () => () => {
      try {
        rec.current?.stream?.getTracks().forEach((x) => x.stop())
      } catch {
        /* поток уже закрыт */
      }
      if (url) URL.revokeObjectURL(url)
    },
    [url]
  )

  const toggle = async () => {
    if (rec.current && rec.current.state === 'recording') {
      rec.current.stop()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('nomic')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const mr = new MediaRecorder(stream)
      mr.stream = stream
      mr.ondataavailable = (e) => chunks.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(blob)
        })
        setState('done')
        stream.getTracks().forEach((x) => x.stop())
      }
      rec.current = mr
      mr.start()
      setState('rec')
    } catch {
      setState('nomic')
    }
  }

  return (
    <>
      <div className="wb-qline">
        <span>{act.speak.q}</span>
      </div>
      <div className="wb-rec">
        <button type="button" className={'wb-recbtn' + (state === 'rec' ? ' is-on' : '')} onClick={toggle}>
          {state === 'rec' ? '⏹ ' + t('workbook.stop') : state === 'done' ? '⏺ ' + t('workbook.again') : '⏺ ' + t('workbook.record')}
        </button>
        {state === 'nomic' ? <span className="wb-rec__no">{t('workbook.noMic')}</span> : null}
        {url ? <audio className="wb-rec__audio" controls src={url} /> : null}
      </div>
      <ModelBox text={act.speak.model} spoken slow={slow} />
    </>
  )
}
