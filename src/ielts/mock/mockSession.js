import { useEffect, useRef, useState } from 'react'

// Полный mock (дизайн «IELTS new», раздел 4): общие правила экрана. Часы и черновик живут на сервере
// (/mobile/ielts/mocks, TEST_FORMAT.md §11); здесь — перевод серверного времени в часы устройства и автосохранение.

export const MOCK_ORDER = ['listening', 'reading', 'writing', 'speaking']

// Ориентир для описания mock — те же часы, что ставит сервер (IeltsMockRules.SECTION_SEC), Speaking — фактическая длина.
export const SECTION_MIN = { listening: 40, reading: 60, writing: 60, speaking: 14 }

/**
 * Конец секции в часах устройства. Сервер отдаёт свой «сейчас» и дедлайн в одной зоне, поэтому важна только разница:
 * часы ученика могут спешить на минуты, а таймер «по серверу» обязан совпасть с тем, что примет сервер.
 */
export function localDeadline(session, receivedAt = Date.now()) {
  if (!session?.sectionDeadline || !session?.serverNow) return null
  return receivedAt + (Date.parse(session.sectionDeadline) - Date.parse(session.serverNow))
}

export function nextSection(session) {
  const done = new Set((session?.sections || []).filter((s) => s.attemptIds?.length).map((s) => s.name))
  return MOCK_ORDER.find((s) => !done.has(s)) || null
}

export function sectionOf(session, name) {
  return (session?.sections || []).find((s) => s.name === name) || null
}

/** Номера вопросов без ответа — для окна «Сдать секцию?» (Figma 92:3906). */
export function unansweredNumbers(items, answers, isAnswered) {
  const out = []
  for (const x of items) if (!isAnswered(answers?.[x.id])) out.push(...x.numbers)
  return out
}

/**
 * «28, 34 и 39» — как в макете; длинный хвост сворачивается в «… и ещё 33» (more(k) — подпись хвоста на языке
 * интерфейса), чтобы окно не превращалось в список.
 */
export function joinNumbers(nums, and = 'и', max = 6, more = (k) => `+${k}`) {
  if (!nums.length) return ''
  const shown = nums.slice(0, max).map(String)
  if (nums.length > max) return `${shown.join(', ')} ${and} ${more(nums.length - max)}`
  return shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} ${and} ${shown.at(-1)}`
}

/**
 * Автосохранение черновика секции на сервер: не чаще раза в `delay` мс и сразу при уходе со страницы. Возвращает
 * состояние для шапки: saving | saved | error. Ошибка не роняет экзамен — локальные ответы остаются, следующее
 * изменение попробует снова.
 *
 * payload = null значит «секция сдана или закрыта»: отложенный черновик тогда выбрасывается — иначе уход со страницы
 * отправил бы его после сдачи и затёр бы то, что экран mock уже записал (Task 1 Writing после перехода к Task 2).
 * Первый payload — то, что пришло с сервера или только что создано, — не отправляется: сохранять в нём нечего.
 */
export function useMockAutosave(mock, payload, delay = 1500) {
  const [state, setState] = useState('saved')
  const last = useRef(null)
  const pending = useRef(null)
  const saveRef = useRef(mock?.onSave)
  saveRef.current = mock?.onSave

  // зависимость — содержимое, а не объект: экраны собирают payload заново на каждом тике часов, и по ссылке
  // отложенная запись сбрасывалась бы каждую секунду и не уходила никогда
  const json = mock && payload != null ? JSON.stringify(payload) : null
  useEffect(() => {
    if (json == null) {
      pending.current = null
      return
    }
    if (last.current == null) {
      last.current = json
      return
    }
    if (json === last.current) return
    pending.current = json
    setState('saving')
    const id = setTimeout(() => {
      const body = pending.current
      pending.current = null
      Promise.resolve(saveRef.current?.(JSON.parse(body)))
        .then(() => {
          last.current = body
          setState('saved')
        })
        .catch(() => setState('error'))
    }, delay)
    return () => clearTimeout(id)
  }, [json, delay])

  useEffect(() => {
    const flush = () => {
      if (!pending.current) return
      const body = pending.current
      pending.current = null
      // 409 после конца часов или прерванной попытки — не ошибка экрана: черновик там уже никому не нужен
      Promise.resolve(saveRef.current?.(JSON.parse(body), { keepalive: true })).catch(() => {})
    }
    window.addEventListener('pagehide', flush)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return state
}
