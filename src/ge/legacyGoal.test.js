import { describe, it, expect, vi } from 'vitest'
import { syncLegacyGoal } from './legacyGoal.js'

const deps = (over = {}) => ({
  loadLevelGoal: vi.fn(async () => undefined),
  readCachedGoal: vi.fn(() => null),
  saveLevelGoal: vi.fn(async () => {}),
  importLegacyGoal: vi.fn(async (_t, g) => ({ onboarded: false, targetLevel: g.targetLevel, fromLevel: g.fromLevel })),
  ...over,
})

describe('syncLegacyGoal', () => {
  it('без профиля ничего не делает', async () => {
    const d = deps()
    expect(await syncLegacyGoal('tok', null, d)).toBe(null)
    expect(d.loadLevelGoal).not.toHaveBeenCalled()
  })
  it('цели в профиле нет — переносит из level_goal, C2 → C1', async () => {
    const d = deps({ loadLevelGoal: vi.fn(async () => ({ target: 'C2', from: 'B1' })) })
    const p = await syncLegacyGoal('tok', { onboarded: false, targetLevel: null }, d)
    expect(d.importLegacyGoal).toHaveBeenCalledWith('tok', { targetLevel: 'C1', fromLevel: 'B1' })
    expect(p.targetLevel).toBe('C1')
  })
  it('цель в профиле есть — level_goal больше не трогается: web-admin читает цель с бэкенда (часть 3)', async () => {
    const d = deps({ readCachedGoal: vi.fn(() => ({ target: 'B1', from: 'A2' })) })
    const profile = { onboarded: true, targetLevel: 'B2', fromLevel: 'A2' }
    expect(await syncLegacyGoal('tok', profile, d)).toBe(profile)
    expect(d.saveLevelGoal).not.toHaveBeenCalled()
    expect(d.loadLevelGoal).not.toHaveBeenCalled()
  })
  it('перенос упал — профиль остаётся прежним', async () => {
    const d = deps({
      loadLevelGoal: vi.fn(async () => ({ target: 'B2', from: 'A2' })),
      importLegacyGoal: vi.fn(async () => {
        throw new Error('x')
      }),
    })
    const p = { onboarded: false, targetLevel: null }
    expect(await syncLegacyGoal('tok', p, d)).toBe(p)
  })
})
