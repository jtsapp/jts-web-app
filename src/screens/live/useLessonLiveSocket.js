import { useCallback, useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// Живая координация урока помимо доски: «Внимание на упражнение» (focus),
// зеркалирование действий студента внутри материала (mirror), проигрывание
// потока действий учителя студенту (present), сигнал «список разделов
// изменился» (sectionsChanged). Порт web-admin'овского LessonLiveSocketService
// на голый @stomp/stompjs — тот же brokerURL/connectHeaders, что и в
// useLessonPresence.js. Колбэки передаются параметром (как в useLessonBoard),
// чтобы не плодить лишний React-стейт здесь — событие пришло, вызвали и всё.
// Брокер рассылает публикацию всем подписчикам топика, включая самого
// отправителя — focus/present сравнивают senderUserId с selfUserId и глушат
// собственное эхо (тот же приём, что и в useLessonBoard).
export function useLessonLiveSocket(lessonId, token, selfUserId, { onFocus, onMirror, onPresent, onSectionsChanged } = {}) {
  const clientRef = useRef(null)
  // Колбэки кладём в ref, чтобы не пересоздавать STOMP-соединение при каждом
  // ре-рендере родителя (у него activeSectionId и т.п. меняются часто).
  const handlersRef = useRef({ onFocus, onMirror, onPresent, onSectionsChanged })
  useEffect(() => { handlersRef.current = { onFocus, onMirror, onPresent, onSectionsChanged } })

  useEffect(() => {
    if (!lessonId || !token) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/lesson/${lessonId}/focus`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onFocus?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/material-mirror`, (m) => {
          const evt = parse(m.body)
          if (evt) handlersRef.current.onMirror?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/present`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onPresent?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/sections-changed`, () => {
          handlersRef.current.onSectionsChanged?.()
        })
      },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate(); clientRef.current = null }
  }, [lessonId, token, selfUserId])

  const publish = useCallback((action, body) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({ destination: `/app/lesson/${lessonId}/${action}`, body: JSON.stringify(body) })
  }, [lessonId])

  // Учитель: указать всем, на какой раздел/материал смотреть.
  const sendFocus = useCallback((sectionId, materialId) => publish('focus', { sectionId, materialId }), [publish])
  // Студент: передать одно захваченное действие внутри материала.
  const sendMirror = useCallback((materialId, event) => publish('material-mirror', { materialId, ...event }), [publish])
  // Учитель: передать пачку своих действий, чтобы студенты повторили их у себя.
  const sendPresent = useCallback((materialId, events) => publish('present', { materialId, events }), [publish])

  return { sendFocus, sendMirror, sendPresent }
}

function parse(body) {
  try { return JSON.parse(body) } catch { return null }
}
