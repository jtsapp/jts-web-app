import { describe, it, expect } from 'vitest'
import { flatDoc, playerRules, lineAt, speakerNames, formatTime, totalAudioSec, buildTimeline, estimateLineSec, locate, lineOnTimeline, mapScriptTime } from './listening.js'
import { flattenItems } from '../reading/run.js'

const doc = {
  id: 'LST',
  parts: [
    { number: 1, audio: { durationSec: 100 }, groups: [{ type: 'form_completion', range: [1, 2], items: [{ id: 'Q1' }, { id: 'Q2' }] }] },
    { number: 2, audio: { durationSec: 50 }, groups: [{ type: 'multiple_choice_multi', range: [3, 4], items: [{ id: 'Q3', marks: 2 }] }] },
  ],
}

describe('Listening', () => {
  it('части превращаются в сквозной список вопросов с номером части', () => {
    const items = flattenItems(flatDoc(doc))
    expect(items.map((x) => [x.id, x.numbers, x.group.part])).toEqual([['Q1', [1], 1], ['Q2', [2], 1], ['Q3', [3, 4], 2]])
    expect(totalAudioSec(doc)).toBe(150)
  })

  it('экзамен — один раз без паузы и перемотки; тренировка уважает playback теста', () => {
    expect(playerRules('exam')).toEqual({ allowPause: false, allowSeek: false, allowRate: false, maxPlays: 1 })
    expect(playerRules('practice', { maxPlays: 2, allowSeek: false })).toEqual({ allowPause: true, allowSeek: false, allowRate: true, maxPlays: 2 })
    expect(playerRules('study').maxPlays).toBeNull()
  })

  it('реплика под временем и подписи говорящих', () => {
    const tr = [{ start: 0 }, { start: 5.5 }, { start: 11.5 }]
    expect(lineAt(tr, 0)).toBe(0)
    expect(lineAt(tr, 6)).toBe(1)
    expect(lineAt(tr, 99)).toBe(2)
    expect(speakerNames(['TOM — receptionist (BrE, male)', 'KATE — caller (BrE, female)'])).toEqual({ TOM: 'Receptionist', KATE: 'Caller' })
    expect(formatTime(172)).toBe('2:52')
  })
})

describe('шкала синтеза по репликам', () => {
  const lines = [
    { start: 0, end: 4, text: 'Good morning, how can I help?' },
    { start: 4, end: 10, text: 'I would like to book a tennis court for Saturday.' },
    { start: 10, end: 12, text: 'Of course.' },
  ]

  it('строится подряд: точные длины, где известны, иначе оценка по словам', () => {
    const tl = buildTimeline(lines, [2, null, 1.5])
    expect(tl[0]).toEqual({ start: 0, end: 2 })
    expect(tl[1].start).toBe(2)
    expect(tl[1].end).toBeCloseTo(2 + estimateLineSec(lines[1].text))
    expect(tl[2].end - tl[2].start).toBe(1.5)
  })

  it('locate: реплика и смещение; за концом — конец последней', () => {
    const tl = buildTimeline(lines, [2, 3, 1])
    expect(locate(tl, 0)).toEqual({ i: 0, within: 0 })
    expect(locate(tl, 3.5)).toEqual({ i: 1, within: 1.5 })
    expect(locate(tl, 99)).toEqual({ i: 2, within: 1 })
    expect(lineOnTimeline(tl, 5.2)).toBe(2)
  })

  it('время сценария переводится в шкалу синтеза той же долей реплики', () => {
    const tl = buildTimeline(lines, [2, 3, 1])
    // середина второй реплики сценария (7 с) → середина второй реплики синтеза (2 + 1.5)
    expect(mapScriptTime(lines, tl, 7)).toBeCloseTo(3.5)
    expect(mapScriptTime(lines, tl, 0)).toBe(0)
    expect(mapScriptTime(lines, tl, 10)).toBe(5)
  })
})
