'use client'

// Наблюдатель «застрял» (28.10.2026): окно Луны само смотрит на экран и решает,
// когда предложить «Подсказать?». Счёт — в stuck.js; здесь DOM, таймеры и «можно
// ли сейчас».
//
// Смотрим после каждого действия ученика внутри экрана (клик, Enter): проверка
// задания рисуется не сразу (анимация, ответ сервера), поэтому снимок — через
// 0.8 с и ещё раз через 2 с. Прочие действия (касание, прокрутка, ввод) только
// отодвигают «простой». Слушатели — на document в фазе захвата и по
// composedPath: так видны и клики внутри Shadow DOM («Числа», Prepositions).
//
// Облачка нет на тестах (корень помечен data-assistant-test — там подсказывать
// нечестно), поверх тура и когда виджет говорит, что сейчас нельзя (canOffer:
// окно, звонок, Луна говорит, другое облачко).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { STUCK, createStuckTracker } from './stuck.js'
import { snapshotScreen } from './screenSnapshot.js'
import { openingFocus } from './opening.js'
import { isTtsActive } from '../speech.js'

const SCREEN_ROOT = '.scr-in'
const SCAN_AFTER_MS = [800, 2000]
const IDLE_TICK_MS = 5000
// Эти действия могут быть проверкой задания — после них смотрим на экран.
const CHECK_EVENTS = ['click', 'keydown']
// Эти только говорят «ученик здесь».
const PRESENCE_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'input', 'scroll']

/** Подсказка тут нечестна или некстати: тест, тур поверх экрана. */
export function stuckBlocked(root, doc = root?.ownerDocument) {
  if (!root) return true
  if (root.closest?.('[data-assistant-test]') || root.querySelector('[data-assistant-test]')) return true
  return Boolean(doc?.querySelector('.t-tour__pop'))
}

// Ученик слушает запись или смотрит видео — это не простой.
function mediaPlaying(doc) {
  for (const m of doc.querySelectorAll('audio, video')) if (!m.paused && !m.ended) return true
  return false
}

/**
 * @param {{ active: boolean, screen: string|null, canOffer?: () => boolean, rootSelector?: string,
 *           opts?: Partial<typeof STUCK> }} p
 * @returns {{ offer: null | { reason: 'errors'|'idle' }, take: () => ('errors'|'idle'|null) }}
 */
export function useStuckWatch({ active, screen, canOffer, rootSelector = SCREEN_ROOT, opts }) {
  const [offer, setOffer] = useState(null)
  // Счётчик живёт весь визит: «дважды не нажал — больше не показываем» держится до перезагрузки.
  const [tracker] = useState(() => createStuckTracker(opts))
  const idleMs = opts?.idleMs ?? STUCK.idleMs
  const showMs = opts?.showMs ?? STUCK.showMs
  // Свежие значения для слушателей: они живут дольше одного рендера.
  const live = useRef({ active, screen, canOffer })
  useLayoutEffect(() => {
    live.current = { active, screen, canOffer }
  })
  const offerRef = useRef(null)
  const hideTimer = useRef(null)

  const drop = useCallback((ignored) => {
    clearTimeout(hideTimer.current)
    if (!offerRef.current) return
    offerRef.current = null
    setOffer(null)
    if (ignored) tracker.ignored()
  }, [tracker])

  const show = useCallback(
    (reason) => {
      offerRef.current = { reason }
      setOffer({ reason })
      clearTimeout(hideTimer.current)
      // Не нажал за showMs — облачко уходит и считается пропущенным.
      hideTimer.current = setTimeout(() => drop(true), showMs)
    },
    [drop, showMs],
  )

  // Новый экран — счёт заново; пометки, что на нём уже были, — не ошибки ученика.
  useEffect(() => {
    if (!active) return
    const root = document.querySelector(rootSelector)
    tracker.baseline({ screen, text: root ? snapshotScreen(root) : '' })
  }, [active, screen, rootSelector, tracker])

  useEffect(() => {
    if (!active) return undefined
    const doc = document
    let lastActionAt = Date.now()
    const timers = new Set()

    const rootIfFree = () => {
      const cur = live.current
      if (!cur.active || offerRef.current) return null
      const root = doc.querySelector(rootSelector)
      if (!root || stuckBlocked(root, doc)) return null
      if (cur.canOffer && !cur.canOffer()) return null
      return root
    }
    const scan = () => {
      const root = rootIfFree()
      if (!root) return
      const reason = tracker.observe({ screen: live.current.screen, text: snapshotScreen(root), now: Date.now() })
      if (reason) show(reason)
    }
    const inScreen = (e) => {
      const root = doc.querySelector(rootSelector)
      return Boolean(root) && (e.composedPath?.() || []).includes(root)
    }
    const onCheck = (e) => {
      lastActionAt = Date.now()
      if (!inScreen(e)) return
      // Ученик снова взялся за задание сам — облачко уходит, оно ему не понадобилось.
      if (offerRef.current) return drop(true)
      if (e.type === 'keydown' && e.key !== 'Enter') return
      for (const ms of SCAN_AFTER_MS) {
        const id = setTimeout(() => {
          timers.delete(id)
          scan()
        }, ms)
        timers.add(id)
      }
    }
    const onPresence = () => {
      lastActionAt = Date.now()
    }
    const tick = setInterval(() => {
      const now = Date.now()
      // Вкладка скрыта, играет запись или говорит Луна — ученик не «застрял»: вернувшись,
      // он не должен сразу получить облачко за время, что его не было.
      if (doc.hidden || mediaPlaying(doc) || isTtsActive()) {
        lastActionAt = now
        return
      }
      if (now - lastActionAt < idleMs) return
      const root = rootIfFree()
      if (!root) return
      const text = snapshotScreen(root)
      const reason = tracker.idle({ screen: live.current.screen, now, lastActionAt, task: openingFocus(text).task })
      if (reason) show(reason)
    }, IDLE_TICK_MS)

    const listen = { capture: true, passive: true }
    for (const type of CHECK_EVENTS) doc.addEventListener(type, onCheck, listen)
    for (const type of PRESENCE_EVENTS) doc.addEventListener(type, onPresence, listen)
    return () => {
      for (const type of CHECK_EVENTS) doc.removeEventListener(type, onCheck, listen)
      for (const type of PRESENCE_EVENTS) doc.removeEventListener(type, onPresence, listen)
      for (const id of timers) clearTimeout(id)
      clearInterval(tick)
      // Окно открылось, начался звонок — облачко не нужно, но и пропущенным оно не было.
      drop(false)
    }
  }, [active, rootSelector, idleMs, show, drop, tracker])

  // Ученик нажал облачко (или кнопку Луны, пока оно на экране): причина — для пометки.
  const take = useCallback(() => {
    const o = offerRef.current
    if (!o) return null
    clearTimeout(hideTimer.current)
    offerRef.current = null
    setOffer(null)
    tracker.taken()
    return o.reason
  }, [tracker])

  return { offer, take }
}
