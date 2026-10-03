import { describe, expect, it } from 'vitest'
import { buildTranscript, summarise, tokenize } from './speechSegments.js'

// Порт javaTest tests/speechSegments.test.ts.

const shape = (t) => t.segments.map((s) => [s.kind, s.start, s.end, s.text])
const voice = (start, end, voicing = 1) => ({ start, end, voicing })
// Ответ распознавателя, слова которого впервые пришли в указанные моменты.
const said = (text, ...arrivals) => ({
  text,
  confidence: null,
  arrivals,
  heardAt: arrivals[0],
  confirmedAt: arrivals[arrivals.length - 1] + 0.5,
})

describe('arcade speech segments', () => {
  it('звуки заминки отличаются от слов, пунктуация на месте', () => {
    const kinds = (text) => tokenize(text).map((t) => `${t.text}:${t.kind}`)
    expect(kinds('um, so I think... uh-huh, emm aaa hmm.')).toEqual([
      'um,:FILLER',
      'so:WORD',
      'I:WORD',
      'think...:WORD',
      'uh-huh,:FILLER',
      'emm:FILLER',
      'aaa:FILLER',
      'hmm.:FILLER',
    ])
    for (const word of ['a', 'hem', 'arm', 'oh', 'hum', 'me', 'emu', 'ohm']) expect(tokenize(word)[0].kind, word).toBe('WORD')
    for (const sound of ['uh', 'Umm', 'er', 'erm', 'eh', 'ah', 'mhm', 'ooh']) expect(tokenize(sound)[0].kind, sound).toBe('FILLER')
  })

  it('длительность отрезка задаёт время голоса, а не длина текста', () => {
    const t = buildTranscript([voice(1, 4)], [], [said('Yes.', 1.5)], 6, null)
    expect(shape(t)).toEqual([
      ['PAUSE', 0, 1, ''],
      ['WORD', 1, 4, 'Yes.'],
      ['PAUSE', 4, 6, ''],
    ])
  })

  it('пауза внутри одного результата сохраняется, слова делятся вокруг неё', () => {
    const original = 'He said that that he is smart.'
    const t = buildTranscript([voice(1, 2.2), voice(3.5, 5)], [], [said(original, 1.4, 1.7, 2.6, 3.8, 4, 4.3, 4.7)], 6, null)
    expect(shape(t)).toEqual([
      ['PAUSE', 0, 1, ''],
      ['WORD', 1, 2.2, 'He said that'],
      ['PAUSE', 2.2, 3.5, ''],
      ['WORD', 3.5, 5, 'that he is smart.'],
      ['PAUSE', 5, 6, ''],
    ])
    expect(t.utterances).toEqual([{ text: original, confidence: null }])
    const flagged = t.segments.flatMap((s) => s.tokens.filter((k) => k.repetition).map((k) => k.text))
    expect(flagged).toEqual(['that'])
    expect(t.segments[3].tokens[0].repetition).toBe(true)
  })

  it('протяжный звук внутри голоса становится заминкой между словами', () => {
    const t = buildTranscript([voice(1, 4)], [{ start: 2, end: 2.8 }], [said('I think it is good.', 1.3, 1.6, 3.2, 3.4, 3.7)], 5, null)
    expect(shape(t)).toEqual([
      ['PAUSE', 0, 1, ''],
      ['WORD', 1, 2, 'I think'],
      ['FILLER', 2, 2.8, ''],
      ['WORD', 2.8, 4, 'it is good.'],
      ['PAUSE', 4, 5, ''],
    ])
    expect(summarise(t).hesitations).toBe(1)
  })

  it('шум — тишина, голос без слов — звук, короткий протяжный — заминка', () => {
    const t = buildTranscript([voice(1, 3, 0.1), voice(4, 5.5), voice(6, 6.4)], [{ start: 6.05, end: 6.3 }], [], 7, null)
    expect(shape(t)).toEqual([
      ['PAUSE', 0, 4, ''],
      ['NON_WORD_SOUND', 4, 5.5, ''],
      ['PAUSE', 5.5, 6, ''],
      ['FILLER', 6, 6.4, ''],
      ['PAUSE', 6.4, 7, ''],
    ])
  })

  it('словам без измеренного голоса достаётся оценочное место, порядок сохраняется', () => {
    const t = buildTranscript([voice(1, 2)], [], [said('hello', 1.5), said('quiet words', 9, 9.2)], 10, null)
    expect(shape(t)).toEqual([
      ['PAUSE', 0, 1, ''],
      ['WORD', 1, 2, 'hello'],
      ['PAUSE', 2, 8.4, ''],
      ['WORD', 8.4, 9.05, 'quiet words'],
      ['PAUSE', 9.05, 10, ''],
    ])
  })

  it('голос после отказа распознавания остаётся, но не классифицирован', () => {
    const t = buildTranscript([voice(1, 3), voice(5, 7)], [], [], 8, 4)
    expect(t.segments.map((s) => s.kind)).toEqual(['PAUSE', 'NON_WORD_SOUND', 'PAUSE', 'UNCLASSIFIED', 'PAUSE'])
  })

  it('написанные заминки помечаются, повторы — через них, ничего не удаляется', () => {
    const original = 'He said that that he is, um, is smart.'
    const t = buildTranscript([voice(1, 5)], [], [said(original, 1.3, 1.6, 1.9, 2.2, 2.6, 3, 3.4, 3.8, 4.2)], 6, null)
    expect(t.segments[1].tokens.map((k) => `${k.text}${k.repetition ? '*' : ''}`)).toEqual([
      'He', 'said', 'that', 'that*', 'he', 'is,', 'um,', 'is*', 'smart.',
    ])
    expect(t.segments[1].text).toBe(original)
    expect(t.utterances[0].text).toBe(original)
    expect(summarise(t)).toEqual({ words: 8, hesitations: 1, repetitions: 2, pauses: 2, longPauses: 2, sound: 0 })
  })

  it('результат из одних заминок — отрезок-заминка со своим текстом', () => {
    const t = buildTranscript([voice(1, 2)], [], [said('um uh', 1.3, 1.6)], 3, null)
    expect(shape(t)[1]).toEqual(['FILLER', 1, 2, 'um uh'])
  })
})
