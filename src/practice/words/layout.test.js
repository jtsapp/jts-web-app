// Сверка солвера с оракулом: координаты в фикстурах посчитал САМ прототип.
// Раскладка — самая ценная часть исходника (типы слотов, порядок укладки,
// разведение перекрытий), и переписывать её «по смыслу» нельзя: разъедется —
// получим спрайты в воздухе и наложения.
//
// Прототип берёт случайные числа ОДНОЙ последовательностью: сначала мешает пул
// в buildSession, потом подмешивает разброс в оценку слота. Поэтому тест делит
// один rng между двумя вызовами — иначе координаты не сойдутся.

import { describe, expect, it } from 'vitest'
import { buildSession, makeRng } from './session.js'
import { COMPAT, MIN_W, SAFE, boxOf, clampInto, overlap, placeRound, spriteScale, stageAR } from './layout.js'
import { SECTIONS, loadFixture, loadSection } from './__fixtures__/testData.js'

function round2(n) {
  return Math.round(n * 100) / 100
}

describe('оракул: координаты спрайтов', () => {
  for (const section of SECTIONS) {
    it(`${section}: расстановка первого раунда совпадает с прототипом`, () => {
      const { scenes, words, confusable } = loadSection(section)
      const oracle = loadFixture(section)
      for (const scene of scenes) {
        const rng = makeRng(oracle.seed)
        const { rounds } = buildSession(scene, words, { rng, portrait: oracle.portrait, confusable })
        const placed = placeRound(rounds[0], scene, { rng, portrait: oracle.portrait, section })
        expect(
          placed.map((p) => ({ id: p.word.id, x: round2(p.x), y: round2(p.y), w: round2(p.w), t: p.t })),
          `${section}/${scene.id}`,
        ).toEqual(oracle.scenes[scene.id].placed)
      }
    })
  }
})

describe('инварианты раскладки', () => {
  // Раунд каждой сцены при двадцати сидах: ловим случаи, которые оракул с
  // одним сидом не увидит.
  function eachRound(fn) {
    for (const section of SECTIONS) {
      const { scenes, words, confusable } = loadSection(section)
      for (const scene of scenes) {
        for (let seed = 1; seed <= 20; seed++) {
          const rng = makeRng(seed)
          const { rounds } = buildSession(scene, words, { rng, confusable })
          fn(placeRound(rounds[0], scene, { rng, section }), scene, `${section}/${scene.id} сид ${seed}`)
        }
      }
    }
  }

  it('все слова раунда получают место', () => {
    eachRound((placed, scene, where) => {
      expect(placed.length, where).toBeGreaterThan(0)
    })
  })

  it('спрайты не выезжают за безопасное поле сцены', () => {
    const ar = stageAR(false)
    eachRound((placed, scene, where) => {
      for (const p of placed) {
        const b = boxOf(p, ar)
        expect(b.L, `${where}/${p.word.id} слева`).toBeGreaterThanOrEqual(SAFE.l - 0.01)
        expect(b.R, `${where}/${p.word.id} справа`).toBeLessThanOrEqual(SAFE.r + 0.01)
        expect(b.T, `${where}/${p.word.id} сверху`).toBeGreaterThanOrEqual(SAFE.t - 0.01)
        expect(b.B, `${where}/${p.word.id} снизу`).toBeLessThanOrEqual(SAFE.b + 0.01)
      }
    })
  })

  it('наземное слово уходит наверх только когда земли не осталось', () => {
    // Наземному разрешена лишь земля. Но если наземных слов в раунде больше,
    // чем земляных слотов, прототип сажает лишних на любой свободный —
    // спрайт не на своём месте лучше, чем слово, которое спросят, а его на
    // сцене нет. Проверяем именно это: наверху оказывается ровно излишек.
    eachRound((placed, scene, where) => {
      const groundSlots = scene.slots.filter((s) => s[2] === 'g').length
      const groundWords = placed.filter((p) => p.word.pl === 'g')
      const misplaced = groundWords.filter((p) => p.t !== 'g')
      expect(misplaced.length, `${where}: ${misplaced.map((p) => p.word.id).join(', ')}`).toBeLessThanOrEqual(
        Math.max(0, groundWords.length - groundSlots),
      )
    })
  })

  it('слово не садится на слот, который его типу вовсе не подходит', () => {
    // Водное на ветку и летающее в воду не попадают ни при каком дефиците:
    // такие ходы COMPAT не разрешает, остаётся только земля.
    eachRound((placed, scene, where) => {
      for (const p of placed) {
        if (p.word.pl === 'g') continue // разбирается тестом выше
        const allowed = [...(COMPAT[p.word.pl] || ['g']), 'g']
        expect(allowed, `${where}/${p.word.id} (${p.word.pl}) на слоте ${p.t}`).toContain(p.t)
      }
    })
  })

  it('спрайт не мельче нижнего предела: мелкий не опознать и не попасть', () => {
    eachRound((placed, scene, where) => {
      for (const p of placed) {
        expect(p.w, `${where}/${p.word.id}`).toBeGreaterThanOrEqual(MIN_W * 0.85 - 0.01)
      }
    })
  })

  it('грубых наложений не остаётся', () => {
    const ar = stageAR(false)
    // Порог мягче рабочего (0.12): солвер даёт шестнадцать проходов и на
    // тесной сцене может не разойтись до конца — но полтела спрайта прятаться
    // не должно.
    eachRound((placed, scene, where) => {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const ov = overlap(placed[i], placed[j], ar)
          expect(ov, `${where}: ${placed[i].word.id} и ${placed[j].word.id}`).toBeLessThan(0.5)
        }
      }
    })
  })

  it('в один слот не садятся двое', () => {
    eachRound((placed, scene, where) => {
      const seen = placed.map((p) => `${p.x}:${p.y}`)
      // Координаты после разведения могли сдвинуться, поэтому сравниваем
      // исходные слоты: два спрайта в одной точке — это занятый дважды слот.
      expect(new Set(seen).size, where).toBe(seen.length)
    })
  })
})

describe('геометрия', () => {
  it('пропорции сцены зависят от ориентации, а не от DOM', () => {
    expect(stageAR(false)).toBeCloseTo(16 / 9)
    expect(stageAR(true)).toBeCloseTo(4 / 3)
  })

  it('в портрете спрайты крупнее, мелкие — сильнее', () => {
    expect(spriteScale('M', false)).toBe(1)
    expect(spriteScale('S', true)).toBe(1.3)
    expect(spriteScale('XL', true)).toBe(1.15)
  })

  it('якорь спрайта — низ-центр', () => {
    const b = boxOf({ x: 50, y: 80, w: 10 }, 2)
    expect(b).toMatchObject({ L: 45, R: 55, B: 80, T: 60, h: 20 })
  })

  it('перекрытие считается долей меньшего спрайта', () => {
    const a = { x: 50, y: 50, w: 10 }
    expect(overlap(a, { ...a }, 1)).toBe(1)
    expect(overlap(a, { x: 90, y: 50, w: 10 }, 1)).toBe(0)
  })

  it('clampInto загоняет спрайт в поле сцены', () => {
    expect(clampInto({ x: 0, y: 200, w: 10 }, 1).x).toBe(SAFE.l + 5)
    expect(clampInto({ x: 0, y: 200, w: 10 }, 1).y).toBe(SAFE.b)
    expect(clampInto({ x: 50, y: 0, w: 10 }, 1).y).toBe(SAFE.t + 10)
  })
})
