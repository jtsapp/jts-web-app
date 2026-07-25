import { useState, useCallback, useRef } from 'react'

// Настройки и долговременный прогресс Словаря.
// Ключ localStorage тот же, что был у прототипа в iframe (`jts_vocab2`), —
// прогресс пользователей переезжает на нативную версию без потерь.

const KEY = 'jts_vocab2'
export const DEFAULT = {
  level: 'A1',
  mode: 'essential',
  field: 'business',
  goalMin: 15,
  accent: 'us',
  sound: true,
  srs: {},
  seenCount: 0,
}

export function loadState() {
  try {
    const r = localStorage.getItem(KEY)
    return r ? { ...DEFAULT, ...JSON.parse(r) } : { ...DEFAULT }
  } catch {
    return { ...DEFAULT }
  }
}

function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* приватный режим / переполнение — прогресс просто не сохранится */
  }
}

// Прототип держал состояние в мутируемом объекте S и звал save() вручную.
// В React: ref — источник правды для движка (читается синхронно внутри задания),
// а версия-счётчик перерисовывает подписчиков.
export function useVocabState() {
  const ref = useRef(null)
  if (ref.current === null) ref.current = loadState()
  const [, bump] = useState(0)

  // patch — объект либо функция от АКТУАЛЬНОГО состояния. Функциональная форма
  // обязательна там, где патч зависит от прошлого значения (SRS пишется по
  // ходу задания): объект, посчитанный от снимка из замыкания, затирал бы
  // записи, сделанные между рендерами.
  const apply = (patch) => (typeof patch === 'function' ? patch(ref.current) : patch)

  const set = useCallback((patch) => {
    ref.current = { ...ref.current, ...apply(patch) }
    persist(ref.current)
    bump((v) => v + 1)
  }, [])

  // Точечное обновление без перерисовки — для SRS внутри задания.
  const setQuiet = useCallback((patch) => {
    ref.current = { ...ref.current, ...apply(patch) }
    persist(ref.current)
  }, [])

  return { S: ref.current, set, setQuiet, ref }
}

/* ─────────────── SRS: коробки Лейтнера ───────────────
   Порт srs() прототипа: knew (знал на этапе сбора) поднимает сильнее,
   верный ответ — на шаг, ошибка — на шаг вниз. Интервал по коробке. */
const BOX_HOURS = [0, 1, 2, 4, 8, 16]

export function gradeWord(S, w, correct, knew) {
  const prev = S.srs[w.id] || { box: 0, due: 0, seen: false }
  const st = { ...prev } // не мутируем сохранённую запись
  const wasNew = !st.seen
  if (knew) st.box = Math.min(5, (st.box || 0) + (st.seen ? 1 : 2))
  else if (correct) st.box = Math.min(5, (st.box || 0) + 1)
  else st.box = Math.max(0, (st.box || 0) - 1)
  const hrs = BOX_HOURS[st.box] || 16
  st.due = Date.now() + hrs * 3600e3
  if (wasNew) st.seen = true
  return { st, wasNew }
}
