'use client'

import { useCallback, useEffect, useState } from 'react'
import { getGroupState } from '../api.js'

/**
 * Состояние ученика в «Наборе групп»: его запись, листы ожидания. `status`: loading → ready, а если на стенде нет ручки
 * (старый бэкенд) или она закрыта — unavailable: экран тогда пишет «скоро появится», а не показывает ошибку.
 * Действия возвращают свежее состояние сами, поэтому после них хватает `apply`, без второго запроса.
 */
export function useGroupState(token) {
  const [snap, setSnap] = useState({ status: 'loading', state: null })

  const reload = useCallback(async () => {
    if (!token) return
    try {
      const state = await getGroupState(token)
      setSnap(state ? { status: 'ready', state } : { status: 'unavailable', state: null })
    } catch {
      setSnap((prev) => (prev.status === 'ready' ? prev : { status: 'unavailable', state: null }))
    }
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  const apply = useCallback((state) => {
    if (state) setSnap({ status: 'ready', state })
  }, [])

  return { ...snap, reload, apply }
}
