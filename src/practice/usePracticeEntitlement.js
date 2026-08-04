import { useEffect, useState } from 'react'

// "Могу ли я открыть этот раздел практики прямо сейчас" — спрашивает сервер
// (см. /api/practice/entitlement) один раз при монтировании. Пока идёт запрос
// или он не удался — allowed:true (fail-open, тот же принцип, что и у лимита
// AI-тьютора: сбой сети/бэкенда не должен запирать обычного пользователя).
// Отсутствие токена (гость) — тоже allowed:true, квоты гостей не касаются.
export function usePracticeEntitlement(moduleName, token) {
  const [state, setState] = useState({ loading: true, allowed: true, limit: null, completed: 0 })

  useEffect(() => {
    if (!token) {
      setState({ loading: false, allowed: true, limit: null, completed: 0 })
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
        })
      })
      .catch(() => {
        if (alive) setState({ loading: false, allowed: true, limit: null, completed: 0 })
      })
    return () => { alive = false }
  }, [moduleName, token])

  return state
}
