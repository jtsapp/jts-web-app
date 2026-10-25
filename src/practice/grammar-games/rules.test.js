import { describe, expect, it } from 'vitest'
import oracle from './__fixtures__/oracle.json'
import bundle from './__fixtures__/bundle.json'
import { GAME_KEYS, acc, stagesOf } from './stages.js'
import { lookUp, norm, wrapEN } from './text.js'
import { levelOf } from './levelOf.js'

// Сверка с тем, что считает сам прототип (scripts/grammar-games/extract-oracle.js):
// красный тест — порт разъехался с исходником, чинить порт.
describe('«Грамматика · игры»: правила = прототип', () => {
  it('набор игр каждой темы — как у прототипа и у бэкенда', () => {
    for (const [id, want] of Object.entries(oracle.stages)) {
      expect(stagesOf(bundle.topics[id]), id).toEqual(want)
      expect(bundle.index.topics.find((t) => t.id === id).games, id).toEqual(want)
      for (const g of want) expect(GAME_KEYS).toContain(g)
    }
    expect(stagesOf(bundle.topics['L1-10'])).toContain('place')
    expect(stagesOf(bundle.topics['L2-22'])).not.toContain('sort')
  })

  it('пороги звёзд', () => {
    for (const [ok, n, s] of oracle.acc) expect(acc(ok, n), `${ok}/${n}`).toBe(s)
  })

  it('поиск перевода с отбрасыванием окончаний и порядковые', () => {
    for (const [k, v] of Object.entries(oracle.look)) expect(lookUp(bundle.gloss, k), k).toEqual(v)
  })

  it('разбор строки на кликабельные слова', () => {
    for (const [s, html] of Object.entries(oracle.wrap)) {
      // строка с кавычкой — починка прототипа (text.js), её ждём отдельно ниже
      if (/[&<>"]/.test(s)) continue
      expect(wrapEN(s), s).toBe(html)
    }
  })

  it('кавычка не попадает в слово (починка: у прототипа «&quot;Don\'t»)', () => {
    expect(wrapEN('"Don\'t go!" — he said.')).toBe(
      '&quot;<span class="w" data-k="don\'t">Don\'t</span> <span class="w" data-k="go">go</span>!&quot; — <span class="w" data-k="he">he</span> <span class="w" data-k="said">said</span>.',
    )
  })

  it('нормализация набранного ответа', () => {
    for (const [s, v] of Object.entries(oracle.norm)) expect(norm(s), s).toBe(v)
  })
})

describe('уровень по профилю (Д11)', () => {
  it.each([
    ['A0', 'L1'], ['a1', 'L2'], ['A2', 'L3'], ['B1', 'L4'], ['B1+', 'L4'], ['B2', 'L5'], ['C1', 'L5'], ['C2', 'L5'],
    [null, 'L1'], ['', 'L1'], ['xx', 'L1'],
  ])('%s → %s', (lv, want) => expect(levelOf(lv)).toBe(want))
})
