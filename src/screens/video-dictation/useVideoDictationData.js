'use client'

// Данные Видеодиктанта с бэкенда: список уроков (/mobile/video-dictation) и урок с фразами
// (/mobile/video-dictation/{slug}). Перезапрос — по ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access меняет
// строку каждые несколько минут, и урок перезагружался бы посреди диктанта (как у Just to Listen).
//
// Статусы: guest — без входа; loading; ready; missing — у списка ручки ещё нет (404) или уроков нет («Раздел
// готовится»), у урока — его скрыли или удалили; empty — урок пройти нельзя (нет ролика или ни одной фразы, прошедшей
// разметку); error — сеть или сервер, есть «Повторить».

import { useCallback, useEffect, useRef, useState } from 'react'
import { getVideoDictationIndex, getVideoDictationLesson } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'
import { phrasesOf } from '../../practice/video-dictation/phrase.js'

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

function useLatest(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

const lessonsOf = (data) =>
  Array.isArray(data?.lessons) ? data.lessons.filter((l) => l && typeof l.slug === 'string' && l.slug) : []

export function useVideoDictationIndex(token) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', lessons: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', lessons: [] })
      return undefined
    }
    let alive = true
    const take = (data) => {
      if (!alive) return
      const lessons = lessonsOf(data)
      setState({ status: lessons.length ? 'ready' : 'missing', lessons })
    }
    setState((s) => (s.lessons.length ? s : { status: 'loading', lessons: [] }))
    getVideoDictationIndex(tk, take)
      .then(take)
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', lessons: [] }))
    return () => {
      alive = false
    }
  }, [owner, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}

export function useVideoDictationLesson(token, slug) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ status: 'idle', lesson: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk || !slug) {
      setState({ status: 'idle', lesson: null })
      return undefined
    }
    let alive = true
    setState({ status: 'loading', lesson: null })
    getVideoDictationLesson(tk, slug)
      .then((data) => {
        if (!alive) return
        const phrases = phrasesOf(data?.segments)
        const usable = VIDEO_ID.test(String(data?.video ?? '')) && phrases.length > 0
        setState(usable ? { status: 'ready', lesson: { ...data, phrases } } : { status: 'empty', lesson: null })
      })
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', lesson: null }))
    return () => {
      alive = false
    }
  }, [owner, slug, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
