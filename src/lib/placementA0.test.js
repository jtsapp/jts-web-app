import { describe, it, expect } from 'vitest'
import { buildA0Options, A0_DISTRACTORS, A0_OPTION_COUNT } from './placementA0.js'
import { loadFullBank } from './placementScore.js'

// Мост пробного урока собирается на сервере, потому что ключей в публичном
// банке больше нет. Проверяем не форму ответа, а то, ради чего он существует:
// среди вариантов есть верный, их ровно четыре, и порядок не пляшет между
// запросами.

const bridgeIds = () =>
  (loadFullBank().bank.items || []).filter((it) => it.block === 'a0_bridge').map((it) => it.id)

describe('варианты A0-моста', () => {
  it('на каждое задание моста приходит четыре варианта', () => {
    const ids = bridgeIds()
    expect(ids.length).toBeGreaterThan(0)
    const out = buildA0Options(ids)
    for (const id of ids) expect(out[id]).toHaveLength(A0_OPTION_COUNT)
  })

  it('верный ответ среди вариантов есть', () => {
    const { keys } = loadFullBank()
    const out = buildA0Options(bridgeIds())
    for (const [id, opts] of Object.entries(out)) {
      const answers = (keys[id]?.answer || []).map((a) => a.toLowerCase())
      expect(answers.length).toBeGreaterThan(0)
      expect(opts.some((w) => answers.includes(String(w).toLowerCase()))).toBe(true)
    }
  })

  it('отвлекающие не совпадают с верным ответом', () => {
    const { keys } = loadFullBank()
    const out = buildA0Options(bridgeIds())
    for (const [id, opts] of Object.entries(out)) {
      const answers = (keys[id]?.answer || []).map((a) => a.toLowerCase())
      // Ровно один вариант верный: если бы отвлекающие фильтровались небрежно,
      // на экране оказалось бы два правильных ответа и любой выбор был бы верным.
      expect(opts.filter((w) => answers.includes(String(w).toLowerCase()))).toHaveLength(1)
    }
  })

  it('внутри одного прогона результат стабилен', () => {
    const ids = bridgeIds()
    expect(buildA0Options(ids, 12345)).toEqual(buildA0Options(ids, 12345))
  })

  it('в разных прогонах отличается не только порядок, но и сам набор слов', () => {
    // Ради этого сид и включает прогон. Иначе позиция верного ответа —
    // общеизвестная константа, а мост это ворота: два верных ответа сбрасывают
    // θ на A1 и возвращают ученика в основной тест.
    const ids = bridgeIds()
    const seen = new Set()
    for (let seed = 0; seed < 40; seed += 1) {
      const opts = buildA0Options(ids, seed)[ids[0]]
      seen.add(JSON.stringify([...opts].sort()))
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('отвлекающие не сводятся к трём первым словам набора', () => {
    // Прежний срез `slice(0, 3)` без перемешивания давал `is, are, am` и к
    // `works`, и к `can`: верным всегда оказывалось единственное слово другого
    // рода, и мост проходился выбором непохожего, без знания языка.
    const { keys } = loadFullBank()
    const ids = bridgeIds()
    const distractorsSeen = new Set()
    for (let seed = 0; seed < 40; seed += 1) {
      for (const [id, opts] of Object.entries(buildA0Options(ids, seed))) {
        const answers = (keys[id]?.answer || []).map((a) => a.toLowerCase())
        for (const w of opts) {
          if (!answers.includes(String(w).toLowerCase())) distractorsSeen.add(String(w).toLowerCase())
        }
      }
    }
    expect(distractorsSeen.size).toBeGreaterThan(A0_OPTION_COUNT - 1)
  })

  it('пустой и мусорный вход ничего не выдаёт', () => {
    expect(buildA0Options([])).toEqual({})
    expect(buildA0Options(['нет-такого', 'rt-a2-01'])).toEqual({})
  })

  it('набор отвлекающих не пуст и состоит из служебных слов A0', () => {
    expect(A0_DISTRACTORS.length).toBeGreaterThanOrEqual(A0_OPTION_COUNT)
  })
})
