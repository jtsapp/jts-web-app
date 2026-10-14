import { useCallback, useEffect, useState } from 'react'
import { getGePlan } from '../../api.js'
import { loadCourseFrontier } from './courseFrontier.js'

/**
 * План по дням общего курса и тропа для подписей уроков. status: 'loading' | 'ready' (план пришёл, его state может быть
 * и не 'ready' — тогда экран объясняет, чего не хватает) | 'none' (ручки нет или ошибка — экран остаётся прежним).
 * Тропа грузится, только если в плане есть уроки курса: у группы и индивидуальных их нет вовсе.
 */
export function useGePlan(token, { enabled = true, level = null } = {}) {
  const [state, setState] = useState({ status: 'loading', plan: null, frontier: [] })
  const [n, setN] = useState(0)

  const off = !enabled || !token
  useEffect(() => {
    if (off) return undefined
    let alive = true
    ;(async () => {
      const plan = await getGePlan(token)
      if (!alive) return
      // план показываем сразу: подписи уроков — украшение, и медленный прогресс курса не должен держать экран. Пустой
      // ответ на ПЕРЕчитывании (после переноса или отметки) — сетевая осечка, а не «ручки нет»: прежний план остаётся,
      // иначе «Сегодня» подменялось бы прежней карточкой, а экран «План» — ошибкой
      setState((prev) => {
        if (plan) return { status: 'ready', plan, frontier: prev.frontier }
        return prev.plan ? prev : { status: 'none', plan: null, frontier: [] }
      })
      if (!plan?.tasks?.some((x) => x.kind === 'course')) return
      const frontier = await loadCourseFrontier(level, token)
      if (alive) setState((prev) => (prev.plan === plan ? { ...prev, frontier } : prev))
    })()
    return () => {
      alive = false
    }
  }, [token, off, level, n])

  const reload = useCallback(() => setN((x) => x + 1), [])
  // выключенный план — сразу «нет», без setState в эффекте
  return { ...(off ? { status: 'none', plan: null, frontier: [] } : state), reload }
}
