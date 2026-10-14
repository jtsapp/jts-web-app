import { useCallback, useEffect, useRef, useState } from 'react'
import { appendQuestion, createSession, reconcile, resume, suspend } from './session.js'

const PREFIX = 'jts_sat_run:'

function read(key) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, s) {
  try {
    if (s) window.localStorage.setItem(PREFIX + key, JSON.stringify(s))
    else window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* приватное окно / квота: сессия живёт в памяти до конца визита */
  }
}

/**
 * Сессия вопросов с черновиком на устройстве: перезагрузка возвращает ответы, отметки, маркер, время и место.
 * Черновик подходит, если набор тот же или сервер его продлил (reconcile — «Похожее»), иначе начинаем заново. Уходя с экрана (и при
 * закрытии вкладки), часы экрана останавливаются — кроме стены часов модуля пробника: там время идёт и без нас.
 *
 * spec: { key, mode, questions: [{id, section}], timing } — key уникален для прохождения (диагностика, сессия, модуль).
 * Сервер про черновик не знает: ответы уходят ему при проверке (учебный режим) или сдаче модуля (фазы 4, 7).
 */
export default function useSatSession(spec) {
  const [session, setSession] = useState(null)
  const ref = useRef(null)
  const key = spec?.key

  useEffect(() => {
    if (!key || !spec?.questions?.length) return undefined
    const saved = read(key)
    const fit = saved && !saved.finishedAt ? reconcile(saved, spec.questions) : null
    const s = fit ? resume(fit) : createSession({ id: key, mode: spec.mode, questions: spec.questions, timing: spec.timing })
    ref.current = s
    setSession(s)
    write(key, s)
    const onHide = () => {
      if (ref.current) write(key, suspend(ref.current))
    }
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      if (ref.current) write(key, ref.current.finishedAt ? ref.current : suspend(ref.current))
    }
    // spec приходит новым объектом на каждый рендер страницы — сессию пересоздаёт только смена ключа
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback(
    (fn) => {
      setSession((prev) => {
        if (!prev) return prev
        const next = fn(prev)
        ref.current = next
        write(key, next)
        return next
      })
    },
    [key],
  )

  /** Сбросить черновик (сессия сдана или брошена). */
  const clear = useCallback(() => {
    write(key, null)
  }, [key])

  /** Дописать вопрос («Похожее»): черновик продлевается, а не начинается заново. */
  const append = useCallback((q) => update((s) => appendQuestion(s, q)), [update])

  return { session, update, append, clear }
}

/** Есть ли на устройстве начатый (не сданный) черновик — «Продолжить» вместо «Начать» на карточке недельного теста. */
export function hasDraft(key) {
  const s = key ? read(key) : null
  return !!(s && !s.finishedAt && Object.values(s.answers || {}).some((a) => a && a.value != null && String(a.value) !== ''))
}
