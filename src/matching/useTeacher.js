import { useEffect, useState } from 'react'
import { getMatchingTeacher } from '../api.js'

// Профиль учителя для карточек «Подтвердите расписание» и «Мой учитель» (специализации, опыт, «О себе»): в карточке
// подбора бэкенда есть только имя и id. Ответ кэшируется на вкладку — тот же учитель в окне при входе и на экране.
const cache = new Map()

export function useTeacher(token, id) {
  const [data, setData] = useState(() => (id && cache.get(id)?.value) || null)
  useEffect(() => {
    if (!token || !id) return undefined
    let alive = true
    if (!cache.has(id)) {
      const entry = { value: null }
      entry.promise = getMatchingTeacher(token, id)
        .then((d) => {
          entry.value = d
          return d
        })
        .catch(() => {
          cache.delete(id)
          return null
        })
      cache.set(id, entry)
    }
    cache.get(id).promise.then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [token, id])
  return data
}
