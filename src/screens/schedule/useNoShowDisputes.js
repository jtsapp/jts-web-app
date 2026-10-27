import { useCallback, useEffect, useState } from 'react'
import { disputeNoShow, getMyNoShowDisputes } from '../../api.js'
import { roleFromToken } from '../../lib/jwt.js'

const EMPTY = { disputable: new Map(), disputed: new Map() }

/**
 * Отметки «не пришёл», которые ученик ещё может оспорить (сервер считает 24 часа и отдаёт срок), и его заявки со
 * статусом. Только ученику: у преподавателя и гостя оспаривать нечего, и запрос был бы 403.
 */
export function useNoShowDisputes(token) {
  const [state, setState] = useState(EMPTY)
  const student = roleFromToken(token) === 'STUDENT'

  const load = useCallback(() => {
    if (!token || !student) return Promise.resolve()
    return getMyNoShowDisputes(token)
      .then((data) => setState({
        disputable: new Map((data?.disputable || []).map((d) => [String(d.lessonId), d.deadline])),
        disputed: new Map((data?.items || []).map((d) => [String(d.lessonId), d.status])),
      }))
      .catch(() => setState(EMPTY))
  }, [token, student])

  useEffect(() => { load() }, [load])

  /** Отправить причину; после ответа список перечитывается — кнопка сменится на «Оспорено». */
  const raise = useCallback(
    (lessonId, reason) => disputeNoShow(token, lessonId, reason).then(load),
    [token, load],
  )

  return { ...state, raise }
}
