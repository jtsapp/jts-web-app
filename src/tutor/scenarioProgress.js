import { useEffect, useState } from 'react'
import { loadToken } from '../lib/session.js'
import { getDeviceId } from '../lib/identity.js'

// Локальная отмычка: NEXT_PUBLIC_SCENARIOS_NO_LOCK=1 открывает все сценарии,
// чтобы их можно было тестировать в любом порядке, не проходя цепочку. Как
// VOICE_NO_LIMIT у токен-роута. NEXT_PUBLIC_ вшивается в бандл на сборке —
// значения секретного тут нет, только флаг.
export const NO_LOCK =
  process.env.NEXT_PUBLIC_SCENARIOS_NO_LOCK === '1' ||
  process.env.NEXT_PUBLIC_SCENARIOS_NO_LOCK === 'true'

/**
 * Слаги сценариев, сданных этим учеником. Источник — lesson_progress: голосовой
 * агент по концовке сцены зовёт report_task_complete, тот пишет строку через
 * /api/lesson/complete (lesson_key = scenarioId), а GET /api/profile её отдаёт.
 * Отдельного хранилища для этого не нужно.
 *
 * Возвращает null, пока прогресс не прочитан ИЛИ если прочитать не удалось (нет
 * БД, сеть, 401). Замок — подсказка по сюжету, а не защита, поэтому при
 * неизвестном прогрессе открываем всё: лучше пустить дальше, чем запереть
 * человека из-за неподнятой базы.
 */
export function usePassedScenarios() {
  const [passed, setPassed] = useState(null)

  useEffect(() => {
    if (NO_LOCK) return
    let cancelled = false

    ;(async () => {
      try {
        const token = loadToken()
        const res = await fetch(`/api/profile?deviceId=${encodeURIComponent(getDeviceId())}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return // 503 без БД, 401 — оставляем null, всё открыто
        const data = await res.json().catch(() => null)
        if (cancelled || !data?.configured) return
        // Ответ получен — прогресс известен. profile === null означает «ученика в
        // базе ещё нет», то есть не сдано НИЧЕГО; это не то же самое, что
        // «прочитать не удалось», и запирать тут правильно.
        const lessons = Array.isArray(data.profile?.lessons) ? data.profile.lessons : []
        setPassed(
          new Set(lessons.filter((l) => l.status === 'passed').map((l) => l.lessonKey)),
        )
      } catch {
        // сеть отвалилась — тоже открываем всё
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return passed
}
