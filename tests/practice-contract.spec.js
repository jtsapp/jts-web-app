import { test, expect } from '@playwright/test'
import {
  PRACTICE_MODULES,
  isValidModule,
  normalizeDone,
  emptyState,
  mergeModuleState,
  unauthorizedIfNoBearer,
} from '../src/lib/practiceContract.js'

test.describe('practiceContract — валидация и merge', () => {
  test('модули: белый список', () => {
    expect(PRACTICE_MODULES).toEqual(['vocab', 'grammar', 'listening'])
    expect(isValidModule('grammar')).toBe(true)
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
    expect(emptyState('vocab')).toEqual({})
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
})
