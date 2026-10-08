'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { IDENTITY, STEP_ZOOM, TAP_ZOOM, clampZoom, pinchZoom, wheelScale, zoomAround } from './zoom.js'

// Зум и жесты страницы комикса. На сенсорных экранах — щипок двумя пальцами,
// двойной тап, перетаскивание увеличенного листа плюс прежние свайп и тап. На
// компьютере — Ctrl + колесо и щипок тачпада, двойной клик, перетаскивание
// мышью, прокрутка увеличенного листа колесом и шаги для кнопок и клавиш.
//
// Почему свой зум, а не штатный зум браузера: штатный увеличивает всю страницу
// вместе с шапкой и сайдбаром, а свайп и тап при этом продолжают листать — ведёшь
// пальцем по увеличенному кадру, и комикс перелистывается. В своём оверлее
// полного экрана (position: fixed) штатный зум на iOS вдобавок сбивает раскладку.
//
// Слушатели вешаем руками, а не через onTouch*/onWheel React: React регистрирует
// их пассивными, и preventDefault в них не остановил бы штатный щипок и зум.

// Дальше этого палец (или мышь) уже ведут, а не тапают.
const TAP_MOVE = 10
// Дольше — это долгое нажатие, а не тап.
const TAP_MS = 350
// Окно двойного тапа и двойного клика. Ради него одиночный тап листает с этой
// задержкой — иначе первый тап двойного успевал бы перелистнуть страницу.
const DOUBLE_MS = 280
const DOUBLE_DIST = 40
// Свайп короче не считаем — иначе прокрутка страницы листала бы комикс.
const SWIPE = 40
// Отпустили щипок почти на исходном масштабе — доводим до ровного ×1, иначе
// лист остаётся «чуть увеличенным» и свайп по нему не работает.
const SNAP = 1.08
// У колеса нет события «отпустили» — конец жеста считаем по паузе.
const WHEEL_IDLE = 160
// Click в течение этого времени после касания — синтетический, тап уже разобран.
const TOUCH_CLICK_MS = 700

const ease = 'transform 0.22s ease'

