'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { IDENTITY, TAP_ZOOM, clampZoom, pinchZoom, zoomAround } from './zoom.js'

// Жесты страницы комикса на сенсорных экранах: щипок двумя пальцами, двойной
// тап, перетаскивание увеличенного листа — плюс прежние свайп и тап.
//
// Почему свой зум, а не штатный зум браузера: штатный увеличивает всю страницу
// вместе с шапкой и сайдбаром, а свайп и тап при этом продолжают листать — ведёшь
// пальцем по увеличенному кадру, и комикс перелистывается. В своём оверлее
// полного экрана (position: fixed) штатный зум на iOS вдобавок сбивает раскладку.
//
// Слушатели вешаем руками, а не через onTouch* React: React регистрирует их
// пассивными, и preventDefault в них не остановил бы штатный щипок.

// Дальше этого палец уже ведут, а не тапают.
const TAP_MOVE = 10
// Дольше — это долгое нажатие, а не тап.
const TAP_MS = 350
// Окно двойного тапа. Ради него одиночный тап листает с этой задержкой —
// иначе первый тап двойного успевал бы перелистнуть страницу.
const DOUBLE_MS = 280
const DOUBLE_DIST = 40
// Свайп короче не считаем — иначе прокрутка страницы листала бы комикс.
const SWIPE = 40
// Отпустили щипок почти на исходном масштабе — доводим до ровного ×1, иначе
// лист остаётся «чуть увеличенным» и свайп по нему не работает.
const SNAP = 1.08

const ease = 'transform 0.22s ease'

