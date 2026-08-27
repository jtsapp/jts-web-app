import { test, expect } from '@playwright/test'
import {
  PRACTICE_MODULES,
  isValidModule,
  isValidStateShape,
  normalizeDone,
  emptyState,
  mergeModuleState,
  unauthorizedIfNoBearer,
} from '../src/lib/practiceContract.js'
import {
  VOCAB_KEY,
  GRAMMAR_KEY,
  LISTENING_KEY,
  GRAMMAR_PROGRESS_EVENT,
  LISTENING_PROGRESS_EVENT,
} from '../src/practice/practiceKeys.js'

test.describe('practiceContract — валидация и merge', () => {
  test('модули: белый список', () => {
    expect(PRACTICE_MODULES).toEqual([
      'vocab',
      'grammar',
      'listening',
      'shadowing',
      'situations',
      'workbooks',
    ])
    expect(isValidModule('grammar')).toBe(true)
    expect(isValidModule('situations')).toBe(true)
    expect(isValidModule('workbooks')).toBe(true)
    expect(isValidModule('tutor')).toBe(false)
    expect(isValidModule(undefined)).toBe(false)
  })

  test('normalizeDone: только строки, без дублей', () => {
    expect(normalizeDone(['a', 'a', 'b', '', 1, null])).toEqual(['a', 'b'])
    expect(normalizeDone('nope')).toEqual([])
  })

  test('emptyState: done-модули пустой массив, vocab — объект', () => {
    expect(emptyState('grammar')).toEqual({ done: [] })
    expect(emptyState('listening')).toEqual({ done: [] })
    expect(emptyState('situations')).toEqual({ done: [] })
    expect(emptyState('workbooks')).toEqual({ done: [] })
    expect(emptyState('vocab')).toEqual({})
  })

  test('mergeModuleState: situations объединяет открытые уровни', () => {
    // Квота считает РАЗНЫЕ уровни, поэтому список должен расти, а не заменяться:
    // иначе вход с другого устройства обнулял бы потраченную квоту.
    expect(mergeModuleState('situations', { done: ['a1'] }, { done: ['a2', 'a1'] }))
      .toEqual({ done: ['a1', 'a2'] })
  })

  test('mergeModuleState: workbooks объединяет открытые уровни', () => {
    expect(mergeModuleState('workbooks', { done: ['a0'] }, { done: ['a1', 'a0'] }))
      .toEqual({ done: ['a0', 'a1'] })
  })

  test('mergeModuleState: grammar/listening объединяют done', () => {
    expect(mergeModuleState('grammar', { done: ['a1:1'] }, { done: ['a1:2', 'a1:1'] }))
      .toEqual({ done: ['a1:1', 'a1:2'] })
    expect(mergeModuleState('listening', undefined, { done: ['a1_001'] }))
      .toEqual({ done: ['a1_001'] })
  })

  test('mergeModuleState: vocab заменяет блоб целиком', () => {
    const incoming = { level: 'B1', srs: { 5: { box: 2 } } }
    expect(mergeModuleState('vocab', { level: 'A1' }, incoming)).toEqual(incoming)
    // мусорный incoming не затирает прежнее
    expect(mergeModuleState('vocab', { level: 'A1' }, null)).toEqual({ level: 'A1' })
  })

  test('unauthorizedIfNoBearer: нет токена → 401, есть → null', async () => {
    const withTok = new Request('http://x', { headers: { authorization: 'Bearer abc' } })
    expect(unauthorizedIfNoBearer(withTok)).toBeNull()
    const noTok = new Request('http://x')
    const res = unauthorizedIfNoBearer(noTok)
    expect(res).not.toBeNull()
    expect(res.status).toBe(401)
  })

  test('isValidStateShape: объект-словарь — да, массив/null/примитив — нет', () => {
    expect(isValidStateShape({})).toBe(true)
    expect(isValidStateShape({ a: 1 })).toBe(true)
    expect(isValidStateShape([])).toBe(false)
    expect(isValidStateShape(null)).toBe(false)
    expect(isValidStateShape('x')).toBe(false)
    expect(isValidStateShape(undefined)).toBe(false)
  })
})

test.describe('practiceKeys — ключи localStorage и имена событий закреплены', () => {
  test('константы не меняются без замеченного ревью', () => {
    expect(VOCAB_KEY).toBe('jts_vocab2')
    expect(GRAMMAR_KEY).toBe('jts_grammar_done')
    expect(LISTENING_KEY).toBe('jts_listening_done')
    expect(GRAMMAR_PROGRESS_EVENT).toBe('grammar-progress')
    expect(LISTENING_PROGRESS_EVENT).toBe('listening-progress')
  })
})
