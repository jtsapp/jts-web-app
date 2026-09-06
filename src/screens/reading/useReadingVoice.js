'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { speak, stopAudio } from '../../practice/workbook/voice.js'

// Озвучка текста с подсветкой текущего предложения (ttsStart/ttsNext прототипа,
// jtsreading.html:613–626). Синтез берём готовый — из воркбука: там уже решён
// подбор голоса (иначе Windows/Android читают eSpeak'ом), интонация и сторож
// зависших очередей. Читаем ПО ПРЕДЛОЖЕНИЮ, а не всё разом: очередь целиком
// не даёт узнать, где движок сейчас, а подсветка — половина смысла озвучки.
export default function useReadingVoice(lines) {
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(-1)
  // Поколение: каждый новый запуск/стоп обесценивает колбэки предыдущего —
  // без этого «стоп, потом старт» доигрывал старую очередь поверх новой.
  const runRef = useRef(0)
  const linesRef = useRef(lines)
  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  const stop = useCallback(() => {
    runRef.current++
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
      setPlaying(true)
      setPaused(false)
      const step = (i) => {
        if (my !== runRef.current) return
        if (i >= list.length) {
          setPlaying(false)
          setIndex(-1)
          return
        }
        setIndex(i)
        speak([list[i]], {}, () => step(i + 1))
      }
      step(from)
    },
    [],
  )

  const pauseResume = useCallback(() => {
    const sy = typeof window !== 'undefined' && window.speechSynthesis
    if (!sy) return
    setPaused((was) => {
      try {
        if (was) sy.resume()
        else sy.pause()
      } catch {
        /* движок без pause/resume — кнопка просто не сработает */
      }
      return !was
    })
  }, [])

  return { playing, paused, index, start, stop, pauseResume }
}
