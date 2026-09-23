'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isTtsActive, pauseTts, resumeTts } from '../../lib/speech.js'
import { prefetch, speak, stopAudio } from '../../practice/workbook/voice.js'

// Озвучка текста с подсветкой текущего предложения (ttsStart/ttsNext прототипа,
// jtsreading.html:613–626). Голос берём готовый — из воркбука: там Soniox, а
// запасной синтез устройства с уже решённым подбором голоса (иначе
// Windows/Android читают eSpeak'ом) и сторожем зависших очередей. Читаем ПО
// ПРЕДЛОЖЕНИЮ, а не всё разом: очередь целиком не даёт узнать, где движок
// сейчас, а подсветка — половина смысла озвучки.
export default function useReadingVoice(lines) {
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(-1)
  // Поколение: каждый новый запуск/стоп обесценивает колбэки предыдущего —
  // без этого «стоп, потом старт» доигрывал старую очередь поверх новой.
  const runRef = useRef(0)
  // Пауза живёт здесь, а не только в движке: между предложениями не звучит
  // ничего, и пауза Soniox там ничего бы не остановила — следующее
  // предложение заговорило бы поверх «паузы». Поэтому шаг, пришедший на
  // паузе, откладывается до «продолжить».
  const pausedRef = useRef(false)
  const pendingRef = useRef(null)
  const linesRef = useRef(lines)
  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  const stop = useCallback(() => {
    runRef.current++
    pausedRef.current = false
    pendingRef.current = null
    stopAudio()
    setPlaying(false)
    setPaused(false)
    setIndex(-1)
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(
    (from = 0) => {
      const list = linesRef.current
      if (!list || !list.length) return
      runRef.current++
      const my = runRef.current
      pausedRef.current = false
      pendingRef.current = null
      setPlaying(true)
      setPaused(false)
      const step = (i) => {
        if (my !== runRef.current) return
        if (pausedRef.current) {
          pendingRef.current = () => step(i)
          return
        }
        if (i >= list.length) {
          setPlaying(false)
          setIndex(-1)
          return
        }
        setIndex(i)
        speak([list[i]], {}, () => step(i + 1))
        // Следующее предложение синтезируется, пока звучит это: иначе перед
        // каждым была бы лишняя секунда тишины на ещё не озвученном тексте.
        if (i + 1 < list.length) prefetch([list[i + 1]])
      }
      step(from)
    },
    [],
  )

  const pauseResume = useCallback(() => {
    const sy = typeof window !== 'undefined' ? window.speechSynthesis : null
    const was = pausedRef.current
    pausedRef.current = !was
    try {
      // Звучит Soniox — ставим на паузу его; иначе, возможно, дочитывает
      // запасной синтез устройства.
      if (isTtsActive()) {
        if (was) resumeTts()
        else pauseTts()
      } else if (sy) {
        if (was) sy.resume()
        else sy.pause()
      }
    } catch {
      /* движок без pause/resume — кнопка просто не сработает */
    }
    if (was) {
      const next = pendingRef.current
      pendingRef.current = null
      if (next) next()
    }
    setPaused(!was)
  }, [])

  return { playing, paused, index, start, stop, pauseResume }
}
