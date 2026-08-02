'use client'

// Тумблер «только английский»: тьютор ведёт разговор целиком на английском —
// не подсказывает по-русски, не зеркалит язык ученика, не сваливается в
// смешанный режим на A1/A2.
//
// Настройка общая для ВСЕХ тьюторов (клиент просил «на каждом тьюторе»), а не
// свойство персонажа: она уходит в metadata комнаты одним флагом englishOnly и
// перебивает языковые блоки промпта на стороне агента.
//
// Хранилище — localStorage, а не Neon-профиль: в learner под это нет колонки, а
// заводить миграцию ради одного булева переключателя UI дороже, чем он стоит.
// Плата — настройка живёт на устройстве и не переезжает между браузерами.

import { useEffect, useState } from 'react'

const KEY = 'jts:tutor:englishOnly'

/** Текущее значение флага. На сервере (SSR) — всегда false. */
export function getEnglishOnly() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    // Приватный режим Safari роняет localStorage — тумблер просто не запомнится.
    return false
  }
}

export function setEnglishOnly(on) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* см. выше */
  }
}

/**
 * Реактивная обёртка. Стартует с false и читает localStorage эффектом ПОСЛЕ
 * гидратации — как диплинк ?screen= в App.jsx: прочитать в useState нельзя,
 * на сервере window нет и первый рендер клиента разошёлся бы с SSR.
 */
export function useEnglishOnly() {
  const [on, setOn] = useState(false)

  useEffect(() => {
    setOn(getEnglishOnly())
  }, [])

  function toggle(next) {
    const v = typeof next === 'boolean' ? next : !on
    setOn(v)
    setEnglishOnly(v)
  }

  return [on, toggle]
}