export function usePinchZoom({ stage, imgRef, onTap, onSwipe }) {
  const z = useRef(IDENTITY)
  const [zoomed, setZoomed] = useState(false)
  // Колбэки читаем из ref: слушатели живут дольше одного рендера.
  const cb = useRef({ onTap, onSwipe })
  useEffect(() => {
    cb.current = { onTap, onSwipe }
  })
  // Время последнего тапа пальцем — по нему читалка отличает синтетический
  // click после тача от настоящего клика мышью.
  const touchAt = useRef(0)

  const apply = useCallback(
    (next, animate) => {
      z.current = next
      const img = imgRef.current
      if (img) {
        img.style.transition = animate ? ease : 'none'
        img.style.transform =
          next.s === 1 ? '' : `translate(${next.x}px, ${next.y}px) scale(${next.s})`
      }
      setZoomed(next.s > 1)
    },
    [imgRef],
  )

  // Геометрия на момент жеста. Центр картинки берём из её экранного
  // прямоугольника за вычетом текущего сдвига: transform-origin — центр, так
  // что масштаб центр не двигает.
  const measure = useCallback(() => {
    const img = imgRef.current
    if (!img || !stage) return null
    const r = img.getBoundingClientRect()
    const v = stage.getBoundingClientRect()
    return {
      box: {
        cx: r.left + r.width / 2 - z.current.x,
        cy: r.top + r.height / 2 - z.current.y,
        w: img.offsetWidth,
        h: img.offsetHeight,
      },
      view: { left: v.left, top: v.top, right: v.right, bottom: v.bottom },
    }
  }, [imgRef, stage])

  const reset = useCallback(
    (animate = false) => {
      if (z.current.s !== 1 || z.current.x || z.current.y) apply(IDENTITY, animate)
    },
    [apply],
  )

  useEffect(() => {
    if (!stage) return undefined
    let g = null
    let lastTap = null
    let tapTimer = 0

    const mid = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

    // Начало жеста или смена числа пальцев посреди него: точкой отсчёта
    // становится текущее положение, иначе лист прыгнул бы к старому.
    const begin = (ts, multi) => {
      const geo = measure()
      if (ts.length >= 2) {
        g = { mode: 'pinch', multi: true, geo, z0: z.current, m0: mid(ts[0], ts[1]), d0: dist(ts[0], ts[1]) }
      } else if (ts.length === 1) {
        const p = ts[0]
        g = { mode: 'one', multi, geo, z0: z.current, x0: p.clientX, y0: p.clientY, at: performance.now(), moved: false }
      } else g = null
    }

    const settle = () => {
      if (z.current.s < SNAP) apply(IDENTITY, true)
    }

    const tap = (x, y) => {
      const now = performance.now()
      if (lastTap && now - lastTap.at < DOUBLE_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_DIST) {
        clearTimeout(tapTimer)
        lastTap = null
        if (z.current.s > 1) {
          apply(IDENTITY, true)
          return
        }
        const geo = measure()
        if (geo) apply(clampZoom(zoomAround(z.current, geo.box, x, y, TAP_ZOOM), geo.box, geo.view), true)
        return
      }
      lastTap = { at: now, x, y }
      clearTimeout(tapTimer)
      tapTimer = setTimeout(() => {
        lastTap = null
        cb.current.onTap?.(z.current.s > 1)
      }, DOUBLE_MS)
    }

    const onStart = (e) => {
      // Палец на кнопке сцены (стрелка, «обычный размер») — это нажатие, а не
      // жест: иначе дрожание пальца двигало бы лист под кнопкой.
      if (e.touches.length === 1 && e.target.closest?.('button')) {
        g = null
        return
      }
      const img = imgRef.current
      if (img) img.style.transition = 'none'
      begin(e.touches, e.touches.length > 1 || !!g?.multi)
    }

    const onMove = (e) => {
      if (!g?.geo) return
      if (g.mode === 'pinch' && e.touches.length >= 2) {
        e.preventDefault()
        const [a, b] = e.touches
        apply(clampZoom(pinchZoom(g.z0, g.geo.box, g.m0, g.d0, mid(a, b), dist(a, b)), g.geo.box, g.geo.view))
        return
      }
      if (g.mode !== 'one') return
      const p = e.touches[0]
      const dx = p.clientX - g.x0
      const dy = p.clientY - g.y0
      if (Math.hypot(dx, dy) > TAP_MOVE) g.moved = true
      // Увеличенный лист водим пальцем; неувеличенный отдаём браузеру —
      // вертикальная прокрутка страницы должна работать как раньше.
      if (g.z0.s > 1) {
        e.preventDefault()
        apply(clampZoom({ s: g.z0.s, x: g.z0.x + dx, y: g.z0.y + dy }, g.geo.box, g.geo.view))
      }
    }

    const onEnd = (e) => {
      if (e.touches.length > 0) {
        begin(e.touches, true)
        return
      }
      const s = g
      g = null
      if (!s) return
      if (s.mode === 'pinch' || s.multi) {
        settle()
        return
      }
      const p = e.changedTouches[0]
      const dx = p.clientX - s.x0
      const dy = p.clientY - s.y0
      if (!s.moved && performance.now() - s.at < TAP_MS) {
        // Тап по самой странице решаем сами (тап или двойной тап), поэтому
        // синтетический click гасим — он перелистнул бы страницу сразу. Тапы
        // по кнопкам сцены не трогаем.
        const img = imgRef.current
        if (img && img.contains(e.target)) {
          e.preventDefault()
          touchAt.current = Date.now()
          tap(p.clientX, p.clientY)
        }
        return
      }
      if (s.z0.s === 1 && Math.abs(dx) >= SWIPE && Math.abs(dx) >= Math.abs(dy)) {
        cb.current.onSwipe?.(dx < 0 ? 1 : -1)
      }
    }

    const onCancel = () => {
      g = null
      settle()
    }

    // Safari на iOS зумит страницу своими gesture-событиями, и touch-action
    // там соблюдается не везде — гасим их на сцене явно.
    const stopGesture = (e) => e.preventDefault()

    // Сменилась раскладка (поворот, полный экран) — сдвиг мог оказаться за
    // краями новой сцены: подтягиваем его обратно, масштаб сохраняем.
    const onResize = () => {
      if (z.current.s === 1) return
      const geo = measure()
      if (geo) apply(clampZoom(z.current, geo.box, geo.view))
    }

    const active = { passive: false }
    stage.addEventListener('touchstart', onStart, active)
    stage.addEventListener('touchmove', onMove, active)
    stage.addEventListener('touchend', onEnd, active)
    stage.addEventListener('touchcancel', onCancel)
    stage.addEventListener('gesturestart', stopGesture, active)
    stage.addEventListener('gesturechange', stopGesture, active)
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(tapTimer)
      stage.removeEventListener('touchstart', onStart, active)
      stage.removeEventListener('touchmove', onMove, active)
      stage.removeEventListener('touchend', onEnd, active)
      stage.removeEventListener('touchcancel', onCancel)
      stage.removeEventListener('gesturestart', stopGesture, active)
      stage.removeEventListener('gesturechange', stopGesture, active)
      window.removeEventListener('resize', onResize)
    }
  }, [stage, imgRef, apply, measure])

  // Клик мышью после тача — синтетический: тап уже обработан жестом.
  const fromTouch = useCallback(() => Date.now() - touchAt.current < 700, [])

  return { zoomed, reset, fromTouch }
}
