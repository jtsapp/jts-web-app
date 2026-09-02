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
import { readFileSync } from 'node:fs'
import { simulateSession, mergeBank2 } from './engine.generated.js'
import parity from './__fixtures__/parity.json'
import { fileURLToPath } from 'node:url'

// fileURLToPath: на Windows .pathname отдаёт «/C:/…» и путь склеивался в «C:\C:\…».
const BANK_PATH = fileURLToPath(new URL('../../../public/practice/placement/bank.json', import.meta.url))

let data

beforeAll(() => {
  data = JSON.parse(readFileSync(BANK_PATH, 'utf8'))
  // В бандле слияние дополнительного банка выполняется на верхнем уровне;
  // здесь данные приходят снаружи, поэтому сливаем их так же перед прогоном.
  mergeBank2(data.bank, data.manifest, data.bank2)
})

describe('движок placement совпадает с бандлом школы', () => {
  it('банк доехал целиком', () => {
    expect(data.bank.items.length).toBeGreaterThan(160)
    expect(Object.keys(data.vocab).length).toBeGreaterThan(50)
    expect(data.appliedPatches.length).toBeGreaterThan(0)
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
