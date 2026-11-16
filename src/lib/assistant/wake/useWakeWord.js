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
// Любая ошибка «уха» (нет разрешения, браузер не распознаёт речь) выключает позывной:
// повтор — включить снова, в жесте, где и разрешение спросят, а не тихий цикл попыток
// каждые полсекунды.
//
// Слушает распознавание самого браузера (speechEar.js, задача 202 от 16.11.2026 — без
// загрузки модели; прежнее «ухо» на Vosk — wakeEar.js — осталось только лаборатории
// /wake-lab). Распознавание и звук Луны браузер пускает только после касания страницы,
// поэтому каждое касание будит и то, и другое (unlockSpeech, resume — дешёвые, если уже
// не спят); до первого касания «ухо» спит (paused).

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { isTtsActive, unlockSpeech } from '../../speech.js'
import { installMicArbiter } from './micArbiter.js'
import { createSpeechEar, speechRecognitionCtor } from './speechEar.js'
import { wav16k } from './preroll.js'
import { useWakeOn, writeWakeOn } from './wakeSetting.js'

export const WAKE_COOLDOWN_MS = 5000
const TICK_MS = 500

const noop = () => () => {}
// Распознаватель браузера есть (Chrome, Edge, Safari; в Firefox — нет, и переключателя позывного нет). «Немой»
// распознаватель (Opera GX) так не отличить — его ловит speechEar по поведению.
function isSupported() {
  return Boolean(speechRecognitionCtor()) && Boolean(globalThis.navigator?.mediaDevices?.getUserMedia)
}
const useSupported = () => useSyncExternalStore(noop, isSupported, () => false)

// e2e: настоящее распознавание браузера в headless не гоняем (у headless-Chrome оно
// не слышит фальшивый микрофон). Тест ставит window.__jtsFakeWakeEar до загрузки —
// «ухо» становится заглушкой, а window.__jtsWake(текст) изображает итог Vosk с позывным
// («луна дальше» — с командой; без текста — одно имя). В прод-сборке этой ветки нет.
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
  // full — итог как у распознавания браузера (speechEar.js): текст целиком, звука команды нет.
  window.__jtsWake = (text = 'луна', { full = false } = {}) => {
    if (ear.state !== 'listening') return
    if (full) onWake({ text, words: [], preroll: () => null, full: true })
    else onWake({ text, words: [], preroll: () => wav16k(new Float32Array(3200), 16000) })
  }
  return ear
}

function earFactory() {
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.__jtsFakeWakeEar) return createFakeEar
  return createSpeechEar
}

/**
 * persona — id помощника (lib/assistant/persona.js): Луну зовут «Луна» и слушают по-русски,
 * Айзере — «Айзере» и по-казахски (matchWake.js, speechEar.js WAKE_LANGS).
 * onDenied — микрофон не дали (окно объясняет, где снять запрет).
 * @returns {{ supported: boolean, on: boolean, state: 'off'|'loading'|'listening'|'paused',
 *   error: null|'denied'|'mic'|'network'|'unsupported', enable: () => void, disable: () => void }}
 */
export function useWakeWord({ token, enabled, open, onWake, onDenied, persona = 'luna' }) {
  const supported = useSupported()
  const on = useWakeOn()
  const [ear, setEar] = useState({ state: 'idle', error: null })
  const [blocked, setBlocked] = useState(false)
  const earRef = useRef(null)
  const arbiterRef = useRef(null)
  const cooldownRef = useRef(0)
  const onWakeRef = useRef(onWake)
  const onDeniedRef = useRef(onDenied)
  useLayoutEffect(() => {
    onWakeRef.current = onWake
    onDeniedRef.current = onDenied
  })

  const getEar = useCallback(() => {
    earRef.current ??= earFactory()({
      // Помощник решает фразы позывного и язык распознавания (matchWake.js, speechEar.js).
      persona,
      onWake: (detail) => {
        cooldownRef.current = Date.now() + WAKE_COOLDOWN_MS
        earRef.current?.stop()
        // Окно может сократить глухоту: после быстрой команды ученик скажет следующую
        // («Луна, дальше» … «Луна, дальше») раньше, чем через 5 с.
        const r = onWakeRef.current?.(detail)
        if (Number.isFinite(r?.cooldownMs)) cooldownRef.current = Date.now() + r.cooldownMs
      },
      onState: (state, error) => {
        setEar({ state, error: error || null })
        if (state === 'error') writeWakeOn(false)
        // Отказ в микрофоне — колбэком: повторный отказ error не меняет, и окно не узнало бы о нём.
        if (state === 'error' && error === 'denied') onDeniedRef.current?.()
      },
    })
    return earRef.current
  }, [persona])

  const live = Boolean(supported && on && token && enabled)

  // Сменился язык интерфейса — сменился помощник: прежнее «ухо» (чужой язык и
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

  // В жесте (клик по переключателю): будим звук и спрашиваем разрешение сейчас — рядом
  // с переключателем, а не посреди урока.
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
