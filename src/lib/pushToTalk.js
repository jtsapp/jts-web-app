'use client'

// Тумблер «Режим рации»: пока ученик держит кнопку (или пробел), эфир его, а
// как только отпустил — тьютор считает мысль законченной и отвечает сразу.
// Детектора конца речи в этом режиме нет вовсе: ход закрывает не тишина, а
// палец ученика, поэтому пропадает и окно молчания VAD, и собственный
// эндпойнтинг распознавалки.
//
// Настройка общая для ВСЕХ тьюторов, как и «Только английский»: она уходит в
// metadata комнаты одним флагом pushToTalk и переключает агента на ручную
// турн-детекцию. Переключается и прямо в звонке (useTurnMode) — выбор там
// пишется сюда же и достаётся следующим звонкам.
//
// С 01.10.2026 рация — режим ПО УМОЛЧАНИЮ (решение владельца): в шумном месте
// детектор конца речи держит ход открытым на музыке и чужих голосах, а кнопка
// задаёт конец хода точно. Пустое хранилище — ученик ничего не выбирал —
// значит рация; '0' пишется только явным выключением, и такой выбор уважаем.
//
// Хранилище — localStorage, а не Neon-профиль: под булев переключатель UI
// колонки в learner нет, а миграция ради него дороже, чем он стоит. Плата —
// настройка живёт на устройстве и не переезжает между браузерами.

import { useEffect, useState } from 'react'

const KEY = 'jts:tutor:pushToTalk'

// Значение, когда ученик ничего не выбирал (или хранилище недоступно).
export const PUSH_TO_TALK_DEFAULT = true

/** Текущее значение флага. На сервере (SSR) — умолчание. */
export function getPushToTalk() {
  if (typeof window === 'undefined') return PUSH_TO_TALK_DEFAULT
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw === '1') return true
    if (raw === '0') return false
    return PUSH_TO_TALK_DEFAULT
  } catch {
    // Приватный режим Safari роняет localStorage — тумблер просто не запомнится.
    return PUSH_TO_TALK_DEFAULT
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
 * Реактивная обёртка. Стартует с умолчания и читает localStorage эффектом ПОСЛЕ
 * гидратации — как и useEnglishOnly: прочитать в useState нельзя, на сервере
 * window нет и первый рендер клиента разошёлся бы с SSR.
 */
export function usePushToTalkSetting() {
  const [on, setOn] = useState(PUSH_TO_TALK_DEFAULT)

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
