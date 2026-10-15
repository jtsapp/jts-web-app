import { useCallback, useState } from 'react'
import { markGeTaskDone } from '../../api.js'
import { taskAction } from './planModel.js'

/**
 * Кнопка задачи плана — общая для «Сегодня» и экрана «План»: переход по taskAction или отметка своего задания
 * преподавателя с перечитыванием плана. Сбой отметки виден (markFailed): иначе ученик жал бы кнопку снова и снова, думая,
 * что она не работает. Следующая попытка сообщение снимает.
 * @returns {{ start: (task) => void, markFailed: boolean }}
 */
export function useGeTaskStart({ token, level, onNav, reload }) {
  const [markFailed, setMarkFailed] = useState(false)
  const start = useCallback(
    (task) => {
      const a = taskAction(task, level)
      if (!a) return
      if (a.type === 'done') {
        setMarkFailed(false)
        markGeTaskDone(token, task.id, true)
          .then(() => reload?.())
          .catch((e) => {
            console.warn('[ge.plan] не удалось отметить задание', e)
            setMarkFailed(true)
          })
        return
      }
      if (a.payload) onNav?.(a.to, a.payload)
      else onNav?.(a.to)
    },
    [token, level, onNav, reload],
  )
  return { start, markFailed }
}
