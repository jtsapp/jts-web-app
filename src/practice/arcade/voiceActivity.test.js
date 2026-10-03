import { describe, expect, it } from 'vitest'
import { ONSET_MS, RELEASE_MS, createVoiceActivity } from './voiceActivity.js'

// Порог голоса «Аркады» против уровня самого говорящего. Микрофон открыт без
// автоусиления, поэтому один и тот же внятный голос приходит и на 0.2 RMS
// (гарнитура), и на 0.006 (ноутбук на столе) — порог обязан слышать оба.
// Кадры по 20 мс, как примерно идут кадры анимации.

const QUIET_ROOM = 0.0005 // шум комнаты после шумодава браузера

// Прогоняет отрезок: `level` громкость кадра, `pitched` — есть ли у кадра
// высота (гласная). Возвращает, какая доля кадров отрезка засчитана голосом.
function feed(detect, clock, ms, level, pitched) {
  let voiced = 0
  let frames = 0
  for (const end = clock.now + ms; clock.now < end; clock.now += 20) {
    frames++
    if (detect(level, clock.now, pitched)) voiced++
  }
  return voiced / frames
}

describe('порог голоса', () => {
  it('тихий, но внятный микрофон: речь на 0.006 RMS засчитывается', () => {
    const detect = createVoiceActivity(QUIET_ROOM)
    const clock = { now: 0 }
    expect(feed(detect, clock, 2000, 0.006, true)).toBeGreaterThan(0.9)
  })

  it('громкий голос: звук на 36 дБ тише его гласных — тишина, как и раньше', () => {
    const detect = createVoiceActivity(QUIET_ROOM)
    const clock = { now: 0 }
    expect(feed(detect, clock, 2000, 0.25, true)).toBeGreaterThan(0.9)
    feed(detect, clock, RELEASE_MS + 40, 0.004, false)
    expect(feed(detect, clock, 1000, 0.004, false)).toBe(0)
  })

  it('стук по столу не задирает порог: тихая речь сразу после него слышна', () => {
    const detect = createVoiceActivity(QUIET_ROOM)
    const clock = { now: 0 }
    feed(detect, clock, 100, 0.5, false)
    feed(detect, clock, 1000, 0.0002, false)
    expect(feed(detect, clock, 1000, 0.006, true)).toBeGreaterThan(0.9)
  })

  it('после громкой речи и паузы тихая речь снова слышна', () => {
    const detect = createVoiceActivity(QUIET_ROOM)
    const clock = { now: 0 }
    feed(detect, clock, 2000, 0.25, true)
    feed(detect, clock, 8000, 0.0002, false)
    const start = clock.now
    feed(detect, clock, ONSET_MS + 40, 0.006, true)
    expect(detect(0.006, clock.now, true)).toBe(true)
    expect(clock.now - start).toBeLessThan(200)
  })
})
