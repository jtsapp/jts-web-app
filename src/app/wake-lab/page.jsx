'use client'

// Лаборатория позывного Луны (шаг 0 спеки 2026-10-16-luna-wake-word-design.md):
// только «ухо» и журнал — до встраивания в окно Луны замерить на настоящих
// телефонах попадания, ложные срабатывания и нагрузку. Отдельный адрес Next, а не
// экран App: ей не нужны ни вход, ни сайдбар. Открывается на локалке и дев-стенде;
// на проде страницы нет — ученикам она ни к чему.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { WAKE_MODEL_URL } from '../../lib/assistant/wake/model.js'
import { createWakeEar } from '../../lib/assistant/wake/wakeEar.js'

const LAB_HOSTS = /^(localhost|127\.0\.0\.1|.+\.localhost|dev-[\w-]+\.justtostudy\.kz)$/
const noop = () => () => {}
const isLabHost = () => LAB_HOSTS.test(window.location.hostname)
const clock = (ms) => new Date(ms).toLocaleTimeString('ru-RU')

export default function WakeLabPage() {
  const allowed = useSyncExternalStore(noop, isLabHost, () => null)
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [log, setLog] = useState([])
  const [wakes, setWakes] = useState(0)
  const [said, setSaid] = useState(0)
  const [loadMs, setLoadMs] = useState(null)
  const [storageMb, setStorageMb] = useState(null)
  const [since, setSince] = useState(null)
  const earRef = useRef(null)
  const loadStart = useRef(0)

  useEffect(() => () => earRef.current?.dispose(), [])

  const ear = () => {
    earRef.current ??= createWakeEar({
      modelUrl: WAKE_MODEL_URL,
      onWake: () => {
        setWakes((n) => n + 1)
        setLog((l) => [{ at: Date.now(), text: '★ ПОЗЫВНОЙ' }, ...l].slice(0, 300))
      },
      onResult: (text) => setLog((l) => [{ at: Date.now(), text: text || '(пусто)' }, ...l].slice(0, 300)),
      onState: (s, err) => {
        setState(s)
        setError(err || null)
        if (s === 'loading') loadStart.current = performance.now()
        else if (loadStart.current) {
          setLoadMs(Math.round(performance.now() - loadStart.current))
          loadStart.current = 0
        }
      },
    })
    return earRef.current
  }

  // В нажатии: resume будит AudioContext, иначе iPhone оставит его спящим.
  const onStart = () => {
    const e = ear()
    e.resume()
    setSince((s) => s ?? Date.now())
    e.start().then(() =>
      navigator.storage
        ?.estimate?.()
        .then((est) => setStorageMb(Math.round((est?.usage ?? 0) / 1e6)))
        .catch(() => {}),
    )
  }
  const onReset = () => {
    setLog([])
    setWakes(0)
    setSaid(0)
    setSince(Date.now())
  }

  if (allowed === null) return null
  if (!allowed) return <main style={{ padding: 24 }}>Нет такой страницы.</main>

  return (
    <main style={{ padding: 16, maxWidth: 640, margin: '0 auto', fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#171326', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22 }}>Позывной Луны — лаборатория</h1>
      <p>Фразы: «Привет, Луна», «Сәлем, Луна» и отдельное «Луна». Звук не покидает устройство.</p>
      <p data-testid="wake-state">
        Состояние: <b>{state}</b>
        {error ? ` (${error})` : ''}
        {loadMs != null ? ` · старт ${loadMs} мс` : ''}
      </p>
      <p>
        Хранилище сайта: {storageMb != null ? `${storageMb} МБ` : '—'}
        {since ? ` · с ${clock(since)}` : ''}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onStart}>Старт</button>
        <button type="button" onClick={() => earRef.current?.stop()}>Стоп</button>
        <button type="button" onClick={() => setSaid((n) => n + 1)}>+1 сказал позывной</button>
        <button type="button" onClick={onReset}>Сброс</button>
      </div>
      <p style={{ fontSize: 18 }}>
        Срабатываний: <b data-testid="wake-count">{wakes}</b> · сказано: <b>{said}</b>
        {said > 0 ? ` · попадания ${Math.round((Math.min(wakes, said) / said) * 100)}%` : ''}
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((r, i) => (
          <li key={`${r.at}-${i}`}>
            {clock(r.at)} — {r.text}
          </li>
        ))}
      </ol>
    </main>
  )
}
