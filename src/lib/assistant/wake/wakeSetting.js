// Включён ли позывной Луны — настройка УСТРОЙСТВА, а не профиля: модель (45 МБ в
// IndexedDB) и разрешение на микрофон — тоже вещи устройства. useSyncExternalStore:
// на сервере и при гидратации позывной выключен, расхождения разметки нет.
import { useSyncExternalStore } from 'react'

export const WAKE_KEY = 'jts_luna_wake'
const listeners = new Set()
// Приватный режим не даёт писать в localStorage — выбор живёт в памяти до перезагрузки.
let override = null

export function readWakeOn() {
  if (override !== null) return override
  try {
    return localStorage.getItem(WAKE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeWakeOn(on) {
  override = Boolean(on)
  try {
    if (on) localStorage.setItem(WAKE_KEY, '1')
    else localStorage.removeItem(WAKE_KEY)
  } catch {
    /* приватный режим — см. override */
  }
  for (const fn of listeners) fn()
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Включён ли позывной на этом устройстве. */
export const useWakeOn = () => useSyncExternalStore(subscribe, readWakeOn, () => false)
