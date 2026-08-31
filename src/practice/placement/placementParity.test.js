// Сверка перенесённого движка с бандлом школы.
//
// Расчётная часть теста перенесена из jts-placement.html один в один
// (scripts/extract-placement.js → engine.generated.js), и главный риск такого
// переноса — тихое расхождение формул: уровень студента посчитается чуть иначе,
// и заметить это по экрану невозможно.
//
// Эталоны в __fixtures__/parity.json сняты прогоном ОРИГИНАЛЬНОГО движка из
// бандла: пять моделей студента × два варианта теста × восемь сидов. Симуляция
// детерминирована (mulberry32 от сида), поэтому порт обязан выдавать те же
// θ, SE, уровень, флаги и разбивку по навыкам — до последнего знака.
import { describe, it, expect, beforeAll } from 'vitest'
import { simulateSession } from './engine.generated.js'
import { loadFullBank } from '../../lib/placementScore.js'
import parity from './__fixtures__/parity.json'

let data

beforeAll(() => {
  // Публичный банк отдаётся без ответов (bankSplit.js), поэтому прогон идёт по
  // полному: публичная часть + ключи. Если бы сборка расходилась с исходным
  // банком, эталоны бандла ниже не сошлись бы.
  data = loadFullBank()
})

describe('движок placement совпадает с бандлом школы', () => {
  it('банк доехал целиком', () => {
    expect(data.bank.items.length).toBeGreaterThan(160)
    expect(Object.keys(data.vocab).length).toBeGreaterThan(50)
  })

  it.each(parity)(
    '$variant / $pattern / seed $seed → $level',
    ({ variant, pattern, seed, level, theta, se, flags, skills }) => {
      const r = simulateSession(data.bank, data.manifest, data.vocab, seed, pattern, variant).result()

      expect(r.level).toBe(level)
      expect(r.theta).toBeCloseTo(theta, 10)
      expect(r.se).toBeCloseTo(se, 10)
      expect(r.flags).toEqual(flags)
      expect(r.skills).toEqual(skills)
    },
  )
})