export function usePinchZoom({ stage, imgRef, onTap, onSwipe }) {
  const z = useRef(IDENTITY)
  const [zoomed, setZoomed] = useState(false)
  // Масштаб для подписи «150%» у кнопок. Округляем до 5%: колесо и щипок
  // меняют его каждый кадр, а перерисовывать читалку ради третьего знака незачем.
  const [scale, setScale] = useState(1)
  // Колбэки читаем из ref: слушатели живут дольше одного рендера.
  const cb = useRef({ onTap, onSwipe })
  useEffect(() => {
    cb.current = { onTap, onSwipe }
  })
  // Время последнего касания — по нему клик мышью отличаем от синтетического
  // click, который браузер шлёт вдогонку тачу.
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
      setScale(Math.round(next.s * 20) / 20)
    },
    [imgRef],
  )

  // Геометрия на момент жеста. Центр картинки берём из её экранного
  // прямоугольника за вычетом текущего сдвига: transform-origin — центр, так
  // что масштаб центр не двигает. Незаконченную анимацию сначала снимаем:
  // иначе прямоугольник промежуточный, а z.current уже конечный, и лист
  // прыгает — шаги кнопками и колесо приходят как раз посреди анимации.
  const measure = useCallback(() => {
    const img = imgRef.current
    if (!img || !stage) return null
    img.style.transition = 'none'
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

  // Кнопки и клавиши +/−: шаг вокруг середины сцены — что было в центре
  // видимого, там и остаётся.
  const zoomBy = useCallback(
    (f) => {
      const s = z.current.s * f
      if (s < SNAP) {
        reset(true)
        return
      }
      const geo = measure()
      if (!geo) return
      const { box, view } = geo
      const cx = (view.left + view.right) / 2
      const cy = (view.top + view.bottom) / 2
      apply(clampZoom(zoomAround(z.current, box, cx, cy, s), box, view), true)
    },
    [apply, measure, reset],
  )

  useEffect(() => {
    if (!stage) return undefined
    let g = null
    let lastTap = null
    let tapTimer = 0
    // Сколько пальцев на сцене: по нему щипок тачпада отличаем от щипка
    // пальцами на iOS — gesture-события там идут вместе с касаниями.
    let fingers = 0

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

    // Тап пальцем и клик мышью — одна логика: одиночный листает (с ожиданием
    // двойного), двойной увеличивает под собой или возвращает обычный размер.
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
      fingers = e.touches.length
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
      fingers = e.touches.length
      if (e.touches.length > 0) {
        begin(e.touches, true)
        return
      }
      // Любое касание, а не только тап: браузер шлёт click и после короткого
      // сдвига пальца, а он не клик мышью.
      touchAt.current = Date.now()
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
          tap(p.clientX, p.clientY)
        }
        return
      }
      if (s.z0.s === 1 && Math.abs(dx) >= SWIPE && Math.abs(dx) >= Math.abs(dy)) {
        cb.current.onSwipe?.(dx < 0 ? 1 : -1)
      }
    }

    const onCancel = () => {
      fingers = 0
      g = null
      settle()
    }

    // ── Мышь и тачпад ──

    // Увеличенный лист тянут мышью. Только мышь: перо и палец на iPad идут
    // касаниями, и тянуть их второй раз здесь значило бы двигать лист дважды.
    let drag = null
    // Отпустили после перетаскивания — следом браузер пришлёт click, а это не
    // клик по странице.
    let skipClick = false

    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      skipClick = false
      if (z.current.s === 1 || e.target.closest?.('button')) return
      drag = { id: e.pointerId, geo: measure(), z0: z.current, x0: e.clientX, y0: e.clientY, moved: false }
    }

    const onPointerMove = (e) => {
      if (!drag?.geo || e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x0
      const dy = e.clientY - drag.y0
      if (!drag.moved && Math.hypot(dx, dy) <= TAP_MOVE) return
      drag.moved = true
      apply(clampZoom({ s: drag.z0.s, x: drag.z0.x + dx, y: drag.z0.y + dy }, drag.geo.box, drag.geo.view))
    }

    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return
      skipClick = drag.moved
      drag = null
    }

    // Клик по странице разбираем здесь, а не в onClick картинки: он делит с
    // тапом ожидание двойного — двойной клик увеличивает, и первый клик иначе
    // успевал бы перелистнуть.
    const onClick = (e) => {
      if (skipClick) {
        skipClick = false
        return
      }
      const img = imgRef.current
      if (!img || !img.contains(e.target)) return
      if (Date.now() - touchAt.current < TOUCH_CLICK_MS) return
      tap(e.clientX, e.clientY)
    }

    let wheelTimer = 0
    const onWheel = (e) => {
      if (e.ctrlKey) {
        // Ctrl + колесо — это же и щипок тачпада. Штатно браузер увеличил бы
        // всю страницу вместе с шапкой; над листом забираем жест себе — и в
        // обе стороны, иначе отдаление на ×1 уменьшало бы уже весь сайт.
        e.preventDefault()
        const geo = measure()
        if (!geo) return
        const s = wheelScale(z.current.s, e.deltaY, e.deltaMode)
        apply(clampZoom(zoomAround(z.current, geo.box, e.clientX, e.clientY, s), geo.box, geo.view))
      } else if (z.current.s > 1) {
        // Увеличенный лист колесо и два пальца тачпада водят, а не прокручивают
        // страницу из-под него. Shift + колесо мыши — по горизонтали.
        e.preventDefault()
        const geo = measure()
        if (!geo) return
        const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? geo.view.bottom - geo.view.top : 1
        let dx = e.deltaX * k
        let dy = e.deltaY * k
        if (e.shiftKey && !dx) {
          dx = dy
          dy = 0
        }
        apply(clampZoom({ s: z.current.s, x: z.current.x - dx, y: z.current.y - dy }, geo.box, geo.view))
      } else return
      clearTimeout(wheelTimer)
      wheelTimer = setTimeout(settle, WHEEL_IDLE)
    }

    // Щипок тачпада в Safari на Mac приходит не колесом, а своими
    // gesture-событиями (scale — от начала щипка). На iPhone и iPad те же
    // события идут вместе с касаниями, и щипок там уже ведут touch-слушатели —
    // тогда только гасим штатный зум: touch-action Safari соблюдает не везде.
    let pad = null
    const onGestureStart = (e) => {
      e.preventDefault()
      pad = fingers ? null : { geo: measure(), z0: z.current }
    }
    const onGestureChange = (e) => {
      e.preventDefault()
      if (fingers || !pad?.geo) return
      const { box, view } = pad.geo
      const x = Number.isFinite(e.clientX) ? e.clientX : (view.left + view.right) / 2
      const y = Number.isFinite(e.clientY) ? e.clientY : (view.top + view.bottom) / 2
      apply(clampZoom(zoomAround(pad.z0, box, x, y, pad.z0.s * e.scale), box, view))
    }
    const onGestureEnd = (e) => {
      e.preventDefault()
      if (!pad) return
      pad = null
      settle()
    }

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
    stage.addEventListener('gesturestart', onGestureStart, active)
    stage.addEventListener('gesturechange', onGestureChange, active)
    stage.addEventListener('gestureend', onGestureEnd, active)
    stage.addEventListener('wheel', onWheel, active)
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('click', onClick)
    // Движение и отпускание — на окне: мышь уходит с листа, пока его тянут.
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(tapTimer)
      clearTimeout(wheelTimer)
      stage.removeEventListener('touchstart', onStart, active)
      stage.removeEventListener('touchmove', onMove, active)
      stage.removeEventListener('touchend', onEnd, active)
      stage.removeEventListener('touchcancel', onCancel)
      stage.removeEventListener('gesturestart', onGestureStart, active)
      stage.removeEventListener('gesturechange', onGestureChange, active)
      stage.removeEventListener('gestureend', onGestureEnd, active)
      stage.removeEventListener('wheel', onWheel, active)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('click', onClick)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('resize', onResize)
    }
  }, [stage, imgRef, apply, measure])

  const zoomIn = useCallback(() => zoomBy(STEP_ZOOM), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / STEP_ZOOM), [zoomBy])

  return { zoomed, scale, reset, zoomIn, zoomOut }
}
