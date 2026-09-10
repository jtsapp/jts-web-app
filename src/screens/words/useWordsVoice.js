'use client'

// Голос раздела. Синтеза здесь НЕТ и быть не должно: слово звучит только своей
// записью. Так в прототипе, и это не косметика — упражнение проверяет слух, а
// браузерный синтез читает «bass» и «bat» мимо, и учит не тому.
// Если запись не проигралась, кнопка повтора мигает, и человек пробует ещё раз.

import { useCallback, useEffect, useRef, useState } from 'react'
import { audioUrl } from '../../practice/words/assets.js'

export default function useWordsVoice() {
  const cache = useRef(new Map())
  const active = useRef(null)
  const timer = useRef(null)
  // Счётчик поколений: у каждого play свой номер, и обработчик просроченного
  // воспроизведения не гасит индикатор уже начавшегося следующего.
  const gen = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [failedAt, setFailedAt] = useState(0)

  const element = useCallback((wordId) => {
    if (cache.current.has(wordId)) return cache.current.get(wordId)
    if (typeof Audio === 'undefined') return null
    const el = new Audio()
    el.preload = 'auto'
    el.src = audioUrl(wordId)
    cache.current.set(wordId, el)
    return el
  }, [])

  const stop = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = null
    gen.current++
    const el = active.current
    if (el) {
      try {
        el.pause()
        el.currentTime = 0
      } catch {
        /* элемент мог не успеть загрузиться — гасить нечего */
      }
      active.current = null
    }
    setPlaying(false)
  }, [])

  const play = useCallback(
    (word) => {
      if (!word) return
      stop()
      const my = gen.current
      const el = element(word.id)
      if (!el) {
        setFailedAt(Date.now())
        return
      }
      active.current = el
      el.onended = () => {
        if (my === gen.current) {
          active.current = null
          setPlaying(false)
        }
      }
      let p
      try {
        p = el.play()
      } catch (e) {
        p = Promise.reject(e)
      }
      if (p && p.then) {
        p.then(() => {
          if (my === gen.current) setPlaying(true)
        }).catch((err) => {
          if (my !== gen.current) return
          setPlaying(false)
          // Автоплей до первого касания страницы браузер не пускает, и это НЕ
          // сломанная запись: раскрашивать кнопку «нет файла» здесь значит
          // встречать каждого новичка красной кнопкой на пустом месте.
          // Красим только настоящий отказ медиа.
          if (err && err.name === 'NotAllowedError') return
          setFailedAt(Date.now())
        })
      }
    },
    [element, stop],
  )

  /** Отложенное произнесение. `valid` спрашивают в момент старта: раунд мог смениться. */
  const schedule = useCallback(
    (word, delay, valid) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        if (!valid || valid()) play(word)
      }, delay || 0)
    },
    [play],
  )

  /** Заранее тянет записи раунда: пауза перед первым словом читается как поломка. */
  const preload = useCallback(
    (words) => {
      for (const w of words || []) {
        const el = element(w.id)
        if (el) el.load()
      }
    },
    [element],
  )

  // Уходя с экрана, глушим звук: иначе слово доигрывается уже в каталоге.
  useEffect(() => () => stop(), [stop])

  return { play, schedule, stop, preload, playing, failedAt }
}
