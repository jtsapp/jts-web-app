'use client'

import { useCallback, useEffect, useState } from 'react'
import { dropContractsCache, getMyContracts } from '../api.js'
import { toSignCount } from './contractLogic.js'

/**
 * Договоры человека: `status` loading → ready, а если на стенде ручки нет (старый бэкенд) — unavailable, и экран пишет
 * «скоро появится», а не ошибку. Метода может не быть в подменённом api.js (тесты экранов): тогда меню остаётся без счётчика.
 */
export function useContracts(token) {
  const [snap, setSnap] = useState({ status: 'loading', items: [], toSign: 0 })

  const load = useCallback(async (fresh) => {
    if (!token) return
    try {
      if (fresh) dropContractsCache()
      const mine = await getMyContracts(token)
      setSnap(mine ? { status: 'ready', items: mine.items || [], toSign: toSignCount(mine) } : { status: 'unavailable', items: [], toSign: 0 })
    } catch {
      setSnap((prev) => (prev.status === 'ready' ? prev : { status: 'unavailable', items: [], toSign: 0 }))
    }
  }, [token])

  useEffect(() => {
    load(false)
  }, [load])

  return { ...snap, reload: () => load(true) }
}

/** Только число для значка у пункта меню; без ответа сервера — ноль, чтобы меню не мигало. */
export function useContractsBadge(token) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!token) return undefined
    let alive = true
    try {
      Promise.resolve(getMyContracts(token)).then((mine) => {
        if (alive) setCount(toSignCount(mine))
      }).catch(() => {})
    } catch {
      /* без ответа — без значка */
    }
    return () => {
      alive = false
    }
  }, [token])
  return count
}
