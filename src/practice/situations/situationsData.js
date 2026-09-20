'use client'

// Данные разговорной практики: public/practice/situations/<level>.json,
// собранные scripts/build-situations-data.js из уровневых страниц прототипа.
//
// Кэш на вкладку, как у грамматики и глаголов: JSON уровня весит от 48 КБ (A1)
// до 278 КБ (C1), и перекачивать его на каждый вход в сценарий незачем.
// Неудачу не кэшируем — иначе разрыв сети на первой загрузке навсегда оставил
// бы уровень пустым до перезагрузки страницы.

const cache = {}

export const SITUATION_BLOCKS = [
  'mission',
  'questions',
  'react',
  'critical',
  'roleplay',
  'followup',
  'vocab',
  'phrases',
  'linkers',
]

export function loadLevel(level) {
  const code = String(level || '').toLowerCase()
  if (!cache[code]) {
    cache[code] = fetch(`/practice/situations/${code}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`situations ${code}: HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => (Array.isArray(data?.items) ? data.items : []))
      .catch((e) => {
        delete cache[code]
        throw e
      })
  }
  return cache[code]
}

/** Сценарий уровня по номеру (1..10) или null. */
export async function loadSituation(level, id) {
  const items = await loadLevel(level)
  return items.find((s) => s.id === Number(id)) || null
}
