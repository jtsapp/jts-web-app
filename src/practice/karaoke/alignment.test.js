import { describe, it, expect } from 'vitest'
import {
  trackAt,
  lineWindows,
  planSegments,
  tokenOf,
  scoreAssessment,
  transcriptInLineOrder,
  RHYTHM_GOOD_SEC,
  RHYTHM_MAX_SHIFT_SEC,
} from './alignment.js'

// Замеры «секунда записи → секунда трека» раз в 50 мс, как их пишет mic.js.
// `rate` — скорость трека, `lead` — сколько запись шла до старта трека.
function linearMap({ from = 0, to = 20, rate = 1, lead = 0.3, step = 0.05 }) {
  const out = []
  for (let rec = 0; rec <= lead + (to - from) / rate + 1e-9; rec += step) {
    out.push({ rec, track: rec < lead ? from : from + (rec - lead) * rate })
  }
  return out
}

const LINES = [
  { id: 1, start: 1, end: 4, text: 'We were good, we were gold', words: [] },
  { id: 2, start: 5, end: 8, text: 'Kinda dream that can’t be sold', words: [] },
  { id: 3, start: 12, end: 15, text: 'We were right ’til we weren’t', words: [] },
]

// Слова от Azure так, будто их спели ровно по разметке (со сдвигом `late`).
// Время — в секундах ЗАПИСИ: переводим обратно через ту же карту.
function azureWordsFor(line, { map, late = 0, accuracy = 90 }) {
  const parts = line.text.split(/\s+/)
  const total = parts.reduce((s, p) => s + p.length, 0)
  let acc = 0
  return parts.map((p) => {
    const t = line.start + (acc / total) * (line.end - line.start) + late
    acc += p.length
    return { word: p.replace(/[,]/g, ''), accuracy, error: 'None', start: recAt(map, t), end: recAt(map, t) + 0.2 }
  })
}

function recAt(map, track) {
  // Обратная карта для тестов: первая запись, где трек дошёл до `track`.
  for (let i = 1; i < map.length; i++) {
    const a = map[i - 1]
    const b = map[i]
    if (a.track <= track && b.track >= track && b.track > a.track) {
      return a.rec + ((track - a.track) / (b.track - a.track)) * (b.rec - a.rec)
    }
  }
  return map.at(-1).rec
}

function respond(plan, map, byLine) {
  return plan.map((s) => ({
    id: s.id,
    transcript: s.lineIds.map((id) => LINES.find((l) => l.id === id).text).join(' '),
    words: s.lineIds.flatMap((id) => byLine(LINES.find((l) => l.id === id), map)),
  }))
}

describe('время записи → время трека', () => {
  it('до старта трека позиция стоит, дальше идёт со скоростью трека', () => {
    const map = linearMap({ rate: 0.75, lead: 0.5 })
    expect(trackAt(map, 0.2)).toBe(0)
    expect(trackAt(map, 0.5 + 4)).toBeCloseTo(3, 5)
  })

  it('за пределами замеров — края, а не экстраполяция', () => {
    const map = linearMap({ to: 5 })
    expect(trackAt(map, -1)).toBe(0)
    expect(trackAt(map, 999)).toBeCloseTo(5, 5)
    expect(trackAt([], 1)).toBeNull()
  })
})

describe('окна строк в записи', () => {
  it('на замедлении окно шире во столько же раз', () => {
    const w1 = lineWindows(LINES, linearMap({ rate: 1 })).get(2)
    const w075 = lineWindows(LINES, linearMap({ rate: 0.75 })).get(2)
    expect((w075.to - w075.from) / (w1.to - w1.from)).toBeCloseTo(1 / 0.75, 1)
  })

  it('после перемотки назад берётся последний проход по строке', () => {
    // Спели до 9 с, отмотали на 4 с и спели ещё раз.
    const map = []
    let rec = 0
    for (let t = 0; t <= 9; t += 0.05, rec += 0.05) map.push({ rec, track: t })
    for (let t = 4; t <= 10; t += 0.05, rec += 0.05) map.push({ rec, track: t })
    const w = lineWindows(LINES, map).get(2)
    expect(w.from).toBeGreaterThan(9) // второй проход, а не первый
  })

  it('строки, до которых не дошли, окна не получают', () => {
    const w = lineWindows(LINES, linearMap({ to: 9 }))
    expect(w.has(2)).toBe(true)
    expect(w.has(3)).toBe(false)
  })
})

