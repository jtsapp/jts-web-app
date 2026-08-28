'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { trackSources } from '../../../practice/workbook/audioSrc.js'
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
