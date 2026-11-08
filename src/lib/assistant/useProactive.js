'use client'

// «Луна пишет первой» (ТЗ v2.0, 7.1, 7.2, 7.2г, 7.4): окно Луны само следит за приходом ученика, вкладкой, переходами и
// планом дня и в подходящий момент отдаёт событие (events.js), а окно пишет по нему первым. Решения — в proactive.js
// (чистый счёт), здесь — DOM, таймеры и сеть.
//
// Откуда что:
//  - приход (day_start, return_after_gap, return_after_pause, evening_entry, many_tasks) — при первом показе окна на
//    странице и когда вкладка снова видна; решение — после свежего плана (цифры дня), но не дольше PLAN_WAIT_MS;
//  - шаг закрыт (step_completed, plan_completed) — шаг плана бэкенд закрывает сам, по фактам (минуты практики, отметка
//    урока), поэтому план перечитывается, когда ученик вернулся: переход на «Главную», любой переход не чаще раза в
//    PLAN_EVERY_MS, вкладка снова видна, урок курса пройден (jts:lesson-done из lessonProgress.markDone). Свой пересчёт
//    (мало времени, «На сегодня всё» — событие jts:ge-plan-changed) — только новая точка отсчёта: урезанная практика там
//    закрывается, и «шаг закрыт» на неё было бы ложью;
//  - return_same_day и wandering — по переходам, через SETTLE_MS после смены экрана: экран должен дорисоваться, чтобы
//    понять, есть ли на нём задание;
//  - demo_trial — урок курса пройден в демо, заявки на пробный урок ещё нет;
//  - break_over — таймер перерыва ([[BREAK N]]): только пока сайт открыт (ТЗ 7.4), конец — на sessionStorage вкладки.
//
// Событие ждёт подходящего момента в очереди (одно место; приход важнее остального) и уходит, когда окно скажет «можно»
// (canDeliver: не тест, не запись, не звук, не окно поверх экрана, вкладка видна) и пустят лимиты 7.4 (tracker.allow).
// Не дождалось за свой срок — выбрасывается: «С возвращением» через полчаса уже не к месту.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getGePlan, getTrialRequestState } from '../../api.js'
import { GE_PLAN_CHANGED } from '../../ge/plan/replan.js'
import { ARRIVAL_EVENTS, HOME_ONLY } from './events.js'
import { createProactiveTracker, planParams } from './proactive.js'
import { daySummary } from './planSteps.js'
import { snapshotScreen } from './screenSnapshot.js'
import { openingFocus } from './opening.js'
import { PLACEMENT_DONE_EVENT, takePlacementDone } from './placementDone.js'

export const LESSON_DONE_EVENT = 'jts:lesson-done'

const SCREEN_ROOT = '.scr-in'
const PLAN_WAIT_MS = 4000
const PLAN_EVERY_MS = 30_000
const SETTLE_MS = 1800
const TICK_MS = 2000
const SEEN_EVERY_MS = 60_000
// Сколько событие ждёт в очереди: приход — дольше (тур, окно поверх экрана), остальное — пока к месту.
const WAIT_ARRIVAL_MS = 10 * 60_000
const WAIT_OTHER_MS = 3 * 60_000
// Знакомство и итог теста ждут «Главную» дольше: тест и выбор формата идут своими экранами.
const WAIT_HOME_MS = 30 * 60_000

// Хранилища трекера: localStorage — по аккаунту на устройстве, sessionStorage — на вкладку (proactive.js, шапка).
function webStore(kind, key) {
  let mem = {}
  const area = () => {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage
    } catch {
      return null
    }
  }
  return {
    get() {
      try {
        const raw = area()?.getItem(key)
        return raw ? { ...mem, ...JSON.parse(raw) } : mem
      } catch {
        return mem
      }
    },
    set(v) {
      mem = { ...v }
      try {
        area()?.setItem(key, JSON.stringify(v))
      } catch {
        /* приватный режим или полное хранилище — живём памятью вкладки */
      }
    },
  }
}

