'use client'

// Каталог Cartoon World с бэкенда (/mobile/cartoons). Перезапрос — по ВЛАДЕЛЬЦУ
// токена, а не по строке: тихое обновление access меняет строку каждые несколько
// минут, и движок пересоздавался бы посреди миссии.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getCartoons } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'

export function useCartoonsData(token) {
  const owner = ownerOf(token)
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
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
    // Свежая копия — новый релиз или перепроверка видео (новый checkedAt); та же — движок не трогаем.
    const same = (a, b) => a && b && a.release === b.release && a.checkedAt === b.checkedAt
    const fresh = (x) => alive && setState((s) => (same(s.index, x) ? s : { status: 'ready', index: x }))
    getCartoons(tk, fresh)
      .then((x) => alive && setState({ status: 'ready', index: x }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', index: null }))
    return () => {
      alive = false
    }
  }, [owner, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
