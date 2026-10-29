'use client'

// Бандл Pronunciation World с бэкенда (/mobile/pronunciation). Перезапрос — по
// ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access меняет строку каждые
// несколько минут, и движок пересоздавался бы посреди раунда. Кэш — только в
// памяти вкладки (cachedAuthGet: ответ больше порога localStorage).

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPronunciation } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'

export function usePronunciationData(token) {
  const owner = ownerOf(token)
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', bundle: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', bundle: null })
      return undefined
    }
    let alive = true
    setState((s) => (s.bundle ? s : { status: 'loading', bundle: null }))
    // Свежая копия с другим release (методист перезалил курс) — новый бандл; тот же — не трогаем движок.
    const fresh = (b) => alive && setState((s) => (s.bundle && s.bundle.release === b?.release ? s : { status: 'ready', bundle: b }))
    getPronunciation(tk, fresh)
      .then((b) => alive && setState({ status: 'ready', bundle: b }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', bundle: null }))
    return () => {
      alive = false
    }
  }, [owner, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
