import { useRef, useState } from 'react'
import { deleteMyAccount } from '../../api.js'

// Ключ словаря для отказа DELETE /user/me. Свой текст, а не сообщение бэкенда: оно английское и про сотрудников
// пишет языком админки. 404 — стенд со старым бэкендом, где ручки ещё нет: кнопку не прячем (удаление — требование
// App Store), а честно говорим, что сейчас удалить нельзя.
export function deletionErrorKey(err) {
  const status = err?.status
  if (status === 403) return 'profile.delete.errStaff'
  if (status === 404 || status === 405) return 'profile.delete.errUnavailable'
  if (!status) return 'profile.delete.errNetwork'
  return 'profile.delete.errServer'
}

/**
 * Удаление аккаунта одним запросом. Повторное нажатие, пока запрос в пути, ничего не шлёт: ref, а не состояние —
 * два клика в одном кадре успели бы оба прочитать «не занято». После успеха кнопка остаётся занятой: экран сейчас
 * уйдёт на «Аккаунт удалён», а второй DELETE ушёл бы с токеном уже удалённого аккаунта.
 */
export function useAccountDeletion(token, onDeleted) {
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await deleteMyAccount(token)
    } catch (e) {
      busyRef.current = false
      setBusy(false)
      setError(deletionErrorKey(e))
      return
    }
    onDeleted?.()
  }

  function reset() {
    if (busyRef.current) return
    setError('')
  }

  return { busy, error, run, reset }
}
