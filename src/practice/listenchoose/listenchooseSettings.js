'use client'

// Настройки и недоигранный набор ЭТОГО устройства: сложность, размер набора по
// сложностям, темп и громкость плеера, и по набору на сложность (очередь,
// индекс, раунды с порядком картинок и ошибками). Не синкается: это свойство
// устройства, а не ученика. В прототипе всё жило в sessionStorage вкладки; здесь
// набор переживает закрытие вкладки. Чистится вместе с прогрессом
// (clearLocalPractice) — следующий аккаунт не должен продолжить чужой набор.
//
// Валидность самих наборов (`runs`) проверяет контроллер (session.js) по данным
// раздела: тут их только не теряем.

import { LISTENCHOOSE_RUN_KEY as KEY } from '../practiceKeys.js'
import { DEFAULT_COUNT, LEVELS, MAX_COUNT } from './engine.js'
import { RATES } from './player.js'

const DEFAULT_RATE = 1
const DEFAULT_VOLUME = 0.8

export const DEFAULT_DEVICE = {
  version: 1,
  level: 'easy',
  counts: { easy: DEFAULT_COUNT, medium: DEFAULT_COUNT, hard: DEFAULT_COUNT },
  rate: DEFAULT_RATE,
  volume: DEFAULT_VOLUME,
  runs: {},
}

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)

// Границы — прототипа: размер набора целый 1–50, темп из трёх, громкость 0–1.
export function normalizeDevice(raw) {
  const d = isObj(raw) ? raw : {}
  const counts = {}
  const runs = {}
  for (const level of LEVELS) {
    const n = isObj(d.counts) ? d.counts[level] : undefined
    counts[level] = Number.isInteger(n) && n >= 1 && n <= MAX_COUNT ? n : DEFAULT_COUNT
    if (isObj(d.runs) && isObj(d.runs[level])) runs[level] = d.runs[level]
  }
  return {
    version: 1,
    level: LEVELS.includes(d.level) ? d.level : 'easy',
    counts,
    rate: RATES.includes(d.rate) ? d.rate : DEFAULT_RATE,
    volume: Number.isFinite(d.volume) ? Math.max(0, Math.min(1, d.volume)) : DEFAULT_VOLUME,
    runs,
  }
}

// Зеркало в памяти — только пока хранилище не пишет (см. listenchooseProgress.js).
let memo = null
let storageBroken = false

export function readDevice() {
  if (storageBroken && memo) return memo
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalizeDevice(JSON.parse(raw))
  } catch {
    /* приватный режим / битый JSON */
    if (memo) return memo
  }
  return normalizeDevice(null)
}

/** Хранилище отказало: экран честно предупреждает, что прогресс живёт до обновления страницы. */
export function isDeviceStorageBroken() {
  return storageBroken
}

/** Сливает патч с сохранённым и пишет. `counts` и `runs` передаются целиком. */
export function writeDevice(patch) {
  const next = normalizeDevice({ ...readDevice(), ...patch })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    storageBroken = false
    memo = null
  } catch {
    storageBroken = true
    memo = next
  }
  return next
}
