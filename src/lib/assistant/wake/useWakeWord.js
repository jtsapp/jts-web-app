'use client'

// Позывной Луны в окне помощника: когда «ухо» слушать, когда отдавать микрофон
// (спека docs/superpowers/specs/2026-10-16-luna-wake-word-design.md).
//
// Слушает, только если разом: ученик включил позывной на этом устройстве, вошёл,
// Луна есть на этом экране (enabled), её окно закрыто (в открытом есть кнопка
// микрофона), микрофон не занят разделом (micArbiter.js), ничего не звучит
// (isTtsActive — иначе Луна будила бы сама себя), вкладка видна, и прошло 5 с с
// прошлого вызова или закрытия окна: ложное срабатывание → ученик закрыл окно →
// оно не должно тут же открыться снова. Условия проверяются каждые полсекунды:
// половина из них — не состояние React (арбитр, звук, видимость, часы).
//
// Любая ошибка «уха» (нет разрешения, модель не скачалась) выключает позывной:
// повтор — включить снова, в жесте, где и разрешение спросят, и контекст разбудят,
// а не тихий цикл попыток каждые полсекунды.
//
// AudioContext «уха» и звук Луны браузер будит только жестом. После перезагрузки
// жеста нет, поэтому каждое касание страницы будит и то, и другое (unlockSpeech,
// resume — дешёвые, если уже не спят); до первого касания «ухо» спит (paused).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { isTtsActive, unlockSpeech } from '../../speech.js'
import { installMicArbiter } from './micArbiter.js'
import { wakeSet } from './matchWake.js'
import { WAKE_MODELS } from './model.js'
import { createWakeEar } from './wakeEar.js'
import { useWakeOn, writeWakeOn } from './wakeSetting.js'

export const WAKE_COOLDOWN_MS = 5000
const TICK_MS = 500

const noop = () => () => {}
function isSupported() {
  return (
    typeof WebAssembly === 'object' &&
    Boolean(globalThis.AudioContext || globalThis.webkitAudioContext) &&
    Boolean(globalThis.navigator?.mediaDevices?.getUserMedia)
  )
}
const useSupported = () => useSyncExternalStore(noop, isSupported, () => false)

// e2e: настоящий Vosk в headless не гоняем (45 МБ модели и WASM на процессоре; его
// проверяет tests/wake-lab.spec.js). Тест ставит window.__jtsFakeWakeEar до загрузки —
// «ухо» становится заглушкой, а window.__jtsWake() изображает позывной. В прод-сборке
// этой ветки нет.
function createFakeEar({ onWake, onState }) {
  const ear = {
    state: 'idle',
    async start() {
      set('listening')
    },
    async prepare() {
      set('idle')
    },
    stop() {
      if (ear.state !== 'idle') set('idle')
    },
    resume() {},
    dispose() {
      delete window.__jtsWake
    },
  }
  function set(s) {
    ear.state = s
    onState(s)
  }
  window.__jtsWake = () => {
    if (ear.state === 'listening') onWake()
  }
  return ear
}

function earFactory() {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.__jtsFakeWakeEar) return createFakeEar
  return createWakeEar
}

/**
 * persona — id помощника (lib/assistant/persona.js): Луна слушает русской моделью и
 * ждёт «Луна», Айзере — казахской и ждёт «Айзере» (matchWake.js).
 * @returns {{ supported: boolean, on: boolean, state: 'off'|'loading'|'listening'|'paused',
 *   error: null|'model'|'denied'|'mic', enable: () => void, disable: () => void }}
 */
export function useWakeWord({ token, enabled, open, onWake, persona = 'luna' }) {
  const supported = useSupported()
  const on = useWakeOn()
  const [ear, setEar] = useState({ state: 'idle', error: null })
  const [blocked, setBlocked] = useState(false)
  const earRef = useRef(null)
  const arbiterRef = useRef(null)
  const cooldownRef = useRef(0)
  const onWakeRef = useRef(onWake)
  useLayoutEffect(() => {
    onWakeRef.current = onWake
  })

  const getEar = useCallback(() => {
    const wake = wakeSet(persona)
    earRef.current ??= earFactory()({
      modelUrl: WAKE_MODELS[wake.model],
      wake,
      onWake: () => {
        cooldownRef.current = Date.now() + WAKE_COOLDOWN_MS
        earRef.current?.stop()
        onWakeRef.current?.()
      },
      onState: (state, error) => {
        setEar({ state, error: error || null })
        if (state === 'error') writeWakeOn(false)
      },
    })
    return earRef.current
  }, [persona])

  const live = Boolean(supported && on && token && enabled)

  // Сменился язык интерфейса — сменился помощник: прежнее «ухо» (чужая модель и
  // фразы) отпускаем, новое создаст getEar на следующем тике. Эффект стоит ДО тика:
  // тот перезапускается на новый getEar и должен застать earRef пустым.
  const personaRef = useRef(persona)
  useEffect(() => {
    if (personaRef.current === persona) return
    personaRef.current = persona
    earRef.current?.dispose()
    earRef.current = null
    setEar({ state: 'idle', error: null })
  }, [persona])

  useEffect(
    () => () => {
      earRef.current?.dispose()
      earRef.current = null
    },
    [],
  )

  // Окно закрыли — 5 с позывной глух (см. шапку).
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) cooldownRef.current = Date.now() + WAKE_COOLDOWN_MS
    wasOpen.current = open
  }, [open])

  // Арбитр — на всё время, пока позывной возможен: переставлять его на каждое
  // открытие окна нельзя, он потерял бы чужие дорожки, которые уже держит.
  useEffect(() => {
    if (!live) return undefined
    const arbiter = installMicArbiter({ onClaim: () => earRef.current?.stop() })
    arbiterRef.current = arbiter
    const onGesture = () => {
      unlockSpeech()
      earRef.current?.resume()
    }
    window.addEventListener('pointerdown', onGesture, true)
    return () => {
      window.removeEventListener('pointerdown', onGesture, true)
      arbiter.uninstall()
      arbiterRef.current = null
      earRef.current?.stop()
    }
  }, [live])

  useEffect(() => {
    if (!live) return undefined
    const tick = () => {
      const busy = Boolean(arbiterRef.current?.isBusy()) || isTtsActive()
      setBlocked(busy)
      const e = getEar()
      const want = !open && !busy && document.visibilityState === 'visible' && Date.now() >= cooldownRef.current
      if (want) {
        if (e.state === 'idle') e.start()
      } else if (e.state === 'listening' || e.state === 'asleep') {
        e.stop()
      }
    }
    tick()
    const id = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [live, open, getEar])

  // В жесте (клик по переключателю): будим звук и контекст, качаем модель и спрашиваем
  // разрешение сейчас — рядом с переключателем, а не посреди урока.
  const enable = useCallback(() => {
    unlockSpeech()
    writeWakeOn(true)
    const e = getEar()
    e.resume()
    e.prepare()
  }, [getEar])

  const disable = useCallback(() => {
    writeWakeOn(false)
    earRef.current?.stop()
  }, [])

  let state = 'off'
  if (live) {
    if (ear.state === 'loading') state = 'loading'
    else if (ear.state === 'listening' && !blocked && !open) state = 'listening'
    else state = 'paused'
  }
  return { supported, on, state, error: ear.error, enable, disable }
}
