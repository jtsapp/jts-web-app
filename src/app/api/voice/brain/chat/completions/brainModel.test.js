// Страж границы A/B-эксперимента: модель мозга меняется ТОЛЬКО у «KZ тест 2».
// Падение здесь = эксперимент протёк на чужого тьютора (см. правило в шапке
// BRAIN_MODEL_BY_PERSONA). Удаляется вместе с экспериментом.

import { describe, it, expect } from 'vitest'
import { brainModelFor } from '@/app/api/voice/brain/chat/completions/route.js'

describe('brainModelFor — модель мозга по стенду', () => {
  it('обычный тьютор -> дефолт (Haiku), маршрут не задан', () => {
    expect(brainModelFor('jts-voice-router')).toBeUndefined()
  })
  it('KZ тест 2 -> своя модель', () => {
    expect(brainModelFor('jts-voice-router/jarvis2')).toBe('claude-sonnet-5')
  })
  it('чужие тьюторы не затронуты', () => {
    for (const p of ['jarvis', 'hype', 'gentle', 'bro']) {
      expect(brainModelFor(`jts-voice-router/${p}`)).toBeUndefined()
    }
  })
  it('мусор и пустое -> дефолт', () => {
    expect(brainModelFor('')).toBeUndefined()
    expect(brainModelFor(undefined)).toBeUndefined()
    expect(brainModelFor('jts-voice-router/')).toBeUndefined()
  })
})
