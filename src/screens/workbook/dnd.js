'use client'

// Перетаскивание — порт слоя DND из data/jtsworkbook-a0.html (:5446).
// Правила прототипа, которые здесь важнее реализации:
//
// · слово никуда не исчезает: оригинал остаётся на месте, а за пальцем едет
//   видимая копия-призрак;
// · пока слово в воздухе, подсвечиваются ВСЕ подходящие цели, а та, что под
//   пальцем, — отдельно;
// · короткое нажатие остаётся тапом: пока палец не уехал на 7 пикселей,
//   перетаскивание не начинается, поэтому «тапнул слово, тапнул пропуск»
//   продолжает работать;
// · клик, которым браузер завершает перетаскивание, обработчики игнорируют
//   (justDragged) — иначе слово улетало бы дважды.
//
// kind связывает источник с целями: у каждого предложения в «собери фразу»
// свой kind, поэтому слово нельзя уронить в чужую строку.

import { useEffect, useRef } from 'react'

const LIFT_PX = 7
const CLICK_GUARD_MS = 350

let cur = null
let endedAt = 0

const zones = new Set()

function px(n) {
  return n + 'px'
}

export function bounce(node) {
  if (!node) return
  node.classList.add('wb-bounce')
  setTimeout(() => node.classList.remove('wb-bounce'), 340)
}

function makeGhost(src) {
  const r = src.getBoundingClientRect()
  const g = document.createElement('span')
  g.className = 'wb-dragghost'
  g.textContent = src.textContent
  g.style.left = px(r.left)
  g.style.top = px(r.top)
  if (r.width) g.style.minWidth = px(r.width)
  if (r.height) g.style.minHeight = px(r.height)
  document.body.appendChild(g)
  return g
}

function openZones(on) {
  zones.forEach((z) => {
    if (!on) {
      z.node.classList.remove('wb-dz-open', 'wb-dz-hot')
      return
    }
    if (cur && z.kind === cur.kind && !z.disabled()) z.node.classList.add('wb-dz-open')
  })
}

function hot(node) {
  if (!cur || cur.zone === node) return
  if (cur.zone) cur.zone.classList.remove('wb-dz-hot')
  cur.zone = node
  if (node) node.classList.add('wb-dz-hot')
}

function zoneAt(x, y) {
  let n = null
  try {
    n = document.elementFromPoint ? document.elementFromPoint(x, y) : null
  } catch {
    n = null
  }
  while (n && n.classList) {
    for (const z of zones) {
      if (z.node === n && z.kind === cur.kind && !z.disabled()) return n
    }
    n = n.parentNode
  }
  return null
}

function zoneEntry(node) {
  for (const z of zones) if (z.node === node) return z
  return null
}

function follow(x, y) {
  if (cur.ghost) cur.ghost.style.transform = 'translate(' + px(x - cur.x0) + ',' + px(y - cur.y0) + ') scale(1.05)'
  hot(zoneAt(x, y))
}

function lift(x, y) {
  cur.live = true
  cur.ghost = makeGhost(cur.src)
  cur.src.classList.add('wb-lift')
  document.body.classList.add('wb-dragging')
  openZones(true)
  follow(x, y)
}

function finish(useDrop, x, y) {
  if (!cur) return
  const c = cur
  cur = null
  document.removeEventListener('pointermove', onMove, true)
  document.removeEventListener('pointerup', onUp, true)
  document.removeEventListener('pointercancel', onCancel, true)
  if (!c.live) return
  endedAt = Date.now()
  if (c.ghost && c.ghost.parentNode) c.ghost.parentNode.removeChild(c.ghost)
  c.src.classList.remove('wb-lift')
  document.body.classList.remove('wb-dragging')
  zones.forEach((z) => z.node.classList.remove('wb-dz-open', 'wb-dz-hot'))
  const target = c.zone ? zoneEntry(c.zone) : null
  if (useDrop && target) target.onDrop(c.payload(), x, y, c.zone)
  else bounce(c.src)
}

function onMove(e) {
  if (!cur) return
  if (!cur.live) {
    if (Math.abs(e.clientX - cur.x0) + Math.abs(e.clientY - cur.y0) < LIFT_PX) return
    lift(e.clientX, e.clientY)
  }
  if (e.cancelable) e.preventDefault()
  follow(e.clientX, e.clientY)
}

function onUp(e) {
  finish(true, e.clientX, e.clientY)
}

function onCancel() {
  finish(false)
}

/** Клик, которым браузер завершает перетаскивание, обработчики пропускают. */
export function justDragged() {
  return Date.now() - endedAt < CLICK_GUARD_MS
}

/**
 * Куда вставить перетащенное слово: перед той плиткой, левее середины которой
 * его отпустили. Порт DND.slot — без него слово всегда падало бы в конец.
 */
export function slotIndexAt(host, x, y) {
  if (!host || x == null || y == null) return null
  const kids = Array.from(host.children)
  for (let i = 0; i < kids.length; i++) {
    const r = kids[i].getBoundingClientRect()
    if (!r.width && !r.height) continue
    if (y < r.bottom && x < r.left + r.width / 2) return i
  }
  return null
}

/** Источник перетаскивания. payload читается в момент броска, а не подписки. */
export function useGrab(kind, payload, disabled) {
  const ref = useRef(null)
  const box = useRef({ payload, disabled })
  // Пишем не в рендере, а сразу после него: обработчики указателя срабатывают
  // уже после коммита, поэтому свежее значение они увидят в любом случае.
  useEffect(() => {
    box.current = { payload, disabled }
  })

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    node.classList.add('wb-grab')
    const down = (e) => {
      if (e.button && e.button !== 0) return
      if (box.current.disabled || node.disabled) return
      finish(false)
      cur = {
        src: node,
        kind,
        x0: e.clientX,
        y0: e.clientY,
        zone: null,
        live: false,
        ghost: null,
        payload: () => box.current.payload,
      }
      document.addEventListener('pointermove', onMove, true)
      document.addEventListener('pointerup', onUp, true)
      document.addEventListener('pointercancel', onCancel, true)
    }
    node.addEventListener('pointerdown', down)
    return () => {
      node.removeEventListener('pointerdown', down)
      node.classList.remove('wb-grab', 'wb-lift')
      if (cur && cur.src === node) finish(false)
    }
  }, [kind])

  return ref
}

/** Цель. onDrop(payload, x, y, node) судит бросок так же, как тап. */
export function useZone(kind, onDrop, disabled) {
  const ref = useRef(null)
  const box = useRef({ onDrop, disabled })
  useEffect(() => {
    box.current = { onDrop, disabled }
  })

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const entry = {
      node,
      kind,
      onDrop: (...args) => box.current.onDrop(...args),
      disabled: () => !!box.current.disabled,
    }
    zones.add(entry)
    node.classList.add('wb-dz')
    return () => {
      zones.delete(entry)
      node.classList.remove('wb-dz', 'wb-dz-open', 'wb-dz-hot')
    }
  }, [kind])

  return ref
}
