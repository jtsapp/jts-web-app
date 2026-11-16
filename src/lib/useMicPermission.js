'use client'

// Разрешение на микрофон, которое знает браузер, — живым значением: решать «объяснить и попросить» надо
// синхронно в нажатии (запись и AudioContext будятся в тике жеста, иначе iPhone молчит), а Permissions API
// отвечает промисом. Поэтому состояние спрашивается заранее и обновляется по событию change: ученик разрешил
// в окне браузера или в настройках сайта — плашка в следующий раз уже не нужна.

import { useEffect, useState } from 'react'

/** @returns {'granted'|'denied'|'prompt'|'unknown'} */
export function useMicPermission() {
  const [state, setState] = useState('unknown')
  useEffect(() => {
    let alive = true
    let status = null
    const update = () => {
      if (alive && status) setState(status.state || 'unknown')
    }
    let pending = null
    try {
      pending = globalThis.navigator?.permissions?.query?.({ name: 'microphone' })
    } catch {
      /* браузер не знает имени «microphone» — останется unknown */
    }
    pending
      ?.then?.((st) => {
        if (!alive || !st) return
        status = st
        update()
        st.addEventListener?.('change', update)
      })
      ?.catch?.(() => {})
    return () => {
      alive = false
      status?.removeEventListener?.('change', update)
    }
  }, [])
  return state
}
