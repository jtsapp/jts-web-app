import { describe, it, expect } from 'vitest'
import { practiceQueue, progressResults, setCardMeta, sortIeltsSets, wordStatus, ieltsScope } from './ieltsVocab.js'

const words = Array.from({ length: 30 }, (_, i) => ({ id: `ENV-${String(i + 1).padStart(2, '0')}`, en: `w${i}` }))
const key = (i) => words[i].id.toLowerCase()

describe('IELTS Vocabulary — правила экрана', () => {
  it('подпись карточки — как в макете: повторение важнее прогресса, всё изучено — «Изучен»', () => {
    expect(setCardMeta(null, 40)).toEqual({ kind: 'new', n: 40, total: 40 })
    expect(setCardMeta({ seen: 15, learned: 12, due: 0 }, 40)).toEqual({ kind: 'progress', n: 12, total: 40 })
    expect(setCardMeta({ seen: 15, learned: 12, due: 6 }, 40)).toEqual({ kind: 'due', n: 6, total: 40 })
    expect(setCardMeta({ seen: 40, learned: 40, due: 3 }, 40).kind).toBe('done')
  })

  it('статус слова по состоянию сервера', () => {
    expect(wordStatus(undefined)).toBe('new')
    expect(wordStatus({ box: 1, due: true })).toBe('due')
    expect(wordStatus({ box: 3, learned: true, due: false })).toBe('learned')
    expect(wordStatus({ box: 1, due: false })).toBe('learning')
  })

  it('очередь: сначала к повторению, иначе 10 новых; «учу, но рано» не берётся', () => {
    const states = { [key(0)]: { box: 1, due: true }, [key(1)]: { box: 2, due: false }, [key(2)]: { box: 1, due: true } }
    expect(practiceQueue(words, states).map((w) => w.id)).toEqual(['ENV-01', 'ENV-03'])
    const fresh = practiceQueue(words, { [key(1)]: { box: 2, due: false } })
    expect(fresh).toHaveLength(10)
    expect(fresh.map((w) => w.id)).not.toContain('ENV-02')
    expect(practiceQueue(words, states, 'new')[0].id).toBe('ENV-04')
    expect(practiceQueue(words, states, 'all')).toHaveLength(30)
  })

  it('порядок тем — как в макете, ключ набора с префиксом', () => {
    const sets = [{ id: 'VOC-TRV', category: 'travel' }, { id: 'VOC-ENV', category: 'environment' }, { id: 'VOC-X', category: 'other' }]
    expect(sortIeltsSets(sets).map((s) => s.id)).toEqual(['VOC-ENV', 'VOC-TRV', 'VOC-X'])
    expect(ieltsScope('VOC-ENV')).toBe('ielts-VOC-ENV')
  })

  it('ответы тренировки — в тело запроса прогресса', () => {
    expect(progressResults([{ key: 'env-01', ok: true }, { key: '', ok: true }, { key: 'env-02', ok: false }])).toEqual([
      { key: 'env-01', ok: true }, { key: 'env-02', ok: false },
    ])
  })
})
