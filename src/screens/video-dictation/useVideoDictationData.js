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

// Состояние помнит, чьё оно (владелец / владелец+урок). Если ключ не совпал с нынешним — это данные прошлого
// владельца или урока: на этом же рендере отдаём loading, не дожидаясь эффекта.
export function useVideoDictationIndex(token) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ owner, status: token ? 'loading' : 'guest', lessons: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ owner, status: 'guest', lessons: [] })
      return undefined
    }
    let alive = true
    const take = (data) => {
      if (!alive) return
      const lessons = lessonsOf(data)
      setState({ owner, status: lessons.length ? 'ready' : 'missing', lessons })
    }
    // Список прежнего показываем, пока «Повторить» или фон ищут свежий, — но только того же владельца.
    setState((s) => (s.owner === owner && s.lessons.length ? s : { owner, status: 'loading', lessons: [] }))
    getVideoDictationIndex(tk, take)
      .then(take)
      .catch((e) => alive && setState({ owner, status: e?.status === 404 ? 'missing' : 'error', lessons: [] }))
    return () => {
      alive = false
    }
  }, [owner, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const current = state.owner === owner ? state : { status: token ? 'loading' : 'guest', lessons: [] }
  return { status: current.status, lessons: current.lessons, retry }
}

export function useVideoDictationLesson(token, slug) {
  const owner = ownerOf(token)
  const key = `${owner}|${slug ?? ''}`
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ key, status: 'idle', lesson: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk || !slug) {
      setState({ key, status: 'idle', lesson: null })
      return undefined
    }
    let alive = true
    setState({ key, status: 'loading', lesson: null })
    getVideoDictationLesson(tk, slug)
      .then((data) => {
        if (!alive) return
        const phrases = phrasesOf(data?.segments)
        const usable = VIDEO_ID.test(String(data?.video ?? '')) && phrases.length > 0
        // phrases бэкенда — число фраз; в уроке поле теперь хранит разобранные фразы.
        setState(usable ? { key, status: 'ready', lesson: { ...data, phrases } } : { key, status: 'empty', lesson: null })
      })
      .catch((e) => alive && setState({ key, status: e?.status === 404 ? 'missing' : 'error', lesson: null }))
    return () => {
      alive = false
    }
  }, [owner, slug, key, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const current = state.key === key ? state : { status: token && slug ? 'loading' : 'idle', lesson: null }
  return { status: current.status, lesson: current.lesson, retry }
}
