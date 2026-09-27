import { useCallback, useEffect, useRef, useState } from 'react'
import { getLiveState } from '../../api.js'

const NO_STATE = { lessonId: null, state: null, offset: 0 }

/**
 * Состояние живого занятия, которое хранит сервер (спека
 * live-lesson-server-state §6–§7): где класс, ведёт ли преподаватель, стадия,
 * таймер, статус.
 *
 * Раньше «где сейчас класс» знали только открытые вкладки: ученик после F5 или
 * вошедший позже не знал ни позиции, ни таймера, пока преподаватель снова не
 * нажмёт «Внимание». Теперь состояние приходит двумя путями — снимком
 * `GET …/live-state` на каждом (пере)подключении и рассылкой канала `state`, —
 * и ни один не обязан прийти первым. Порядок наводит номер версии: применяется
 * только то, что новее уже применённого, остальное отбрасывается целиком.
 *
 * Сокет здесь не открывается: канал `state` живёт в том же STOMP-клиенте, что и
 * остальное живое (useLessonLiveSocket). Отсюда в него уходят `onState` и
 * `onConnect` — второй зовётся после всех подписок, поэтому снимок всегда
 * берётся уже подписанным.
 *
 * `onApply(next, prev, offset)` — на КАЖДОЕ применённое состояние. Переходы
 * (ведение снято, выросла указка) нужны странице парой prev→next, а батч React
 * схлопнул бы два состояния, пришедших в одном тике, в одно.
 * `onSnapshot(state)` — после каждого ответа снимка, даже не принёсшего нового:
 * это точка «только что (пере)подключился», на ней ученик просит догнать класс.
 *
 * `offset` — поправка часов: `serverNowMs − Date.now()` в момент получения.
 * Таймер и конец паузы считаются по времени сервера — часы ученика могут
 * отставать на минуты.
 */
export function useLessonLiveState(lessonId, token, { onApply, onSnapshot } = {}) {
  // Применённое помнит своё занятие: экран урока не пересоздаётся при смене
  // lessonId (App.jsx), и чужое состояние отсекается сравнением, а не сбросом
  // через setState в эффекте (каскад рендеров).
  const [applied, setApplied] = useState(NO_STATE)
  const appliedRef = useRef(NO_STATE)
  // Какое занятие открыто сейчас — для ответа снимка, который пришёл, когда
  // экран уже на другом уроке или закрыт.
  const lessonRef = useRef(lessonId)
  useEffect(() => {
    lessonRef.current = lessonId
    return () => { lessonRef.current = null }
  }, [lessonId])
  const handlersRef = useRef({ onApply, onSnapshot })
  useEffect(() => { handlersRef.current = { onApply, onSnapshot } })

  const onState = useCallback((incoming) => {
    if (!incoming || typeof incoming.version !== 'number') return
    const current = appliedRef.current.lessonId === lessonId ? appliedRef.current : { ...NO_STATE, lessonId }
    if (current.state && incoming.version <= current.state.version) return
    const offset = Number.isFinite(incoming.serverNowMs) ? incoming.serverNowMs - Date.now() : current.offset
    const next = { lessonId, state: incoming, offset }
    appliedRef.current = next
    setApplied(next)
    handlersRef.current.onApply?.(incoming, current.state, offset)
  }, [lessonId])

  const onConnect = useCallback(() => {
    if (!lessonId || !token) return
    getLiveState(token, lessonId)
      .then((snapshot) => {
        if (lessonRef.current !== lessonId) return
        onState(snapshot)
        const current = appliedRef.current
        handlersRef.current.onSnapshot?.(current.lessonId === lessonId ? current.state : null)
      })
      // Старый бэкенд канала ещё не знает — экран живёт без состояния, как раньше.
      .catch(() => {})
  }, [lessonId, token, onState])

  const own = applied.lessonId === lessonId
  return {
    state: own ? applied.state : null,
    offset: own ? applied.offset : 0,
    onState,
    onConnect,
  }
}
