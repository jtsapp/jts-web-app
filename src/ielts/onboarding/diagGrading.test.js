import { beforeEach, describe, expect, it, vi } from 'vitest'

// Speaking диагностики: записи — в памяти вкладки и копией на устройстве. После перезагрузки (памяти нет) оценка берёт
// копию; нет и её — `lost`, а не молчаливый null. Оценили или секцию уже оценил другой запрос — копия удаляется.
const assessIeltsDiagnostic = vi.fn()
const store = new Map()
vi.mock('../../api.js', () => ({ assessIeltsDiagnostic: (...a) => assessIeltsDiagnostic(...a) }))
vi.mock('../speaking/pendingTakes.js', () => ({
  diagKey: (id) => `diag:${id}`,
  savePendingTakes: async (k, rec) => store.set(k, rec),
  loadPendingTakes: async (k) => store.get(k) || null,
  deletePendingTakes: async (k) => store.delete(k),
}))

const { gradeDiagnostic, keepSpeakingTakes } = await import('./diagGrading.js')
const answers = [{ itemId: 'q1', durationSec: 20, wav: new Blob(['x']) }]

describe('diagGrading', () => {
  beforeEach(() => {
    store.clear()
    assessIeltsDiagnostic.mockReset().mockResolvedValue({ ok: true })
  })

  it('записи сохраняются на устройство и удаляются после оценки', async () => {
    keepSpeakingTakes(1, answers)
    await Promise.resolve()
    expect(store.has('diag:1')).toBe(true)
    await gradeDiagnostic('T', 1, 'speaking', 'ru')
    expect(assessIeltsDiagnostic).toHaveBeenCalledWith('T', { attemptId: 1, skill: 'speaking', uiLang: 'ru', answers })
    await Promise.resolve()
    expect(store.has('diag:1')).toBe(false)
  })

  it('после перезагрузки (в памяти пусто) оценка берёт записи с устройства', async () => {
    store.set('diag:2', { answers })
    await gradeDiagnostic('T', 2, 'speaking', 'ru')
    expect(assessIeltsDiagnostic.mock.calls[0][1].answers).toEqual(answers)
  })

  it('записей нет нигде — отказ с кодом lost, роут не зовётся', async () => {
    await expect(gradeDiagnostic('T', 3, 'speaking', 'ru')).rejects.toMatchObject({ code: 'lost' })
    expect(assessIeltsDiagnostic).not.toHaveBeenCalled()
  })

  it('модель упала — записи остаются для повтора', async () => {
    keepSpeakingTakes(4, answers)
    assessIeltsDiagnostic.mockRejectedValueOnce(Object.assign(new Error('model_failed'), { code: 'model_failed' }))
    await expect(gradeDiagnostic('T', 4, 'speaking', 'ru')).rejects.toMatchObject({ code: 'model_failed' })
    expect(store.has('diag:4')).toBe(true)
    await gradeDiagnostic('T', 4, 'speaking', 'ru')
    expect(assessIeltsDiagnostic).toHaveBeenCalledTimes(2)
  })
})
