import { useCallback, useState } from 'react'
import { markGeTaskDone } from '../../api.js'
import { taskAction } from './planModel.js'

/**
 * Кнопка задачи плана — общая для «Сегодня» и экрана «План»: переход по taskAction или отметка своего задания
 * преподавателя с перечитыванием плана. Сбой отметки виден (markFailed): иначе ученик жал бы кнопку снова и снова, думая,
 * что она не работает. Следующая попытка сообщение снимает.
 * lessons — id задачи урока курса → код шага тропы (courseLessons): «Начать» открывает сам урок.
 * targets — id задачи → цель перехода к конкретному материалу (taskTargets, «Сегодня» на «Главной», ТЗ v2.0 5.3):
 * следующий урок воркбука, текст «Чтения», урок шэдоуинга. Нет цели — прежний taskRoute в раздел.
 * @returns {{ start: (task) => void, markFailed: boolean }}
 */
export function useGeTaskStart({ token, level, onNav, reload, lessons = null, targets = null }) {
  const [markFailed, setMarkFailed] = useState(false)
  const start = useCallback(
    (task) => {
      const a = taskAction(task, level, lessons?.[task.id] || null)
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
      const target = targets?.[task.id]
      const to = target?.to || a.to
      const payload = target ? target.payload : a.payload
      if (payload) onNav?.(to, payload)
      else onNav?.(to)
    },
    [token, level, onNav, reload, lessons, targets],
  )
  return { start, markFailed }
}
