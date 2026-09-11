// Сверка сборки сессии с оракулом: пул и разбивку на раунды в фикстурах
// посчитал САМ прототип (scripts/extract-words.js). Красный тест здесь значит,
// что порт разъехался с исходником, и чинить надо порт.

import { describe, expect, it } from 'vitest'
import { ROUND_SIZE, buildSession, makeRng, poolFor, separateConfusables, shuffle } from './session.js'
import { SECTIONS, loadFixture, loadSection } from './__fixtures__/testData.js'

describe('оракул: пул и раунды', () => {
  for (const section of SECTIONS) {
    it(`${section}: пул, раунды и их состав совпадают с прототипом`, () => {
      const { scenes, words, confusable } = loadSection(section)
      const oracle = loadFixture(section)
      for (const scene of scenes) {
        const rng = makeRng(oracle.seed)
        const s = buildSession(scene, words, { rng, portrait: oracle.portrait, confusable })
        expect(s.pool.map((w) => w.id), `${section}/${scene.id}: пул`).toEqual(oracle.scenes[scene.id].pool)
        expect(
          s.rounds.map((r) => r.map((w) => w.id)),
          `${section}/${scene.id}: раунды`,
        ).toEqual(oracle.scenes[scene.id].rounds)
      }
    })
  }
})

describe('пул сцены', () => {
  it('берёт домашние слова и гостей из соседней сцены', () => {
    const words = [
      { id: 'a', env: 'farm', also: null },
      { id: 'b', env: 'ocean', also: 'farm' },
      { id: 'c', env: 'ocean', also: null },
    ]
    expect(poolFor({ id: 'farm' }, words).map((w) => w.id)).toEqual(['a', 'b'])
  })
})

describe('нарезка на раунды', () => {
  const scene = { id: 's', slots: [] }
  const words = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, env: 's', also: null }))

  it('режет поровну, а не «по восемь и остаток»', () => {
    // 9 слов при размере раунда 8 — это 5 и 4, а не 8 и 1: раунд из одного
    // слова выглядит поломкой.
    const { rounds } = buildSession(scene, words(9), { seed: 1 })
    expect(rounds.map((r) => r.length)).toEqual([5, 4])
  })

  it('пул меньше раунда остаётся одним раундом', () => {
    const { rounds } = buildSession(scene, words(4), { seed: 1 })
    expect(rounds.map((r) => r.length)).toEqual([4])
  })

  it('в портрете раунды короче', () => {
    const land = buildSession(scene, words(8), { seed: 1 })
    const port = buildSession(scene, words(8), { seed: 1, portrait: true })
    expect(land.rounds.map((r) => r.length)).toEqual([8])
    expect(port.rounds.map((r) => r.length)).toEqual([4, 4])
  })

  it('раунды покрывают весь пул без потерь и дублей', () => {
    const { pool, rounds } = buildSession(scene, words(23), { seed: 7 })
    const flat = rounds.flat().map((w) => w.id)
    expect(new Set(flat).size).toBe(flat.length)
    expect([...flat].sort()).toEqual([...pool.map((w) => w.id)].sort())
  })

  it('размер раунда — восемь слов', () => {
    expect(ROUND_SIZE).toBe(8)
  })
})

describe('путаемые пары', () => {
  it('разводятся по разным раундам', () => {
    const rounds = [
      [{ id: 'frog' }, { id: 'toad' }, { id: 'cow' }],
      [{ id: 'pig' }, { id: 'hen' }, { id: 'dog' }],
    ]
    separateConfusables(rounds, [['frog', 'toad']])
    const withFrog = rounds.findIndex((r) => r.some((x) => x.id === 'frog'))
    const withToad = rounds.findIndex((r) => r.some((x) => x.id === 'toad'))
    expect(withFrog).not.toBe(withToad)
  })

  it('единственный раунд не трогается: разводить некуда', () => {
    const rounds = [[{ id: 'frog' }, { id: 'toad' }]]
    separateConfusables(rounds, [['frog', 'toad']])
    expect(rounds).toEqual([[{ id: 'frog' }, { id: 'toad' }]])
  })

  // Алгоритм прототипа — обмен «одного из пары на непутаемое слово соседнего
  // раунда» — разводит одиночные пары, но пасует на КЛАСТЕРАХ: у mouth в
  // списке четыре соседа (lips, teeth, tongue, throat), и в маленькой сцене
  // из двух раундов непутаемого кандидата на обмен попросту нет.
  // Порт обязан совпадать с исходником, поэтому фиксируем ровно то, что есть:
  // два известных случая и ни одного нового.
  const KNOWN_STUCK = ['body/face mouth~teeth', 'body/body hand~thumb']

  it('на реальных сценах остаются только два известных кластера', () => {
    const stuck = new Set()
    for (const section of SECTIONS) {
      const { scenes, words, confusable } = loadSection(section)
      if (!confusable.length) continue
      for (const scene of scenes) {
        for (let seed = 1; seed <= 20; seed++) {
          const { rounds } = buildSession(scene, words, { seed, confusable })
          if (rounds.length < 2) continue
          for (const [a, b] of confusable) {
            const ra = rounds.findIndex((r) => r.some((x) => x.id === a))
            const rb = rounds.findIndex((r) => r.some((x) => x.id === b))
            if (ra < 0 || rb < 0 || ra !== rb) continue
            stuck.add(`${section}/${scene.id} ${a}~${b}`)
          }
        }
      }
    }
    expect([...stuck].sort()).toEqual([...KNOWN_STUCK].sort())
  })
})

describe('makeRng и shuffle', () => {
  it('один сид — одна и та же перетасовка', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(list, makeRng(3))).toEqual(shuffle(list, makeRng(3)))
  })

  it('исходный список не трогается', () => {
    const list = [1, 2, 3, 4, 5]
    shuffle(list, makeRng(1))
    expect(list).toEqual([1, 2, 3, 4, 5])
  })
})
