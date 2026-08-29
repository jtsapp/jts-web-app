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
// `isStaff` — подписываться ли на учительский канал шагов. Работа ученика идёт
// не в общий топик урока, а в `.../step-progress/staff`: иначе в групповом
// занятии браузер каждого ученика получал бы ответы всех остальных (рисовать
// он их не станет, но данные были бы уже на устройстве).
export function useLessonLiveSocket(lessonId, token, selfUserId, { onFocus, onMirror, onPresent, onSectionsChanged, onStepProgress, onAnswerCorrection, onAnswerReset, onAudioBroadcast, onTimer, onCall, onWatch, isStaff = false } = {}) {
  const clientRef = useRef(null)
  // Колбэки кладём в ref, чтобы не пересоздавать STOMP-соединение при каждом
  // ре-рендере родителя (у него activeSectionId и т.п. меняются часто).
  const handlersRef = useRef({ onFocus, onMirror, onPresent, onSectionsChanged, onStepProgress, onAnswerCorrection, onAnswerReset, onAudioBroadcast, onTimer, onCall, onWatch })
  useEffect(() => { handlersRef.current = { onFocus, onMirror, onPresent, onSectionsChanged, onStepProgress, onAnswerCorrection, onAnswerReset, onAudioBroadcast, onTimer, onCall, onWatch } })

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
        // Учитель транслирует аудио всему классу ("Транслировать классу") — лесson-wide
        // топик, как и позиция учителя в step-progress. Своё эхо глушим тем же приёмом,
        // что и focus/present: у teacher-клиента звук уже играет локально по клику.
        client.subscribe(`/topic/lesson/${lessonId}/audio`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onAudioBroadcast?.(evt)
        })
        // Таймер урока: преподаватель включил отсчёт — он идёт и у ученика.
        // Своё эхо глушим, как у focus/present: у преподавателя таймер уже тикает
        // локально с момента нажатия, и повторный запуск сбросил бы ему секунды.
        client.subscribe(`/topic/lesson/${lessonId}/timer`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onTimer?.(evt)
        })
        // Урок каталога, открытый шагами: где стоит собеседник и что он ответил.
        // Своё эхо глушим здесь же — иначе ответ ученика вернулся бы ему извне и
        // перетёр то, что он печатает прямо сейчас.
        const onStep = (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onStepProgress?.(evt)
        }
        // Общий топик несёт позицию преподавателя — она нужна всему классу.
        client.subscribe(`/topic/lesson/${lessonId}/step-progress`, onStep)
        // Работа учеников адресована преподавателю, и подписан на неё только он.
        if (isStaff) client.subscribe(`/topic/lesson/${lessonId}/step-progress/staff`, onStep)
        // Учитель поправил мой ответ — канал персональный, свой senderUserId тут
        // сравнивать не с чем (учитель не путает себя с учеником), эхо-фильтр не нужен.
        if (!isStaff && selfUserId != null) {
          client.subscribe(`/topic/lesson/${lessonId}/answer-correction/${selfUserId}`, (m) => {
            const evt = parse(m.body)
            if (evt) handlersRef.current.onAnswerCorrection?.(evt)
          })
          // Учитель сбросил мои ответы на шаге — тот же персональный канал, что и поправка.
          client.subscribe(`/topic/lesson/${lessonId}/answer-reset/${selfUserId}`, (m) => {
            const evt = parse(m.body)
            if (evt) handlersRef.current.onAnswerReset?.(evt)
          })
          // Меня вызвали и мой экран смотрят — тоже персональные каналы: в групповом
          // занятии сосед не должен знать, кого сейчас спрашивают и чью работу читают.
          client.subscribe(`/topic/lesson/${lessonId}/call/${selfUserId}`, (m) => {
            const evt = parse(m.body)
            if (evt) handlersRef.current.onCall?.(evt)
          })
          client.subscribe(`/topic/lesson/${lessonId}/watch/${selfUserId}`, (m) => {
            const evt = parse(m.body)
            if (evt) handlersRef.current.onWatch?.(evt)
          })
        }
      },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate(); clientRef.current = null }
  }, [lessonId, token, selfUserId, isStaff])

  const publish = useCallback((action, body) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({ destination: `/app/lesson/${lessonId}/${action}`, body: JSON.stringify(body) })
  }, [lessonId])

  // Учитель: указать всем, на какой раздел/материал/шаг смотреть.
  const sendFocus = useCallback((sectionId, materialId, stepId = null, questionId = null) => {
    publish('focus', { sectionId, materialId, stepId, questionId })
  }, [publish])
  // Студент: передать одно захваченное действие внутри материала.
  const sendMirror = useCallback((materialId, event) => publish('material-mirror', { materialId, ...event }), [publish])
  // Учитель: передать пачку своих действий, чтобы студенты повторили их у себя.
  const sendPresent = useCallback((materialId, events) => publish('present', { materialId, events }), [publish])
  // Урок шагами: свой переход по шагу, свой ответ или нажатие «Проверить».
  // Одно событие — одно поле: пустые поля не шлём, чтобы у смотрящего не
  // появился «ответ», которого не было (см. DTO на бэкенде).
  const sendStepProgress = useCallback((payload) => publish('step-progress', payload), [publish])
  // Учитель: переписать ответ конкретного ученика на конкретный вопрос.
  const sendAnswerCorrection = useCallback((studentId, stepId, questionId, value) =>
    publish('answer-correction', { studentId, stepId, questionId, value }), [publish])
  // Учитель: очистить ответы конкретного ученика на шаге целиком.
  const sendAnswerReset = useCallback((studentId, stepId, questionIds, checkedKeys) =>
    publish('answer-reset', { studentId, stepId, questionIds, checkedKeys }), [publish])
  // Студент проиграл 🔊-озвучку (kind: 'tts', text/accent) или настоящий аудио-файл
  // (kind: 'file', url) — преподаватель в живом режиме следует за этим же звуком
  // (см. LessonAudioMessage на бэкенде). Односторонний канал: студент не подписан
  // на свой же /audio/staff, поэтому здесь только отправка.
  const sendAudio = useCallback((payload) => publish('audio', payload), [publish])
  // Учитель: вызвать одного ученика («Вас вызвали» у него на экране).
  const sendCall = useCallback((studentId) => publish('call', { studentId }), [publish])
  // Учитель: начал или закончил смотреть экран одного ученика. `watching: false`
  // обязателен при переключении — иначе метка «за вами смотрят» останется висеть
  // у того, от кого преподаватель уже ушёл.
  const sendWatch = useCallback((studentId, watching) => publish('watch', { studentId, watching }), [publish])

  return { sendFocus, sendMirror, sendPresent, sendStepProgress, sendAnswerCorrection, sendAnswerReset, sendAudio, sendCall, sendWatch }
}

function parse(body) {
  try { return JSON.parse(body) } catch { return null }
}
