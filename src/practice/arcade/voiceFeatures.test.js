import { describe, expect, it } from 'vitest'
import { MIN_HESITATION, analyseFrame, createSteadinessTracker } from './voiceFeatures.js'

// Порт javaTest tests/voiceFeatures.test.ts: синтетический гласный звук вместо
// записи — детектор проверяется на известной высоте и форманте.

const RATE = 48000
const HOP = 800
const WINDOW = 2048
let seed = 3
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1

// Гармоники f0(t) с формантными пиками: грубый, но звонкий гласный.
function vowel(seconds, f0, formants, level = () => 1) {
  const x = new Float32Array(Math.round(seconds * RATE))
  let phase = 0
  for (let i = 0; i < x.length; i++) {
    const t = i / RATE
    const f = f0(t)
    phase += (2 * Math.PI * f) / RATE
    let sum = 0
    for (let k = 1; k * f < 4000; k++) {
      const hz = k * f
      const gain = formants(t).reduce((g, F) => g + 1 / (1 + ((hz - F) / 90) ** 2), 0)
      sum += gain * Math.sin(k * phase)
    }
    x[i] = 0.02 * level(t) * sum
  }
  return x
}

// Прогон сигнала через анализатор и детектор с шагом кадров игры.
function track(x) {
  const tracker = createSteadinessTracker()
  let firstHesitation = -1
  for (let i = 0; i + WINDOW <= x.length; i += HOP) {
    const t = i / RATE
    if (tracker.update(analyseFrame(x.subarray(i, i + WINDOW), RATE), t)) if (firstHesitation < 0) firstHesitation = t
  }
  tracker.finish()
  return { runs: tracker.runs, firstHesitation }
}

describe('arcade voice features', () => {
  it('высота и чистота отличают голос от шума', () => {
    const voiced = analyseFrame(vowel(0.1, () => 150, () => [600, 1250]).subarray(0, WINDOW), RATE)
    expect(Math.abs(voiced.pitch - 150) / 150).toBeLessThan(0.02)
    expect(voiced.clarity).toBeGreaterThan(0.9)
    expect(voiced.spectrum).toHaveLength(16)
    const noise = analyseFrame(Float32Array.from({ length: WINDOW }, () => random() * 0.05), RATE)
    expect(noise.clarity).toBeLessThan(0.5)
  })

  it('протяжное падающее «э-э-э» становится заминкой после минимального времени', () => {
    const { runs, firstHesitation } = track(
      vowel(1.2, (t) => 130 - 20 * t, () => [600, 1250, 2500], (t) => 1 - 0.5 * t),
    )
    expect(runs).toHaveLength(1)
    expect(runs[0].end - runs[0].start).toBeGreaterThan(1)
    expect(firstHesitation).toBeGreaterThanOrEqual(MIN_HESITATION)
    expect(firstHesitation).toBeLessThan(MIN_HESITATION + 0.1)
  })

  it('смена гласных, плавающая высота и шум заминкой не бывают', () => {
    const sets = [
      [300, 2300],
      [700, 1200],
      [500, 1800],
      [400, 900],
    ]
    const syllables = track(
      vowel(
        2,
        (t) => 140 + 30 * Math.sin(t * 6),
        (t) => sets[Math.floor(t / 0.15) % sets.length],
        (t) => 0.2 + 0.8 * Math.abs(Math.sin((Math.PI * t) / 0.15)),
      ),
    )
    expect(syllables.firstHesitation).toBe(-1)
    const noise = track(Float32Array.from({ length: RATE }, () => random() * 0.05))
    expect(noise.runs).toEqual([])
  })
})
