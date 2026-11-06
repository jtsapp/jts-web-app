import { useEffect, useRef, useState } from 'react'
import { saveHomeworkDraft } from '../../api.js'
import { canAttach } from './homeworkFormat.js'
import { lessonExercises, loadAnswers, saveAnswers, serverAnswers, serverDraftAnswers } from './homeworkExercises.js'

const keyOf = (id) => `hw-pending:${id}`
function readPending(id) {
  try {
    const data = JSON.parse(localStorage.getItem(keyOf(id)) || '{}')
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch { return {} }
}
function writePending(id, pending) {
  try { localStorage.setItem(keyOf(id), JSON.stringify(pending)) } catch { /* Сервер сохраняет и без Web Storage. */ }
}

/** Черновик сохраняется сразу на устройстве и последовательно на сервере, без автопроверки. */
export default function useHomeworkDrafts(hw, token) {
  const editable = canAttach(hw)
  const pending = useRef(null)
  if (pending.current === null) {
    const saved = readPending(hw.id)
    pending.current = Object.fromEntries(lessonExercises(hw)
      .filter((e) => saved[e.id]?.questionId === e.question.id)
      .map((e) => [e.id, saved[e.id]]))
  }
  const [answers, setAnswers] = useState(() => ({
    ...loadAnswers(hw.id), ...serverAnswers(hw), ...serverDraftAnswers(hw),
    ...Object.fromEntries(Object.values(pending.current).map((e) => [e.questionId, e.answer])),
  }))
  const current = useRef(answers)
  const [status, setStatus] = useState('')
  const running = useRef(null)
  const timer = useRef(null)
  const alive = useRef(true)
  const context = useRef(null)
  context.current = { hw, token, editable }
  const report = (value) => { if (alive.current) setStatus(value) }

  function flush() {
    if (running.current) return running.current
    if (!context.current.editable || !context.current.token || !Object.keys(pending.current).length) return Promise.resolve()
    clearTimeout(timer.current)
    report('saving')
    running.current = (async () => {
      while (Object.keys(pending.current).length) {
        const [id, entry] = Object.entries(pending.current)[0]
        await saveHomeworkDraft(context.current.hw.id, Number(id), context.current.token, entry.answer)
        // Пока шёл запрос, ученик мог дописать ответ — подтверждение старого его не удаляет.
        if (pending.current[id] === entry) delete pending.current[id]
        writePending(context.current.hw.id, pending.current)
      }
      report('saved')
    })().catch((error) => {
      report('error')
      if (alive.current && (!error.status || error.status >= 500)) timer.current = setTimeout(flush, 5000)
    }).finally(() => { running.current = null })
    return running.current
  }

  useEffect(() => {
    alive.current = true
    // На другом устройстве локального снимка ещё нет. Сдача читает именно его,
    // поэтому серверный черновик кладём сюда тоже, до нажатия «Отправить».
    if (editable) {
      saveAnswers(hw.id, current.current)
      if (Object.keys(pending.current).length) timer.current = setTimeout(flush, 600)
    } else {
      pending.current = {}
      writePending(hw.id, {})
      saveAnswers(hw.id, {})
    }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      alive.current = false
      clearTimeout(timer.current)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  // Компонент имеет key работы; новая работа создаёт отдельный экземпляр.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, hw.id, token])

  function onAnswer(questionId, answer) {
    if (!editable) return
    const exercise = lessonExercises(hw).find((e) => e.question.id === questionId)
    if (!exercise) return
    const value = answer ?? ''
    current.current = { ...current.current, [questionId]: value }
    pending.current[exercise.id] = { questionId, answer: value }
    // Синхронно, до React-рендера: обновление страницы сразу после ввода тоже безопасно.
    saveAnswers(hw.id, current.current)
    writePending(hw.id, pending.current)
    setAnswers(current.current)
    report('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 600)
  }

  return { answers, onAnswer, draftStatus: status, retryDrafts: flush }
}
