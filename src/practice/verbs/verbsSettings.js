'use client'

// Настройки «Неправильных глаголов» — свойство устройства, а не аккаунта:
// темп и громкость зависят от динамиков, открытая часть — от того, где
// человек остановился на этом экране. Поэтому localStorage без синка, как
// типографика «Чтения».
//
// Границы и значения по умолчанию — прототипные (read/clamp в начале его
// скрипта): темп 72–116 BPM, бит 45 %, голос 90 %, пауза на повтор 3 с,
// уровень практики A1, три формы.

const KEY = 'jts_verbs_settings'

export const PART_IDS = ['learn', 'table', 'practice']
const LEVELS = ['all', 'A1', 'A2', 'B1']

export const DEFAULT_SETTINGS = {
  part: 'learn',
  visited: {},
  tableLevel: 'all',
  practiceLevel: 'A1',
  formCount: 3,
  set: 'all',
  limit: 0,
  beat: true,
  volume: 45,
  bpm: 96,
  tutor: 90,
  auto: false,
  pause: 3,
}

function clamp(x, min, max, d) {
  const n = Number(x)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d
}

/** Приводит сырой объект к допустимым значениям; мусор → умолчания. */
export function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const d = DEFAULT_SETTINGS
  return {
    part: PART_IDS.includes(s.part) ? s.part : d.part,
    visited: s.visited && typeof s.visited === 'object' && !Array.isArray(s.visited) ? s.visited : {},
    tableLevel: LEVELS.includes(s.tableLevel) ? s.tableLevel : d.tableLevel,
    practiceLevel: LEVELS.includes(s.practiceLevel) ? s.practiceLevel : d.practiceLevel,
    formCount: s.formCount === 2 ? 2 : 3,
    // Группу набора сверяет экран, когда данные загружены: список групп
    // приходит из verbs.json, а не из кода.
    set: typeof s.set === 'string' && s.set ? s.set : d.set,
    limit: [0, 10, 20].includes(s.limit) ? s.limit : d.limit,
    beat: s.beat === undefined ? d.beat : s.beat === true,
    volume: clamp(s.volume, 0, 100, d.volume),
    bpm: clamp(s.bpm, 72, 116, d.bpm),
    tutor: clamp(s.tutor, 0, 100, d.tutor),
    auto: s.auto === true,
    pause: clamp(s.pause, 0, 5, d.pause),
  }
}

export function readSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    return normalizeSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeSettings(null)
  }
}

/**
 * Правка сливается с тем, что уже в памяти экрана (base), а не с перечитанным
 * хранилищем: если setItem бросает (квота, заблокированное хранилище), каждая
 * правка иначе откатывала бы остальные — темп 76, смена уровня, и снова 96.
 */
export function writeSettings(patch, base = readSettings()) {
  const next = normalizeSettings({ ...base, ...patch })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* приватный режим — настройки живут до перезагрузки */
  }
  return next
}
