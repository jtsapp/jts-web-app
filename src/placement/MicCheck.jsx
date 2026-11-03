'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { micEnvironment, micErrorKind, micPlatform, openMic } from '../lib/micAccess.js'

// Проверка микрофона перед говорением теста уровня и инструкция «как включить» (жалоба 03.11.2026: запись не
// начиналась, а ученик не знал почему). Состояние без запроса разрешения — micEnvironment; «Проверить микрофон»
// открывает его на несколько секунд и показывает громкость: так ученик видит, что слышно именно его. Записи нет.

const TEST_MS = 5000
// Порог «слышно голос» по RMS: тише — обычно выбран не тот микрофон или он выключен кнопкой на гарнитуре.
const VOICE_RMS = 0.02

/** Шаги «что сделать» по причине и платформе. Ключи — placement.mic.help.<причина>.<n>. */
const HELP = {
  denied: { all: ['site', 'reload'], windows: ['windows'], mac: ['mac'], ios: ['ios'], android: ['android'] },
  nodevice: { all: ['plug', 'choose', 'phone'], windows: ['windowsInput'], mac: ['macInput'] },
  busy: { all: ['close', 'tabs', 'replug', 'restart'], windows: ['windowsExclusive'] },
  silent: { all: ['choose', 'mute', 'closer'], windows: ['windowsInput'], mac: ['macInput'] },
  unsupported: { all: ['browser'] },
  insecure: { all: ['https'] },
  failed: { all: ['reload', 'close', 'browser'] },
}

export function helpSteps(kind, platform = micPlatform()) {
  const h = HELP[kind] || HELP.failed
  return [...(h[platform] || []), ...h.all].map((step) => `placement.mic.help.${kind in HELP ? kind : 'failed'}.${step}`)
}

/** Инструкция под причиной: что сделать, по шагам. */
export function MicHelp({ kind }) {
  const { t } = useI18n()
  if (!kind) return null
  return (
    <div className="pl-mic__help" data-testid="mic-help" data-kind={kind}>
      <p className="pl-mic__helpTitle">{t('placement.mic.howTo')}</p>
      <ol>
        {helpSteps(kind).map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ol>
    </div>
  )
}

/**
 * Карточка «Микрофон» в окне говорения: статус, кнопка проверки с живой громкостью и инструкция при проблеме.
 * onIssue(kind | null) — окно запоминает причину, чтобы честно пометить пропуск.
 */
export default function MicCheck({ onIssue }) {
  const { t } = useI18n()
  const [env, setEnv] = useState(null) // ответ micEnvironment
  const [phase, setPhase] = useState('idle') // idle | testing | ok | problem
  const [issue, setIssue] = useState(null)
  const [level, setLevel] = useState(0)
  const stopRef = useRef(() => {})

  const report = useCallback(
    (kind) => {
      setIssue(kind)
      onIssue?.(kind)
    },
    [onIssue],
  )

  useEffect(() => {
    let alive = true
    micEnvironment().then((e) => {
      if (!alive) return
      setEnv(e)
      if (e.issue) {
        setPhase('problem')
        report(e.issue)
      }
    })
    return () => {
      alive = false
      stopRef.current()
    }
  }, [report])

  const test = async () => {
    stopRef.current()
    setPhase('testing')
    setLevel(0)
    let stream
    try {
      stream = await openMic()
    } catch (e) {
      setPhase('problem')
      report(micErrorKind(e))
      return
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    let ctx = null
    let raf = 0
    let peak = 0
    const finish = (heard) => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      stream.getTracks().forEach((tr) => tr.stop())
      void ctx?.close?.()
      stopRef.current = () => {}
      if (heard === null) return
      setPhase(heard ? 'ok' : 'problem')
      report(heard ? null : 'silent')
    }
    const timer = setTimeout(() => finish(peak >= VOICE_RMS), TEST_MS)
    stopRef.current = () => finish(null)
    try {
      ctx = new Ctx()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      src.connect(an)
      const buf = new Float32Array(an.fftSize)
      const tick = () => {
        an.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)
        peak = Math.max(peak, rms)
        setLevel(Math.min(1, rms / 0.15))
        // Голос услышан — проверку можно не дотягивать до конца.
        if (peak >= VOICE_RMS * 2) {
          finish(true)
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    } catch {
      // Громкость не измерить, но микрофон открылся — запись пойдёт.
      finish(true)
    }
  }

  const status =
    phase === 'ok'
      ? t('placement.mic.ok')
      : phase === 'testing'
        ? t('placement.mic.testing')
        : phase === 'problem'
          ? t(`placement.mic.issue.${issue || 'failed'}`)
          : env?.permission === 'granted'
            ? t('placement.mic.allowed')
            : t('placement.mic.notChecked')

  return (
    <div className={`pl-mic pl-mic--${phase}`} data-testid="mic-check" data-phase={phase}>
      <div className="pl-mic__row">
        <span className="pl-mic__dot" aria-hidden="true" />
        <span className="pl-mic__status" role={phase === 'problem' ? 'alert' : 'status'} data-testid="mic-status">
          {status}
        </span>
        {phase !== 'testing' && env?.issue !== 'unsupported' && env?.issue !== 'insecure' && (
          <button type="button" className="pl-mic__test" onClick={test} data-testid="mic-test">
            {t(phase === 'idle' ? 'placement.mic.test' : 'placement.mic.retest')}
          </button>
        )}
      </div>
      {phase === 'testing' && (
        <>
          <p className="pl-mic__hint">{t('placement.mic.sayHint')}</p>
          <div className="pl-mic__meter" aria-hidden="true">
            <i style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
        </>
      )}
      {phase === 'problem' && <MicHelp kind={issue || 'failed'} />}
    </div>
  )
}
