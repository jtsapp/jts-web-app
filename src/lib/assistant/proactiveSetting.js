// «Подсказки Луны: часто / иногда / только по запросу» (ТЗ v2.0, 7.4) — настройка в Профиле.
//
// Хранится на УСТРОЙСТВЕ (localStorage), а не в аккаунте. Почему:
//  - две другие настройки Луны — звук ответов (jts_assistant_voice_muted) и позывной (jts_luna_wake, wakeSetting.js) —
//    тоже устройства, и ученик ищет их рядом по одной логике;
//  - насколько Луна может вмешиваться, зависит от того, где учатся: на ноутбуке окно открывается само, на телефоне
//    вместо этого точка на кнопке (useProactive), и выбор «часто» на одном не обязан переезжать на другое;
//  - решение нужно сразу при загрузке, до любого ответа сервера: окно открывается на первом же экране дня;
//  - аккаунтной таблицы настроек у веба нет, а заводить миграцию и ручку ради трёх значений — лишняя точка отказа.
// Цена — на новом устройстве снова «часто» (как в ТЗ по умолчанию). Если школа попросит общий выбор на все устройства,
// он ляжет в Neon-профиль рядом с отметками туров (tour_seen), а этот модуль станет его кэшем, как lib/tourMarks.js.
//
// useSyncExternalStore: на сервере и при гидратации — значение по умолчанию, расхождения разметки нет.
import { useSyncExternalStore } from 'react'

export const PROACTIVE_KEY = 'jts_luna_proactive'
export const PROACTIVE_LEVELS = ['often', 'sometimes', 'manual']
export const DEFAULT_PROACTIVE = 'often'

const listeners = new Set()
// Приватный режим не даёт писать в localStorage — выбор живёт в памяти до перезагрузки.
let override = null

export function readProactiveLevel() {
  if (override !== null) return override
  try {
    const v = localStorage.getItem(PROACTIVE_KEY)
    return PROACTIVE_LEVELS.includes(v) ? v : DEFAULT_PROACTIVE
  } catch {
    return DEFAULT_PROACTIVE
  }
}

export function writeProactiveLevel(level) {
  const v = PROACTIVE_LEVELS.includes(level) ? level : DEFAULT_PROACTIVE
  override = v
  try {
    if (v === DEFAULT_PROACTIVE) localStorage.removeItem(PROACTIVE_KEY)
    else localStorage.setItem(PROACTIVE_KEY, v)
  } catch {
    /* приватный режим — см. override */
  }
  for (const fn of listeners) fn()
}

const subscribe = (fn) => {
  listeners.add(fn)
  // Выбор в другой вкладке (Профиль открыт рядом) — сразу и здесь.
  const onStorage = (e) => {
    if (e.key === PROACTIVE_KEY) {
      override = null
      fn()
    }
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** Насколько часто Луна пишет первой на этом устройстве. */
export const useProactiveLevel = () => useSyncExternalStore(subscribe, readProactiveLevel, () => DEFAULT_PROACTIVE)
