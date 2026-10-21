'use client'

// Данные раздела: оглавление и наборы с бэкенда (/mobile/listen…). Перезапрос
// — по ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access меняет
// строку каждые несколько минут, и экран набора мигал бы «Загружаем…».

import { useCallback, useEffect, useRef, useState } from 'react'
import { getListenIndex, getListenSet } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'

function useLatest(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

export function useListenIndex(token) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', index: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', index: null })
      return undefined
    }
    let alive = true
    setState((s) => (s.index ? s : { status: 'loading', index: null }))
    getListenIndex(tk, (fresh) => alive && setState({ status: 'ready', index: fresh }))
      .then((index) => alive && setState({ status: 'ready', index }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', index: null }))
    return () => {
      alive = false
    }
  }, [owner, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}

export function useListenSet(token, id) {
  const owner = ownerOf(token)
  const tokenRef = useLatest(token)
  const [state, setState] = useState({ status: 'idle', set: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const tk = tokenRef.current
    if (!tk || !id) {
      setState({ status: 'idle', set: null })
      return undefined
    }
    let alive = true
    setState({ status: 'loading', set: null })
    getListenSet(tk, id, (fresh) => alive && setState({ status: 'ready', set: fresh }))
      .then((set) => alive && setState({ status: 'ready', set }))
      .catch(() => alive && setState({ status: 'error', set: null }))
    return () => {
      alive = false
    }
  }, [owner, id, attempt, tokenRef])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
