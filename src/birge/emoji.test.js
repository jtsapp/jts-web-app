import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CATEGORY_KEY,
  DEFAULT_CATEGORY,
  ECAT,
  EMO,
  RECENT_KEY,
  RECENT_MAX,
  categories,
  emojisOf,
  readRecent,
  rememberEmoji,
} from './emoji.js'
import { EMOJI_CATEGORY_IDS } from './labels.js'

// Наборы снимаются с самого прототипа: «дословно» (спека §7) проверяет код, а не глаз. Блок прототипа — от
// `const EMO={` до `const GIFS=` (EMO и ECAT), исполняется как есть.
const prototype = readFileSync(
  fileURLToPath(new URL('../../docs/superpowers/specs/2026-11-11-birge-prototype.html', import.meta.url)),
  'utf8',
)
const proto = new Function(`${prototype.slice(prototype.indexOf('const EMO={'), prototype.indexOf('const GIFS='))}; return { EMO, ECAT }`)()

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
  }
}

describe('набор смайликов', () => {
  it('дословно из прототипа', () => {
    expect(EMO).toEqual(proto.EMO)
    expect(ECAT).toEqual(proto.ECAT)
    expect(Object.keys(EMO)).toEqual(Object.keys(proto.EMO))
  })

  it('🤬 и 🖕 в наборе нет', () => {
    const all = Object.values(EMO).flat().join(' ')
    expect(all).not.toContain('🤬')
    expect(all).not.toContain('🖕')
  })

  it('у каждой вкладки есть id подписи', () => {
    expect(Object.keys(CATEGORY_KEY)).toEqual(Object.keys(EMO))
    expect(Object.values(CATEGORY_KEY)).toEqual(EMOJI_CATEGORY_IDS)
    expect(DEFAULT_CATEGORY).toBe('Эмоции')
  })

  it('«Недавние» — вкладка, только когда в них что-то есть', () => {
    expect(categories([])).not.toContain('Недавние')
    expect(categories(['😀'])[0]).toBe('Недавние')
    expect(emojisOf('Недавние', ['😀'])).toEqual(['😀'])
    expect(emojisOf('Учёба', [])).toContain('📚')
    expect(emojisOf('Нет такой', [])).toEqual([])
  })
})

describe('недавние смайлики', () => {
  it('новый — первым, без повтора, в localStorage под своим ключом', () => {
    const storage = memoryStorage()
    let recent = rememberEmoji('😀', [], storage)
    recent = rememberEmoji('🎉', recent, storage)
    recent = rememberEmoji('😀', recent, storage)
    expect(recent).toEqual(['😀', '🎉'])
    expect(JSON.parse(storage.data[RECENT_KEY])).toEqual(['😀', '🎉'])
    expect(readRecent(storage)).toEqual(['😀', '🎉'])
  })

  it('хранится не больше 27', () => {
    const storage = memoryStorage()
    let recent = []
    for (const e of EMO['Эмоции'].slice(0, 30)) recent = rememberEmoji(e, recent, storage)
    expect(RECENT_MAX).toBe(27)
    expect(recent).toHaveLength(27)
    expect(recent[0]).toBe(EMO['Эмоции'][29])
    expect(readRecent(storage)).toHaveLength(27)
  })

  it('мусор и чужие смайлики в хранилище в панель не попадают', () => {
    expect(readRecent(memoryStorage({ [RECENT_KEY]: 'не json' }))).toEqual([])
    expect(readRecent(memoryStorage({ [RECENT_KEY]: JSON.stringify(['🤬', 5, '😀']) }))).toEqual(['😀'])
    expect(readRecent(null)).toEqual([])
  })
})
