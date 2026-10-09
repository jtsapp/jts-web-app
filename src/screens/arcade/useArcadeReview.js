import { useCallback, useEffect, useRef, useState } from 'react'
import { requestReview } from '../../practice/arcade/reviewClient.js'

// Состояние ИИ-разбора текущего раунда:
// idle → loading → done | error. Одновременно идёт не больше одного запроса;
// reset() начинает новый раунд — запрос в полёте отменяется, его ответ
// игнорируется. `budget` — последний известный остаток на сегодня.
export function useArcadeReview(token) {
  const [state, setState] = useState({ status: 'idle' })
  const [budget, setBudget] = useState(null)
  const running = useRef(null)

  const reset = useCallback(() => {
    running.current?.abort()
    running.current = null
    setState({ status: 'idle' })
  }, [])
  useEffect(() => () => running.current?.abort(), [])

  const review = useCallback(
    async (round) => {
      if (running.current || !token) return
      const controller = new AbortController()
      running.current = controller
      setState({ status: 'loading' })
      try {
        const res = await requestReview(round, token, controller.signal)
        if (controller.signal.aborted) return
        if (res.budget) setBudget(res.budget)
        setState({ status: 'done', review: res.review })
      } catch (e) {
        if (controller.signal.aborted) return
        if (e.budget) setBudget(e.budget)
        setState({ status: 'error', code: e.code || 'review_failed' })
      } finally {
        if (running.current === controller) running.current = null
      }
    },
    [token],
  )

  return { state, budget, setBudget, review, reset }
}
