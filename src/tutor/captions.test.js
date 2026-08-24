import { describe, it, expect } from 'vitest'
import {
  CAP_MIN_PX,
  fitSizes,
  lastSentence,
  mergeTurns,
  nextLive,
  userTurnKey,
} from './captions.js'

describe('lastSentence', () => {
  it('оставляет последнее предложение реплики', () => {
    expect(lastSentence('Nice! What did you do last weekend?')).toBe(
      'What did you do last weekend?'
    )
  })
  it('не трогает реплику без завершённых предложений', () => {
    expect(lastSentence('  i go to the cinema  ')).toBe('i go to the cinema')
  })
  it('пустой вход — пустая подпись', () => {
    expect(lastSentence('')).toBe('')
    expect(lastSentence(null)).toBe('')
  })
})

describe('fitSizes', () => {
  it('идёт от максимума вниз, не опускаясь ниже пола', () => {
    const sizes = fitSizes(32)
    expect(sizes[0]).toBe(32)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(CAP_MIN_PX)
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes)
  })
  it('на мобильном максимуме лесенка короче, но не пустая', () => {
    const sizes = fitSizes(22)
    expect(sizes[0]).toBe(22)
    expect(sizes.length).toBeGreaterThan(1)
  })
  it('максимум ниже пола — отдаёт одну ступень, а не пустоту', () => {
    expect(fitSizes(10)).toEqual([15])
  })
  it('мусор на входе не роняет подбор', () => {
    expect(fitSizes(undefined)[0]).toBe(32)
    expect(fitSizes(0)[0]).toBe(32)
  })
})

describe('nextLive', () => {
  const empty = { text: '', isUser: false }

  it('показывает реплику тьютора, пока он говорит', () => {
    const live = nextLive(empty, { tutor: '', user: '' }, 'How was your weekend?', '')
    expect(live).toEqual({ text: 'How was your weekend?', isUser: false })
  })

  it('держит фразу тьютора ПОСЛЕ того, как он договорил', () => {
    // Реплика ученика с прошлого хода никуда не делась — и раньше подпись
    // откатывалась на неё, как только тьютор замолкал.
    const seen = { tutor: 'Say it again.', user: 'i went to the cinema' }
    const live = { text: 'Say it again.', isUser: false }
    expect(nextLive(live, seen, 'Say it again.', 'i went to the cinema')).toBe(live)
  })

  it('новая реплика ученика перебивает тьютора', () => {
    const seen = { tutor: 'Say it again.', user: 'i went to the cinema' }
    const live = { text: 'Say it again.', isUser: false }
    expect(nextLive(live, seen, 'Say it again.', 'i went to the cafe')).toEqual({
      text: 'i went to the cafe',
      isUser: true,
    })
  })

  it('обе стороны обновились в одном коммите — на экране ученик (перебивание)', () => {
    const seen = { tutor: 'A.', user: 'one' }
    expect(nextLive(empty, seen, 'B.', 'two')).toEqual({ text: 'two', isUser: true })
  })

  it('пустая транскрипция не гасит подпись', () => {
    const live = { text: 'Say it again.', isUser: false }
    expect(nextLive(live, { tutor: 'Say it again.', user: '' }, '', '')).toBe(live)
  })
})

describe('userTurnKey', () => {
  it('берёт lk.segment_id, а не id потока', () => {
    const stream = { streamInfo: { id: 'stream-2', attributes: { 'lk.segment_id': 'seg-1' } } }
    expect(userTurnKey(stream)).toBe('seg-1')
  })
  it('без segment_id откатывается на id потока', () => {
    expect(userTurnKey({ streamInfo: { id: 'stream-2' } })).toBe('stream-2')
  })
})

describe('mergeTurns', () => {
  const seg = (id, text) => ({ id, text })
  const stream = (segmentId, text) => ({
    text,
    streamInfo: { id: `${segmentId}-${text.length}`, attributes: { 'lk.segment_id': segmentId } },
  })

  it('копит реплики в порядке появления', () => {
    let turns = mergeTurns([], { agentSegments: [seg('a1', 'Hi there.')] })
    turns = mergeTurns(turns, {
      agentSegments: [seg('a1', 'Hi there.')],
      userStreams: [stream('u1', 'hello')],
    })
    turns = mergeTurns(turns, {
      agentSegments: [seg('a1', 'Hi there.'), seg('a2', 'Good.')],
      userStreams: [stream('u1', 'hello')],
    })
    expect(turns.map((x) => [x.who, x.text])).toEqual([
      ['tutor', 'Hi there.'],
      ['me', 'hello'],
      ['tutor', 'Good.'],
    ])
  })

  it('растущий сегмент обновляет ту же реплику, а не плодит новые', () => {
    let turns = mergeTurns([], { userStreams: [stream('u1', 'i go')] })
    turns = mergeTurns(turns, { userStreams: [stream('u1', 'i go to the cinema')] })
    expect(turns).toHaveLength(1)
    expect(turns[0].text).toBe('i go to the cinema')
  })

  it('без изменений возвращает ту же ссылку', () => {
    const first = mergeTurns([], { agentSegments: [seg('a1', 'Hi.')] })
    const second = mergeTurns(first, { agentSegments: [seg('a1', 'Hi.')] })
    expect(second).toBe(first)
  })

  it('пустые и битые сегменты пропускает', () => {
    const turns = mergeTurns([], {
      agentSegments: [seg('a1', '   '), seg('a2', 'Ok.')],
      userStreams: [{ text: 'no stream info' }],
    })
    expect(turns.map((x) => x.text)).toEqual(['Ok.'])
  })
})