describe('нарезка записи на куски', () => {
  it('близкие строки — в один кусок, через проигрыш — в разные', () => {
    const plan = planSegments(LINES, lineWindows(LINES, linearMap({})))
    expect(plan.map((s) => s.lineIds)).toEqual([[1, 2], [3]])
    expect(plan[0].text).toBe('We were good, we were gold Kinda dream that can’t be sold')
  })

  it('куски не перекрываются', () => {
    const lines = [
      { id: 1, start: 1, end: 10, text: 'a b c', words: [] },
      { id: 2, start: 10.5, end: 20, text: 'd e f', words: [] },
    ]
    // maxSec мал — строки не склеятся, а поля окон перекроются.
    const plan = planSegments(lines, lineWindows(lines, linearMap({ to: 22 })), { maxSec: 10 })
    expect(plan).toHaveLength(2)
    expect(plan[0].to).toBeLessThanOrEqual(plan[1].from)
  })

  it('текст склеивается в порядке строк, даже если запись шла иначе', () => {
    // Спели 1–3, отмотали к первой и спели 1–2 заново: в записи третья
    // строка теперь раньше первых двух.
    const map = []
    let rec = 0
    for (let t = 0; t <= 16; t += 0.05, rec += 0.05) map.push({ rec, track: t })
    for (let t = 0; t <= 9.5; t += 0.05, rec += 0.05) map.push({ rec, track: t })
    const plan = planSegments(LINES, lineWindows(LINES, map))
    expect(plan.map((s) => s.lineIds)).toEqual([[3], [1, 2]])
    const segments = plan.map((s) => ({ id: s.id, transcript: s.lineIds.join('+') }))
    expect(transcriptInLineOrder(LINES, plan, segments)).toBe('1+2 3')
  })

  it('пропущенная строка рвёт кусок, чтобы эталон совпадал с записью', () => {
    const windows = lineWindows(LINES, linearMap({}))
    windows.delete(2)
    const plan = planSegments(LINES, windows)
    expect(plan.map((s) => s.lineIds)).toEqual([[1], [3]])
  })
})

describe('слова', () => {
  it('сравнение без регистра, пунктуации и кривых апострофов', () => {
    expect(tokenOf('Gold,')).toBe('gold')
    expect(tokenOf('can’t')).toBe("can't")
    expect(tokenOf('’til')).toBe('til')
    expect(tokenOf('—')).toBe('')
  })
})

