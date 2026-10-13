import { useCallback } from 'react'
import { markGeTaskDone } from '../../api.js'
import { taskAction } from './planModel.js'

/**
 * Кнопка задачи плана — общая для «Сегодня» и экрана «План»: переход по taskAction или отметка своего задания
 * преподавателя с перечитыванием плана. Сбой отметки тихий: задача останется открытой, и ученик нажмёт ещё раз.
 */
export function useGeTaskStart({ token, level, onNav, reload }) {
  return useCallback(
    (task) => {
      const a = taskAction(task, level)
      if (!a) return
      if (a.type === 'done') {
        markGeTaskDone(token, task.id, true)
          .then(() => reload?.())
          .catch((e) => console.warn('[ge.plan] не удалось отметить задание', e))
        return
      }
      if (a.payload) onNav?.(a.to, a.payload)
      else onNav?.(a.to)
    },
    [token, level, onNav, reload],
  )
}
