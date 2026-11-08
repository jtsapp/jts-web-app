'use client'

// «Память Луны» в Профиле (ТЗ v2.0, 8.1): что Луна запомнила об ученике (метка [[REMEMBER …]], lib/assistant/facts.js),
// и удаление любого факта. Сервер — /api/profile/luna-memory. Без базы на стенде (configured: false) блока нет вовсе:
// пустой список читался бы как «Луна ничего не помнит», хотя помнить ей негде.

import { useCallback, useEffect, useState } from 'react'

const URL = '/api/profile/luna-memory'

/** @returns {{ status: 'loading'|'ready'|'off', facts: {id: string, fact: string, expiresAt: string}[], remove: (id: string) => Promise<void> }} */
export function useLunaMemory(token, enabled = true) {
  const [state, setState] = useState({ status: 'loading', facts: [] })
  const on = Boolean(enabled && token)
  useEffect(() => {
    if (!on) return undefined
    let alive = true
    fetch(URL, { headers: { authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState(d?.configured ? { status: 'ready', facts: Array.isArray(d.facts) ? d.facts : [] } : { status: 'off', facts: [] }))
      .catch(() => alive && setState({ status: 'off', facts: [] }))
    return () => {
      alive = false
    }
  }, [on, token])

  // Удаляем сразу на экране: факт — не данные, которые жалко потерять, а ждать сервер ради строки незачем.
  const remove = useCallback(
    async (id) => {
      setState((s) => ({ ...s, facts: s.facts.filter((f) => f.id !== id) }))
      await fetch(`${URL}?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }).catch(() => {})
    },
    [token],
  )

  return { ...(on ? state : { status: 'off', facts: [] }), remove }
}
