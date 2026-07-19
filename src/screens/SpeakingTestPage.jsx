import { useCallback, useEffect, useRef, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import TutorStatus from '../tutor/TutorStatus.jsx'
import { MicIcon, VolumeIcon, CloseCircleIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'
import { PLACEMENT_TASK } from '../data/speaking-test-tasks.js'
import {
  blobToWav16kMono,
  isMediaRecordingSupported,
  speakTutorVoice,
  cancelSpeech,
} from '../lib/ielts-audio.js'
import { getDeviceId, authHeaders } from '../lib/identity.js'
import { savePlacementLevel } from '../lib/tutorPrefs.js'

// Records mic audio and resolves a 16 kHz mono WAV blob (the format the
// transcribe route wants). Same recorder the IELTS Speaking screen uses.
function useWavRecorder() {
  const [recording, setRecording] = useState(false)
  const recRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const resolverRef = useRef(null)

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const start = useCallback(async () => {
    if (recRef.current) return false
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return false
    }
    streamRef.current = stream
    chunksRef.current = []
    const rec = new MediaRecorder(stream)
    recRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
      chunksRef.current = []
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      recRef.current = null
      setRecording(false)
      const resolve = resolverRef.current
      resolverRef.current = null
      if (blob.size === 0) return resolve?.(null)
      try {
        resolve?.(await blobToWav16kMono(blob))
      } catch {
        resolve?.(null)
      }
    }
    try {
      rec.start()
      setRecording(true)
      return true
    } catch {
      return false
    }
  }, [])

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const rec = recRef.current
        if (!rec || rec.state === 'inactive') return resolve(null)
        resolverRef.current = resolve
        try {
          rec.stop()
        } catch {
          resolve(null)
        }
      }),
    [],
  )

  return { recording, start, stop }
}

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Спарк level test: one open prompt, record a monologue (no talk-time limit),
// Sonnet determines the CEFR level. Reached from tutor-voice-intro; the level it
// returns flows into TutorLevelResultPage via onComplete.
export default function SpeakingTestPage({
  user,
  tutor = {},
  token,
  onNavigate,
  onProfile,
  onBack,
  onComplete,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const [supported] = useState(() => isMediaRecordingSupported())
  const rec = useWavRecorder()
  const [phase, setPhase] = useState('ready') // ready | recording | processing | error
  const [elapsed, setElapsed] = useState(0)
  const [errKey, setErrKey] = useState(null)

  // Recording clock counts UP; there is no auto-stop and no time cap.
  useEffect(() => {
    if (phase !== 'recording') return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => () => cancelSpeech(), [])

  const recStart = rec.start
  const recStop = rec.stop

  const begin = useCallback(async () => {
    cancelSpeech()
    setErrKey(null)
    setElapsed(0)
    const ok = await recStart()
    if (!ok) {
      setErrKey('placeTest.errMic')
      setPhase('error')
      return
    }
    setPhase('recording')
  }, [recStart])

  const finish = useCallback(async () => {
    const wav = await recStop()
    setPhase('processing')
    if (!wav) {
      setErrKey('placeTest.errRecognize')
      setPhase('error')
      return
    }
    // 1) Transcribe.
    let transcript = ''
    try {
      const form = new FormData()
      form.append('audio', wav, 'placement.wav')
      form.append('lang', 'en')
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      if (res.ok) transcript = (await res.json()).text ?? ''
    } catch {
      /* handled below */
    }
    if (!transcript.trim()) {
      setErrKey('placeTest.errRecognize')
      setPhase('error')
      return
    }
    // 2) Grade → CEFR level.
    let level
    try {
      const res = await fetch('/api/speaking-test/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({
          mode: 'placement',
          transcript,
          uiLang: 'ru',
          deviceId: getDeviceId(),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      level = data.assessment?.level
    } catch {
      setErrKey('placeTest.errGrade')
      setPhase('error')
      return
    }
    if (!level) {
      setErrKey('placeTest.errGrade')
      setPhase('error')
      return
    }
    // 3) Persist the placement level (best-effort) and hand off to the result.
    await savePlacementLevel(token, level)
    onComplete?.(level)
  }, [recStop, token, onComplete])

  const shell = (children) => (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      layout="flow"
    >
      {children}
    </TutorShell>
  )

  if (phase === 'processing') {
    return shell(
      <TutorStatus name={name} avatar={avatar} heading={t('placeTest.processing')} flow dots pulse />,
    )
  }

  if (phase === 'error') {
    return shell(
      <TutorStatus name={name} avatar={avatar} heading={t(errKey || 'placeTest.errGrade')} flow>
        <div className="t-btnstack">
          <button
            className="t-pill t-pill--primary t-pill--lg"
            type="button"
            onClick={() => {
              setErrKey(null)
              setPhase('ready')
            }}
          >
            {t('placeTest.retry')}
          </button>
          <button className="t-pill t-pill--blue" type="button" onClick={onBack}>
            <CloseCircleIcon size={24} />
            {t('placeTest.cancel')}
          </button>
        </div>
      </TutorStatus>,
    )
  }

  if (phase === 'recording') {
    return shell(
      <TutorStatus name={name} avatar={avatar} heading={t('placeTest.recordingHeading')} flow pulse>
        <p className="t-placetest__prompt">{PLACEMENT_TASK.instruction}</p>
        <div className="t-placetest__timer">
          <span className="t-placetest__dot" />
          {fmt(elapsed)}
          <span className="t-placetest__rec-hint">
            {fmt(PLACEMENT_TASK.minSeconds)}–{fmt(PLACEMENT_TASK.maxSeconds)}
          </span>
        </div>
        <div className="t-btnstack">
          <button
            className="t-pill t-pill--primary t-pill--lg"
            type="button"
            onClick={() => void finish()}
          >
            {t('placeTest.stop')}
          </button>
        </div>
      </TutorStatus>,
    )
  }

  // phase === 'ready'
  return shell(
    <TutorStatus name={name} avatar={avatar} heading={t('placeTest.heading')} flow>
      <p className="t-placetest__prompt">{PLACEMENT_TASK.instruction}</p>
      <p className="t-placetest__hint">{t('placeTest.hint')}</p>
      {!supported && <p className="t-placetest__err">{t('placeTest.errUnsupported')}</p>}
      <div className="t-btnstack">
        <button
          className="t-pill t-pill--primary t-pill--lg"
          type="button"
          disabled={!supported}
          onClick={() => void begin()}
        >
          <MicIcon size={24} />
          {t('placeTest.start')}
        </button>
        <button
          className="t-pill t-pill--blue"
          type="button"
          onClick={() => speakTutorVoice(tutor.key, PLACEMENT_TASK.instruction)}
        >
          <VolumeIcon size={20} />
          {t('placeTest.listen')}
        </button>
      </div>
    </TutorStatus>,
  )
}