function readBreak(key) {
  try {
    const v = Number(window.sessionStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function writeBreak(key, until) {
  try {
    if (until) window.sessionStorage.setItem(key, String(until))
    else window.sessionStorage.removeItem(key)
  } catch {
    /* таймер всё равно живёт в памяти вкладки */
  }
}

/**
 * @param {{ token: string|null, owner: string|null, screen: string|null, enabled: boolean, demo?: boolean,
 *           level?: 'often'|'sometimes'|'manual', canDeliver: (ev) => boolean, deliver: (ev) => void,
 *           opts?: object, now?: () => number }} p
 */
export function useProactive({ token, owner, screen, enabled, demo = false, newcomer = false, level = 'often', canDeliver, deliver, opts, now = Date.now }) {
  const tracker = useMemo(
    () =>
      owner
        ? createProactiveTracker({
            store: webStore('local', `jts_luna_seen:${owner}`),
            session: webStore('session', `jts_luna_session:${owner}`),
            opts,
          })
        : null,
    [owner, opts],
  )
  const breakKey = owner ? `jts_luna_break:${owner}` : null
  const [breakEndsAt, setBreakEndsAt] = useState(null)
  // Свежие значения для слушателей и таймеров: они живут дольше одного рендера.
  const live = useRef({})
  useLayoutEffect(() => {
    live.current = { token, screen, enabled, demo, newcomer, level, canDeliver, deliver, tracker, breakEndsAt }
  })
  const planRef = useRef({ plan: null, summary: null, at: 0 })
  const pendingRef = useRef(null) // { ev, until }

  const active = Boolean(enabled && token && tracker)

  // Очередь: одно место. Приход важнее остального — его не вытесняет «шаг закрыт», пока он не ушёл.
  const enqueue = useCallback(
    (ev) => {
      if (!ev) return
      const cur = pendingRef.current
      const t = now()
      if (cur && t < cur.until && ARRIVAL_EVENTS.has(cur.ev.type) && !ARRIVAL_EVENTS.has(ev.type)) return
      pendingRef.current = { ev, until: t + (HOME_ONLY.has(ev.type) ? WAIT_HOME_MS : ARRIVAL_EVENTS.has(ev.type) ? WAIT_ARRIVAL_MS : WAIT_OTHER_MS) }
    },
    [now],
  )

  // Свежий план. baseline — только запомнить (свой пересчёт, первый заход); иначе — сравнить с прежним.
  const fetchPlan = useCallback(
    async ({ baseline = false } = {}) => {
      const tok = live.current.token
      if (!tok) return null
      const plan = await getGePlan(tok).catch(() => null)
      if (live.current.token !== tok) return null
      const prev = planRef.current.summary
      // Пустой ответ на перечитывании — сетевая осечка: прежний план остаётся (как useGePlan).
      if (!plan && prev) return null
      const summary = daySummary(plan)
      planRef.current = { plan, summary, at: now() }
      return baseline ? null : live.current.tracker?.planChanged({ prev, next: summary }) || null
    },
    [now],
  )

  // Приход: страница открылась. Решение — по прошлому заходу, поэтому «видели» пишется только после него.
  const arrivedRef = useRef(false)
  useEffect(() => {
    if (!active) return undefined
    if (arrivedRef.current === owner) return undefined
    let alive = true
    const timer = new Promise((r) => setTimeout(r, PLAN_WAIT_MS))
    Promise.race([fetchPlan({ baseline: true }), timer]).then(() => {
      if (!alive || arrivedRef.current === owner) return
      arrivedRef.current = owner
      const t = now()
      enqueue(tracker.arrival({ now: t, summary: planRef.current.summary, kind: 'mount', newcomer: live.current.newcomer }))
      // Перерыв, начатый до перезагрузки, мог кончиться, пока страницы не было.
      const until = breakKey ? readBreak(breakKey) : null
      if (until && until <= t) {
        writeBreak(breakKey, null)
        enqueue(tracker.breakOver({ summary: planRef.current.summary }))
      } else if (until) setBreakEndsAt(until)
      tracker.seen(t)
    })
    return () => {
      alive = false
    }
  }, [active, owner, tracker, fetchPlan, enqueue, now, breakKey])

  // Вкладка: скрыта — запомнили когда; снова видна — «вернулся после перерыва» или новый день.
  useEffect(() => {
    if (!active) return undefined
    let hiddenAt = document.hidden ? now() : null
    const onVis = () => {
      const t = now()
      if (document.hidden) {
        hiddenAt = t
        if (arrivedRef.current) tracker.seen(t)
        return
      }
      const awayMs = hiddenAt == null ? 0 : t - hiddenAt
      hiddenAt = null
      if (!arrivedRef.current || awayMs < 60_000) return
      const prev = planRef.current.summary
      fetchPlan({ baseline: true }).then(() => {
        const t2 = now()
        const ev = tracker.arrival({ now: t2, summary: planRef.current.summary, kind: 'visible', awayMs }) ||
          tracker.planChanged({ prev, next: planRef.current.summary })
        enqueue(ev)
        tracker.seen(t2)
      })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [active, tracker, fetchPlan, enqueue, now])

  // «Видели» — при действиях и раз в минуту, пока вкладка видна: по нему следующий приход решает «через 30 минут» и «2 дня».
  useEffect(() => {
    if (!active) return undefined
    let lastSeen = 0
    const mark = () => {
      const t = now()
      if (!arrivedRef.current || document.hidden || t - lastSeen < 30_000) return
      lastSeen = t
      tracker.seen(t)
    }
    const id = setInterval(mark, SEEN_EVERY_MS)
    const opts2 = { capture: true, passive: true }
    document.addEventListener('pointerdown', mark, opts2)
    document.addEventListener('keydown', mark, opts2)
    return () => {
      clearInterval(id)
      document.removeEventListener('pointerdown', mark, opts2)
      document.removeEventListener('keydown', mark, opts2)
    }
  }, [active, tracker, now])

  // Переход на экран: дорисовался — смотрим, есть ли задание; на «Главной» и не чаще PLAN_EVERY_MS — свежий план.
  useEffect(() => {
    if (!active || !screen) return undefined
    const id = setTimeout(async () => {
      if (!arrivedRef.current) return
      const root = document.querySelector(SCREEN_ROOT)
      const task = Boolean(root) && (openingFocus(snapshotScreen(root)).task || Boolean(root.closest?.('[data-assistant-test]')))
      let ev = null
      if (screen === 'home' || now() - planRef.current.at >= PLAN_EVERY_MS) ev = await fetchPlan()
      const visit = tracker.visit({ now: now(), screen, task, summary: planRef.current.summary, newcomer: live.current.newcomer })
      enqueue(ev || visit)
    }, SETTLE_MS)
    return () => clearTimeout(id)
  }, [active, screen, tracker, fetchPlan, enqueue, now])

  // Свой пересчёт дня (мало времени, «На сегодня всё») — новая точка отсчёта, не событие.
  useEffect(() => {
    if (!active) return undefined
    const on = () => fetchPlan({ baseline: true })
    window.addEventListener(GE_PLAN_CHANGED, on)
    return () => window.removeEventListener(GE_PLAN_CHANGED, on)
  }, [active, fetchPlan])

  // Урок курса пройден: в демо — предложение пробного урока (если заявки ещё нет), у всех — свежий план (шаг закрыт).
  useEffect(() => {
    if (!active) return undefined
    const on = (e) => {
      const cur = live.current
      const offer = cur.tracker?.lessonDone({ demo: cur.demo, first: Boolean(e.detail?.first) })
      if (offer) {
        getTrialRequestState(cur.token)
          .then((s) => {
            if (!s?.requested) enqueue(offer)
          })
          .catch(() => enqueue(offer))
        return
      }
      fetchPlan().then(enqueue)
    }
    window.addEventListener(LESSON_DONE_EVENT, on)
    return () => window.removeEventListener(LESSON_DONE_EVENT, on)
  }, [active, fetchPlan, enqueue])

  // Тест уровня пройден (кейс 35, ТЗ 7.2в): App шлёт итог (уровень, сильное и слабое, цель) — Луна скажет его на «Главной»
  // вместе с первым шагом свежего плана.
  // Итог ждёт в sessionStorage (placementDone.js): тест шёл на экране без Луны, и трекер тогда спал.
  useEffect(() => {
    if (!active) return undefined
    const take = () => {
      const detail = takePlacementDone()
      if (!detail) return
      fetchPlan({ baseline: true }).then(() => {
        enqueue({ type: 'placement_done', params: { ...detail, ...planParams(planRef.current.summary) } })
      })
    }
    take()
    window.addEventListener(PLACEMENT_DONE_EVENT, take)
    return () => window.removeEventListener(PLACEMENT_DONE_EVENT, take)
  }, [active, fetchPlan, enqueue])

  // Перерыв: по концу — событие со следующим шагом.
  useEffect(() => {
    if (!active || !breakEndsAt) return undefined
    const id = setTimeout(() => {
      writeBreak(breakKey, null)
      setBreakEndsAt(null)
      enqueue(tracker.breakOver({ summary: planRef.current.summary }))
    }, Math.max(0, breakEndsAt - now()))
    return () => clearTimeout(id)
  }, [active, breakEndsAt, breakKey, tracker, enqueue, now])

  // Доставка: раз в TICK_MS — есть событие, его срок не вышел, лимиты и окно пускают.
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => {
      const p = pendingRef.current
      const cur = live.current
      if (!p || document.hidden) return
      const t = now()
      if (t >= p.until) {
        pendingRef.current = null
        return
      }
      // Знакомство и итог теста — только на «Главной» (events.HOME_ONLY): ждут её в очереди.
      if (HOME_ONLY.has(p.ev.type) && cur.screen !== 'home') return
      // На перерыве — только его конец: ученик сам попросил тишины.
      if (cur.breakEndsAt && p.ev.type !== 'break_over') return
      if (!cur.tracker?.allow(p.ev, { now: t, level: cur.level })) return
      if (!cur.canDeliver?.(p.ev)) return
      pendingRef.current = null
      cur.tracker.shown(p.ev, t)
      cur.deliver?.(p.ev)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [active, now])

  const startBreak = useCallback(
    (minutes) => {
      const until = now() + Math.max(1, Number(minutes) || 5) * 60_000
      if (breakKey) writeBreak(breakKey, until)
      // Своё «перерыв» снимает событие в очереди: оно о том, что было до.
      pendingRef.current = null
      setBreakEndsAt(until)
    },
    [breakKey, now],
  )
  // Закончить раньше — перерыв окончен сразу, со следующим шагом.
  const endBreak = useCallback(() => {
    if (breakKey) writeBreak(breakKey, null)
    setBreakEndsAt(null)
    if (tracker) enqueue(tracker.breakOver({ summary: planRef.current.summary }))
  }, [breakKey, tracker, enqueue])

  const dismissed = useCallback(() => tracker?.dismissed(), [tracker])
  const engaged = useCallback(() => tracker?.engaged(), [tracker])
  const plan = useCallback(() => planRef.current, [])
  const gapToday = useCallback(() => tracker?.gapToday(now()) || 0, [tracker, now])

  return { breakEndsAt, startBreak, endBreak, dismissed, engaged, plan, gapToday }
}