describe('ритм и произношение по словам', () => {
  const map = linearMap({})
  const plan = planSegments(LINES, lineWindows(LINES, map))

  it('спето ровно по разметке — ритм 100, произношение = точность слов', () => {
    const segments = respond(plan, map, (line, m) => azureWordsFor(line, { map: m, accuracy: 84 }))
    const r = scoreAssessment({ lines: LINES, plan, segments, timeMap: map })
    expect(r.rhythm).toBe(100)
    expect(r.pron).toBe(84)
  })

  it('постоянное опоздание до 0,3 с прощается (Bluetooth-наушники)', () => {
    const segments = respond(plan, map, (line, m) => azureWordsFor(line, { map: m, late: 0.28 }))
    const r = scoreAssessment({ lines: LINES, plan, segments, timeMap: map })
    expect(r.shift).toBeCloseTo(0.28, 1)
    expect(r.rhythm).toBe(100)
  })

  it('опоздание больше прощённого — в минус, спешка не прощается вовсе', () => {
    const late = scoreAssessment({
      lines: LINES,
      plan,
      segments: respond(plan, map, (line, m) => azureWordsFor(line, { map: m, late: 0.9 })),
      timeMap: map,
    })
    expect(late.shift).toBe(RHYTHM_MAX_SHIFT_SEC)
    expect(late.rhythm).toBeLessThan(100)
    expect(late.rhythm).toBeGreaterThan(0)

    const early = scoreAssessment({
      lines: LINES,
      plan,
      segments: respond(plan, map, (line, m) => azureWordsFor(line, { map: m, late: -(RHYTHM_GOOD_SEC + 0.3) })),
      timeMap: map,
    })
    expect(early.shift).toBe(0)
    expect(early.rhythm).toBeLessThan(100)
  })

  it('на скорости 0,75× ритм считается во времени трека и не страдает', () => {
    const slow = linearMap({ rate: 0.75 })
    const slowPlan = planSegments(LINES, lineWindows(LINES, slow))
    const segments = respond(slowPlan, slow, (line, m) => azureWordsFor(line, { map: m }))
    const r = scoreAssessment({ lines: LINES, plan: slowPlan, segments, timeMap: slow })
    expect(r.rhythm).toBe(100)
  })

  it('непропетая строка тянет ритм и произношение вниз', () => {
    // Третью строку Azure не услышал: все её слова — Omission, без времени.
    const segments = respond(plan, map, (line, m) =>
      line.id === 3
        ? line.text.split(/\s+/).map((p) => ({ word: p, accuracy: 0, error: 'Omission', start: null, end: null }))
        : azureWordsFor(line, { map: m, accuracy: 90 }),
    )
    const r = scoreAssessment({ lines: LINES, plan, segments, timeMap: map })
    expect(r.rhythm).toBe(67) // две строки из трёх
    expect(r.pron).toBe(60)
    // «Спета ли строка» — тоже по услышанным словам, а не по громкости: иначе
    // тихий голос давал бы «пропущено» рядом с высоким баллом за слова.
    expect(r.perLine.map((l) => l.sung)).toEqual([true, true, false])
  })

  it('строка спета, если прозвучала хотя бы половина её слов', () => {
    const segments = respond(plan, map, (line, m) =>
      azureWordsFor(line, { map: m }).map((w, i) => (line.id === 1 && i >= 3 ? { ...w, error: 'Omission', start: null } : w)),
    )
    const r = scoreAssessment({ lines: LINES, plan, segments, timeMap: map })
    expect(r.perLine[0]).toMatchObject({ heard: 3, total: 6, sung: true })
  })

  it('без пословной разметки якорь — начало строки; с ней — каждое слово', () => {
    const withWords = LINES.map((l) =>
      l.id === 1
        ? {
            ...l,
            // Слова в строке идут неравномерно: интерполяция по буквам тут бы
            // промахнулась, а пословные таймкоды — нет.
            words: [
              { w: 'We', t: 1 },
              { w: 'were', t: 1.2 },
              { w: 'good,', t: 1.4 },
              { w: 'we', t: 3 },
              { w: 'were', t: 3.2 },
              { w: 'gold', t: 3.4 },
            ],
          }
        : l,
    )
    const segments = respond(plan, map, (line, m) =>
      line.id === 1
        ? withWords[0].words.map((w) => ({ word: w.w, accuracy: 90, error: 'None', start: recAt(m, w.t), end: recAt(m, w.t) + 0.2 }))
        : azureWordsFor(line, { map: m }),
    )
    const r = scoreAssessment({ lines: withWords, plan, segments, timeMap: map })
    expect(r.rhythm).toBe(100)
  })

  it('худшие по произношению слова — для подсказки на экране результата', () => {
    const segments = respond(plan, map, (line, m) =>
      azureWordsFor(line, { map: m }).map((w) =>
        w.word === 'dream' ? { ...w, accuracy: 31, error: 'Mispronunciation' } : w.word === 'weren’t' ? { ...w, accuracy: 45 } : w,
      ),
    )
    const r = scoreAssessment({ lines: LINES, plan, segments, timeMap: map })
    expect(r.hard).toEqual(['dream', 'weren’t'])
  })
})
