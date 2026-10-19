'use client'

// Облачко «Я Луна, ваш преподаватель» рядом с кнопкой помощника (19.10.2026,
// владелец: «сделай Луну более заметной»). Кнопку 16.10 уменьшили с 60 до 48 px по
// просьбе руководства «не мешать при работе с платформой», и ученики её просто не
// замечали. Поэтому заметность — не размером (кнопка теперь 56), а знакомством: пока ученик ни разу
// не открыл окно Луны, на каждом новом экране (раз за визит на экран) рядом с
// кнопкой выезжает облачко и само уходит через 8 с. Открыл хоть раз — облачка
// больше нет, Луну видно по кольцу, имени и редкому свечению (assistant.css).
//
// Облачко ничего не перекрывает для мыши: pointer-events: none, и оно исчезает
// от первого нажатия, клавиши или прокрутки — ученик взялся за задание, мешать
// ему незачем. Нажимать есть на что — на саму кнопку.

import { useEffect, useState } from 'react'

export const HINT_DELAY_MS = 1500
export const HINT_SHOW_MS = 8000
const MET_KEY = 'jts_assistant_met'
const SEEN_KEY = 'jts_assistant_hint_screens'

// Хранилище может бросить (приватный режим Safari, запрет cookies) — тогда
// облачко просто показывается, как новому ученику.
function store(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

export function hasMet() {
  try {
    return store('local')?.getItem(MET_KEY) === '1'
  } catch {
    return false
  }
}

export function markMet() {
  try {
    store('local')?.setItem(MET_KEY, '1')
  } catch {
    /* не запомнили — облачко покажется ещё раз, не беда */
  }
}

function seenScreens() {
  try {
    const list = JSON.parse(store('session')?.getItem(SEEN_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function rememberScreen(screen) {
  try {
    store('session')?.setItem(SEEN_KEY, JSON.stringify([...new Set([...seenScreens(), screen])]))
  } catch {
    /* см. markMet */
  }
}

/** Показать ли облачко на этом экране: ученик ещё не открывал Луну и здесь его не видел. */
export function hintDue(screen) {
  return Boolean(screen) && !hasMet() && !seenScreens().includes(screen)
}

/**
 * @param {{ screen: string|null, active: boolean, open: boolean }} opts
 *   active — кнопка Луны на экране и свободна (нет звонка, помощник разрешён)
 * @returns {boolean} показывать ли облачко сейчас
 */
export function useIntroHint({ screen, active, open }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) markMet()
  }, [open])

  useEffect(() => {
    if (!active || open || !hintDue(screen)) return undefined
    const timer = setTimeout(() => {
      if (!hintDue(screen)) return
      rememberScreen(screen)
      setShown(true)
    }, HINT_DELAY_MS)
    return () => {
      clearTimeout(timer)
      setShown(false)
    }
  }, [screen, active, open])

  useEffect(() => {
    if (!shown) return undefined
    const hide = () => setShown(false)
    const timer = setTimeout(hide, HINT_SHOW_MS)
    // capture: до того, как экран заберёт событие себе (stopPropagation).
    const opts = { capture: true, passive: true }
    window.addEventListener('pointerdown', hide, opts)
    window.addEventListener('keydown', hide, opts)
    window.addEventListener('wheel', hide, opts)
    window.addEventListener('touchmove', hide, opts)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', hide, opts)
      window.removeEventListener('keydown', hide, opts)
      window.removeEventListener('wheel', hide, opts)
      window.removeEventListener('touchmove', hide, opts)
    }
  }, [shown])

  return shown
}
