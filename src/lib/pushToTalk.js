'use client'

// Тумблер «Режим рации»: пока ученик держит кнопку (или пробел), эфир его, а
// как только отпустил — тьютор считает мысль законченной и отвечает сразу.
// Детектора конца речи в этом режиме нет вовсе: ход закрывает не тишина, а
// палец ученика, поэтому пропадает и окно молчания VAD, и собственный
// эндпойнтинг распознавалки.
//
// Настройка общая для ВСЕХ тьюторов, как и «Только английский»: она уходит в
// metadata комнаты одним флагом pushToTalk и переключает агента на ручную
// турн-детекцию.
//
// Хранилище — localStorage, а не Neon-профиль: под булев переключатель UI
// колонки в learner нет, а миграция ради него дороже, чем он стоит. Плата —
// настройка живёт на устройстве и не переезжает между браузерами.

import { useEffect, useState } from 'react'

const KEY = 'jts:tutor:pushToTalk'

/** Текущее значение флага. На сервере (SSR) — всегда false. */
export function getPushToTalk() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    // Приватный режим Safari роняет localStorage — тумблер просто не запомнится.
    return false
  }
}

export function setPushToTalk(on) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* см. выше */
  }
}

/**
 * Реактивная обёртка. Стартует с false и читает localStorage эффектом ПОСЛЕ
 * гидратации — как и useEnglishOnly: прочитать в useState нельзя, на сервере
 * window нет и первый рендер клиента разошёлся бы с SSR.
 */
export function usePushToTalkSetting() {
  const [on, setOn] = useState(false)

  useEffect(() => {
    setOn(getPushToTalk())
  }, [])

  function toggle(next) {
    const v = typeof next === 'boolean' ? next : !on
    setOn(v)
    setPushToTalk(v)
  }

  return [on, toggle]
}
