import { useEffect, useState } from 'react'

// "Могу ли я открыть этот раздел практики прямо сейчас" — спрашивает сервер
// (см. /api/practice/entitlement) один раз при монтировании. Пока идёт запрос
// или он не удался — allowed:true (fail-open, тот же принцип, что и у лимита
// AI-тьютора: сбой сети/бэкенда не должен запирать обычного пользователя).
// Отсутствие токена (гость) — тоже allowed:true, квоты гостей не касаются.
/** То же самое для IELTS: попытки в месяц считаются не по practice-стейту, а по
 *  строкам сданных секций, поэтому у него свой роут (/api/ielts/entitlement).
 *  Тот же fail-open: пока грузим или если запрос не удался — allowed:true. */
export function useIeltsEntitlement(token) {
  const [state, setState] = useState({
    loading: true, allowed: true, limit: null, used: 0, source: 'NONE', sourceName: null,
  })

  useEffect(() => {
    if (!token) {
      setState({ loading: false, allowed: true, limit: null, used: 0, source: 'NONE', sourceName: null })
      return undefined
    }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetch('/api/ielts/entitlement', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return
        setState({
          loading: false,
          allowed: data ? data.allowed !== false : true,
          limit: data?.limit ?? null,
          used: data?.used ?? 0,
          source: data?.source || 'NONE',
          sourceName: data?.sourceName || null,
        })
      })
      .catch(() => {
        if (alive) setState({ loading: false, allowed: true, limit: null, used: 0, source: 'NONE', sourceName: null })
      })
    return () => { alive = false }
  }, [token])

  return state
}

export function usePracticeEntitlement(moduleName, token) {
  const [state, setState] = useState({
    loading: true, allowed: true, limit: null, completed: 0, source: 'NONE', sourceName: null,
  })

  useEffect(() => {
    if (!token) {
      setState({ loading: false, allowed: true, limit: null, completed: 0, source: 'NONE', sourceName: null })
      return undefined
    }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetch(`/api/practice/entitlement?module=${encodeURIComponent(moduleName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return
        setState({
          loading: false,
          allowed: data ? data.allowed !== false : true,
          limit: data?.limit ?? null,
          completed: data?.completed ?? 0,
          source: data?.source || 'NONE',
          sourceName: data?.sourceName || null,
        })
      })
      .catch(() => {
        if (alive) setState({ loading: false, allowed: true, limit: null, completed: 0, source: 'NONE', sourceName: null })
      })
    return () => { alive = false }
  }, [moduleName, token])

  return state
}
