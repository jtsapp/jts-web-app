// Ревью Практики 08.10.2026, #72: порог «поёт / молчит» был max(3 × фон,
// 0.012). Микрофон открыт без автоусиления, и с ноутбука на столе голос
// приходит на ~0.006 RMS (замер «Аркады», PR #526): такого певца маска не
// слышала вовсе — ритм, покрытие и темп по нулям, хотя он пел всю песню.
// Тот же пол в «Аркаде» уже заменили порогом от голоса самого ученика.
import { describe, it, expect } from 'vitest'
import { createSingingGate, introAt, MIN_THRESHOLD } from './singingGate.js'

// Детерминированный «шум» вокруг уровня: без Math.random, чтобы тест не мигал.
const around = (level, k, spread = 0.35) => level * (1 + spread * Math.sin(k * 1.7) * Math.cos(k * 0.6))
const frames = (n, level, from = 0) => Array.from({ length: n }, (_, k) => around(level, k + from))

function run(gate, seq) {
  return seq.map(([rms, intro]) => gate.step(rms, intro))
}
const share = (bits) => bits.filter(Boolean).length / bits.length
// Сглаживание как в mic.js: кадр «поёт», если из последних пяти громче порога
// хотя бы три. Одиночный хлопок или вдох маску не меняют.
const smooth = (bits) => bits.map((_, k) => bits.slice(Math.max(0, k - 4), k + 1).filter(Boolean).length >= 3)
const OLD = (floor) => Math.max(floor * 3, 0.012)

describe('порог голоса караоке', () => {
  it('тихий микрофон: голос на 0.006 слышен (старый пол 0.012 не слышал ни кадра)', () => {
    const gate = createSingingGate({ floor: 0.0008 })
    const intro = frames(40, 0.0008).map((r) => [r, true])
    const voice = frames(120, 0.006).map((r) => [r, false])
    const out = run(gate, [...intro, ...voice])
    expect(share(out.slice(0, 40))).toBe(0)
    expect(share(out.slice(40))).toBeGreaterThan(0.9)
    expect(share(voice.map(([r]) => r > OLD(0.0008)))).toBe(0)
  })

  it('громкий певец: порог не строже прежнего, дыхание между строками — не пение', () => {
    const gate = createSingingGate({ floor: 0.002 })
    const seq = []
    for (let line = 0; line < 4; line++) {
      seq.push(...frames(60, 0.12, line * 100).map((r) => [r, false]))
      // Пауза между строками: дыхание и стук по столу около 0.005.
      seq.push(...frames(60, 0.005, line * 100 + 60).map((r) => [r, false]))
    }
    const out = smooth(run(gate, seq))
    const sung = out.filter((_, k) => Math.floor(k / 60) % 2 === 0)
    // Первые кадры паузы ещё держит хвост сглаживания (как и раньше) — дыхание
    // смотрим после него.
    const gaps = out.filter((_, k) => Math.floor(k / 60) % 2 === 1 && k % 60 >= 4)
    expect(share(sung)).toBeGreaterThan(0.95)
    expect(share(gaps)).toBe(0)
    // Посреди строки порог не выше прежнего пола: громкий вход не страдает.
    const g2 = createSingingGate({ floor: 0.002 })
    run(g2, frames(60, 0.12).map((r) => [r, false]))
    expect(g2.threshold()).toBeLessThanOrEqual(0.012)
  })

  it('музыка из динамиков во вступлении не становится «пением», голос над ней слышен', () => {
    const gate = createSingingGate({ floor: 0.001 })
    // Калибровка шла до музыки, поэтому фон тихий, а вступление — 0.005.
    const intro = frames(80, 0.005).map((r) => [r, true])
    const voice = frames(80, 0.03).map((r) => [r, false])
    // Проигрыш в конце — та же музыка, но уже не вступление.
    const outro = frames(80, 0.005, 7).map((r) => [r, false])
    const out = run(gate, [...intro, ...voice, ...outro])
    expect(share(out.slice(0, 80))).toBe(0)
    expect(share(out.slice(80, 160))).toBeGreaterThan(0.95)
    expect(share(out.slice(160))).toBe(0)
  })

  it('остаток музыки учится только по вступлению: спетая «пауза» середины песни порог не задирает', () => {
    // На проде таймкоды неточные — «пауза» в середине бывает спетой. Если бы
    // порог учился и по ней, он поднялся бы над голосом самого певца.
    const gate = createSingingGate({ floor: 0.001 })
    run(gate, frames(40, 0.002).map((r) => [r, true]))
    const out = run(gate, frames(200, 0.006, 3).map((r) => [r, false]))
    expect(share(out.slice(-80))).toBeGreaterThan(0.9)
  })

  it('порог не опускается ниже абсолютного минимума', () => {
    const gate = createSingingGate({ floor: 0 })
    run(gate, frames(100, 0.0001).map((r) => [r, true]))
    expect(gate.threshold()).toBe(MIN_THRESHOLD)
  })
})

describe('introAt — вступление до первой строки', () => {
  const lines = [
    { id: 1, start: 4, end: 6, text: 'a' },
    { id: 2, start: 8, end: 10, text: 'b' },
  ]
  const intro = introAt(lines)

  it('до первой строки без полусекунды — вступление; дальше нет, включая проигрыши', () => {
    expect(intro(0)).toBe(true)
    expect(intro(3.4)).toBe(true)
    expect(intro(3.6)).toBe(false)
    expect(intro(7)).toBe(false)
    expect(intro(12)).toBe(false)
  })

  it('без строк вступления нет', () => {
    expect(introAt([])(1)).toBe(false)
  })
})
