import { useCallback, useEffect, useRef, useState } from 'react'
import { flushModule } from './practiceSync.js'

// "Могу ли я открыть этот раздел практики прямо сейчас" — спрашивает сервер
// (см. /api/practice/entitlement). Пока идёт запрос или он не удался —
// allowed:true (fail-open, тот же принцип, что и у лимита AI-тьютора: сбой
// сети/бэкенда не должен запирать обычного пользователя).
// Отсутствие токена (гость) — тоже allowed:true, квоты гостей не касаются.
/** То же самое для IELTS: попытки в месяц считаются не по practice-стейту, а по
 *  строкам сданных секций, поэтому у него свой роут (/api/ielts/entitlement).
 *  Тот же fail-open: пока грузим или если запрос не удался — allowed:true. */
export function useIeltsEntitlement(token) {
  const [state, setState] = useState({
    loading: true, allowed: true, limit: null, used: 0, source: 'NONE', sourceName: null,
  })

  useEffect(() => {
    if (!token) {
      setState({ loading: false, allowed: true, limit: null, used: 0, source: 'NONE', sourceName: null })
      return undefined
    }
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetch('/api/ielts/entitlement', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return
        setState({
          loading: false,
          allowed: data ? data.allowed !== false : true,
          limit: data?.limit ?? null,
          used: data?.used ?? 0,
          source: data?.source || 'NONE',
          sourceName: data?.sourceName || null,
        })
      })
      .catch(() => {
        if (alive) setState({ loading: false, allowed: true, limit: null, used: 0, source: 'NONE', sourceName: null })
      })
    return () => { alive = false }
  }, [token])

  return state
}

// Ответ сервера → состояние хука. fetched отличает «сервер сказал: потолка нет»
// от «спросить не удалось»: limit === null в обоих случаях (fail-open), но
// перепроверять перед стартом сессии стоит только второй — см. check().
function fromResponse(data) {
  return {
    loading: false,
    allowed: data ? data.allowed !== false : true,
    limit: data?.limit ?? null,
    completed: data?.completed ?? 0,
    source: data?.source || 'NONE',
    sourceName: data?.sourceName || null,
    fetched: !!data,
  }
}

const OPEN = fromResponse(null)

async function requestEntitlement(moduleName, token) {
  try {
    const res = await fetch(`/api/practice/entitlement?module=${encodeURIComponent(moduleName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return fromResponse(res.ok ? await res.json() : null)
  } catch {
    return fromResponse(null)
  }
}

/**
 * Право на раздел практики. Возвращает состояние (для экрана лимита) и check() —
 * ПРОВЕРКУ В МОМЕНТ СТАРТА сессии.
 *
 * Зачем check(), если состояние и так есть: ответ считает completed по
 * practice-стейту, то есть после каждой пройденной сессии число другое. Запрос
 * при монтировании меряет лимит ровно один раз за жизнь экрана — демо-аккаунт
 * с лимитом 8 заданий жал «Ещё раз» сколько угодно, потому что решение
 * принималось по числу, снятому до первой сессии.
 *
 * check() возвращает СВЕЖИЙ ответ и решать надо по нему, а не по состоянию:
 * между setState и следующим рендером старт сессии уже решён, и чтение
 * состояния здесь дало бы прежнее значение.
 */
export function usePracticeEntitlement(moduleName, token) {
  const [state, setState] = useState({ ...OPEN, loading: true })
  // Зеркало состояния для check(): по нему решаем, нужен ли запрос вообще, — из
  // асинхронного колбэка state виден прежним.
  const latest = useRef(state)
  // Порядковые номера запросов: ответ, устаревший на фоне более нового (смена
  // урока, параллельный check), не должен затирать свежий вердикт.
  const seq = useRef(0)
  const applied = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const apply = useCallback((next, n) => {
    if (n < applied.current) return next
    applied.current = n
    latest.current = next
    if (alive.current) setState(next)
    return next
  }, [])

  useEffect(() => {
    if (!token) {
      apply({ ...OPEN }, (seq.current += 1))
      return undefined
    }
    // Пока ответ по НОВОМУ модулю не пришёл, прежний вердикт недействителен:
    // иначе check() успел бы срезать запрос по чужому limit.
    const n = (seq.current += 1)
    apply({ ...OPEN, loading: true }, n)
    requestEntitlement(moduleName, token).then((next) => apply(next, n))
    return undefined
  }, [moduleName, token, apply])

  const check = useCallback(async () => {
    // Гость: квоты его не касаются — ни одного лишнего запроса.
    if (!token) return latest.current
    // Ученик без потолка: сервер уже ответил «лимита нет», пересчитывать нечего.
    if (latest.current.fetched && latest.current.limit == null) return latest.current
    // Прогресс прошлой сессии обязан долететь до БД РАНЬШЕ, чем сервер посчитает
    // completed: отметки копятся с debounce в 600 мс (pushModule), и без flush
    // свежий ответ вернул бы прежнее число — лимит не удержал бы ровно ту
    // сессию, которая его добила.
    await flushModule(moduleName)
    const n = (seq.current += 1)
    apply({ ...latest.current, loading: true }, n)
    return apply(await requestEntitlement(moduleName, token), n)
  }, [moduleName, token, apply])

  return { ...state, check }
}
