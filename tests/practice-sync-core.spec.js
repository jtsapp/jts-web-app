import { test, expect } from '@playwright/test'
import { serializeForPush, applyHydratedState } from '../src/practice/practiceSyncCore.js'

test.describe('practiceSyncCore — сериализация и применение', () => {
  test('serializeForPush: done-модули из Set/массива → {done:[...]}', () => {
    expect(serializeForPush('grammar', new Set(['a1:1', 'a1:1', 'a1:2'])))
      .toEqual({ done: ['a1:1', 'a1:2'] })
    expect(serializeForPush('listening', ['a1_001'])).toEqual({ done: ['a1_001'] })
  })

  test('serializeForPush: vocab отдаёт объект как есть', () => {
    const s = { level: 'B1', srs: {} }
    expect(serializeForPush('vocab', s)).toBe(s)
  })

  test('applyHydratedState: пишет ключи и будит каталоги', () => {
    const writes = {}
    const events = []
    applyHydratedState(
      { vocab: { level: 'A2' }, grammar: { done: ['a1:3', 'a1:3'] }, listening: { done: ['a1_002'] } },
      { setItem: (k, v) => (writes[k] = v), dispatch: (e) => events.push(e) },
    )
    expect(JSON.parse(writes.jts_vocab2)).toEqual({ level: 'A2' })
    expect(JSON.parse(writes.jts_grammar_done)).toEqual(['a1:3']) // массив, без дублей
    expect(JSON.parse(writes.jts_listening_done)).toEqual(['a1_002'])
    expect(events).toEqual(['grammar-progress', 'listening-progress'])
  })

  test('applyHydratedState: мусорный вход игнорируется', () => {
    let called = false
    applyHydratedState(null, { setItem: () => (called = true), dispatch: () => (called = true) })
    expect(called).toBe(false)
  })
})
