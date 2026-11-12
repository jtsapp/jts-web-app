import { useEffect, useState } from 'react'
import { getMyLessonOccurrences } from '../../api.js'
import { otherLiveOccurrence } from '../schedule/liveNow.js'

// Как часто перепроверять расписание, пока на экране не идущий урок. Вкладка
// прошлого урока висит часами, а текущий начинается, когда преподаватель
// нажмёт «Начать»; ученик должен узнать об этом, не уходя со страницы.
export const OTHER_LIVE_POLL_MS = 60_000

/**
 * Урок ученика, который идёт прямо сейчас, если на экране открыт другой.
 *
 * Страница урока открывается по id из адреса (?live=), и F5 возвращает в тот же
 * урок. Вкладка прошлого занятия, оставшаяся на планшете, так и держит прошлое
 * занятие, сколько её ни обновляй (прод 11.11.2026). Хук смотрит расписание
 * ученика и отдаёт идущий урок, чтобы страница предложила в него перейти.
 *
 * `enabled` — только ученику и только пока открытый урок сам не идёт: на
 * идущем уроке спрашивать незачем, а старый незакрытый урок, который тоже
 * числится идущим, уводил бы ученика с правильного занятия.
 */
export function useOtherLiveLesson(lessonId, token, enabled) {
  const [occurrences, setOccurrences] = useState(null)

  useEffect(() => {
    if (!enabled || !token) return undefined
    let alive = true
    const load = () => getMyLessonOccurrences(token)
      .then((list) => { if (alive) setOccurrences(Array.isArray(list) ? list : []) })
      // Расписание не пришло — плашки просто нет, урок на экране работает как прежде.
      .catch(() => {})
    load()
    const timer = setInterval(load, OTHER_LIVE_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [enabled, token])

  return enabled && occurrences ? otherLiveOccurrence(occurrences, lessonId) : null
}
