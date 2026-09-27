import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { wsBase } from '../../lib/wsUrl.js'

// Живая координация урока помимо доски: состояние занятия (state — где класс,
// ведёт ли преподаватель, стадия, таймер, статус), «Внимание на упражнение»
// (focus), зеркалирование действий студента внутри материала (mirror),
// проигрывание потока действий учителя студенту (present), сигнал «список
// разделов изменился» (sectionsChanged). Порт web-admin'овского
// LessonLiveSocketService на голый @stomp/stompjs — тот же
// brokerURL/connectHeaders, что и в useLessonPresence.js. Колбэки передаются
// параметром (как в useLessonBoard), чтобы не плодить лишний React-стейт здесь —
// событие пришло, вызвали и всё. Брокер рассылает публикацию всем подписчикам
// топика, включая самого отправителя — focus/present сравнивают senderUserId с
// selfUserId и глушат собственное эхо (тот же приём, что и в useLessonBoard).
//
// Канала timer здесь больше нет: таймер считается от времени окончания в
// состоянии (спека live-lesson-server-state §7). Сервер строит состояние из
// timer любой админки, в том числе старой, и пока пересылает старый канал для
// старых клиентов.
//
// `isStaff` — подписываться ли на учительский канал шагов. Работа ученика идёт
// не в общий топик урока, а в `.../step-progress/staff`: иначе в групповом
// занятии браузер каждого ученика получал бы ответы всех остальных (рисовать
// он их не станет, но данные были бы уже на устройстве).
export function useLessonLiveSocket(lessonId, token, selfUserId, { onConnect, onState, onCatchUp, onFocus, onMirror, onPresent, onSectionsChanged, onStepProgress, onAnswerCorrection, onAnswerReset, onAudioBroadcast, onCall, onWatch, onVocabSaved, isStaff = false } = {}) {
  const clientRef = useRef(null)
  // Соединение нужно знать снаружи: publish до CONNECT молча теряется, и
  // вызывающему приходится ждать связи, чтобы отправить состояние (см.
  // «преподаватель смотрит экран» в LiveLessonPage).
  const [connected, setConnected] = useState(false)
  // Колбэки кладём в ref, чтобы не пересоздавать STOMP-соединение при каждом
  // ре-рендере родителя (у него activeSectionId и т.п. меняются часто).
  // onVocabSaved здесь не было вовсе: подписка на канал слова вызывала
  // handlersRef.current.onVocabSaved, которого в объекте не существовало, — и
  // ученик не узнавал о слове, которое ему только что положили.
  const handlersRef = useRef({ onConnect, onState, onCatchUp, onFocus, onMirror, onPresent, onSectionsChanged, onStepProgress, onAnswerCorrection, onAnswerReset, onAudioBroadcast, onCall, onWatch, onVocabSaved })
  useEffect(() => { handlersRef.current = { onConnect, onState, onCatchUp, onFocus, onMirror, onPresent, onSectionsChanged, onStepProgress, onAnswerCorrection, onAnswerReset, onAudioBroadcast, onCall, onWatch, onVocabSaved } })

  useEffect(() => {
    if (!lessonId || !token) return undefined
    const client = new Client({
      brokerURL: wsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      // Обрыв и ошибку STOMP отмечаем так же, как в useLessonPresence: клиент
      // переподключится сам, но до этого публиковать некуда.
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
      onConnect: () => {
        setConnected(true)
        // Состояние занятия сервер рассылает целиком, и своё изменение
        // преподаватель получает тем же каналом — по нему он узнаёт, что ведёт
        // класс. Поэтому эхо здесь не глушится.
        client.subscribe(`/topic/lesson/${lessonId}/state`, (m) => {
          const evt = parse(m.body)
          if (evt) handlersRef.current.onState?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/focus`, (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onFocus?.(evt)
        })
        client.subscribe(`/topic/lesson/${lessonId}/material-mirror`, (m) => {
          const evt = parse(m.body)
          if (evt) handlersRef.current.onMirror?.(evt)
        })
        const onPresentMessage = (m) => {
          const evt = parse(m.body)
          if (!evt || evt.senderUserId === selfUserId) return
          handlersRef.current.onPresent?.(evt)
        }
        client.subscribe(`/topic/lesson/${lessonId}/present`, onPresentMessage)
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
        // Ученик вошёл или переподключился посреди показа и просит догнать класс:
        // преподаватель отвечает ему снимком своей рамки адресно (sendPresent с
        // targetStudentId). Просьбы других учеников ученику ни к чему.
        if (isStaff) {
          client.subscribe(`/topic/lesson/${lessonId}/catch-up/staff`, (m) => {
            const evt = parse(m.body)
            if (evt) handlersRef.current.onCatchUp?.(evt)
          })
        }
        // Учитель поправил мой ответ — канал персональный, свой senderUserId тут
        // сравнивать не с чем (учитель не путает себя с учеником), эхо-фильтр не нужен.
        if (!isStaff && selfUserId != null) {
          // Ответ преподавателя на мою просьбу догнать класс — снимок его рамки,
          // адресованный только мне. Разбирается как общий показ: тот же буфер,
          // тот же реплей в рамку.
          client.subscribe(`/topic/lesson/${lessonId}/present/${selfUserId}`, onPresentMessage)
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
          // Учитель положил слово в мой словарь. Тоже персональный канал: в группе
          // сосед не должен слышать, кому что записали.
          client.subscribe(`/topic/lesson/${lessonId}/vocab/${selfUserId}`, (m) => {
            const evt = parse(m.body)
            if (evt) handlersRef.current.onVocabSaved?.(evt)
          })
        }
        // Все подписки уже стоят — теперь можно брать снимок состояния: изменение,
        // случившееся после ответа снимка, дойдёт каналом state. Зовётся и на
        // каждом переподключении — за время обрыва класс мог уйти.
        handlersRef.current.onConnect?.()
      },
    })
    client.activate()
    clientRef.current = client
    return () => { client.deactivate(); clientRef.current = null; setConnected(false) }
  }, [lessonId, token, selfUserId, isStaff])

  const publish = useCallback((action, body) => {
    const client = clientRef.current
    if (!client?.connected) return
    // Команда без тела (release) уходит пустым кадром: JSON.stringify(undefined)
    // вернул бы не строку, а undefined.
    client.publish({ destination: `/app/lesson/${lessonId}/${action}`, body: body === undefined ? '' : JSON.stringify(body) })
  }, [lessonId])

  // Учитель: указать всем, на какой раздел/материал/шаг смотреть.
  const sendFocus = useCallback((sectionId, materialId, stepId = null, questionId = null) => {
    publish('focus', { sectionId, materialId, stepId, questionId })
  }, [publish])
  // Студент: передать одно захваченное действие внутри материала.
  const sendMirror = useCallback((materialId, event) => publish('material-mirror', { materialId, ...event }), [publish])
  // Учитель: передать пачку своих действий, чтобы студенты повторили их у себя.
  // С адресатом — ответ на просьбу одного ученика догнать класс: весь поток
  // рамки остальным не нужен, они его уже видели.
  const sendPresent = useCallback((materialId, events, targetStudentId) => publish('present',
    targetStudentId != null ? { materialId, events, targetStudentId } : { materialId, events }), [publish])
  // Учитель: перестал вести класс. Без этого вошедший ученик шёл бы к позиции,
  // от которой преподаватель уже ушёл.
  const sendRelease = useCallback(() => publish('release'), [publish])
  // Ученик: вошёл посреди показа — попросить у преподавателя снимок его рамки.
  const sendCatchUp = useCallback((materialId) => publish('catch-up', { materialId }), [publish])
  // Учитель: стадия файлового урока, на которой стоит его рамка, пока он ведёт
  // класс. Сервер хранит её в состоянии, и следующие ученики идут за ней.
  const sendStage = useCallback((materialId, stageIndex) => publish('stage', { materialId, stageIndex }), [publish])
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

  return { connected, sendFocus, sendMirror, sendPresent, sendRelease, sendCatchUp, sendStage, sendStepProgress, sendAnswerCorrection, sendAnswerReset, sendAudio, sendCall, sendWatch }
}

function parse(body) {
  try { return JSON.parse(body) } catch { return null }
}
