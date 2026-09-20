// Контроллер экрана на настоящих данных и движке, но с фейковым плеером и
// хранилищами в памяти: проверяем, что и когда он делает с плеером, набором и
// устройством, а не сам звук.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { buildData } from './data.js'
import { normalizeDevice } from './listenchooseSettings.js'
import { ListenChooseSession } from './session.js'

const ROOT = path.join(__dirname, '..', '..', '..')
const DATA = buildData(JSON.parse(readFileSync(path.join(ROOT, 'public', 'practice', 'listenchoose', 'questions.json'), 'utf8')))

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function harness(deviceSeed = {}, opts = {}) {
  let dev = normalizeDevice(deviceSeed)
  const device = {
    read: vi.fn(() => dev),
    write: vi.fn((patch) => (dev = normalizeDevice({ ...dev, ...patch }))),
  }
  let seen = { easy: [], medium: [], hard: [] }
  const progress = {
    readSeen: vi.fn((l) => seen[l]),
    writeSeen: vi.fn((l, ids) => {
      seen = { ...seen, [l]: ids }
    }),
  }
  const player = {
    load: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resetListening: vi.fn(),
    setRate: vi.fn(),
    setVolume: vi.fn(),
    destroy: vi.fn(),
  }
  let onHeard = () => {}
  const createPlayer = vi.fn((o) => {
    onHeard = o.onHeard
    return player
  })
  const preload = vi.fn(() => ['kept'])
  const onResolved = vi.fn()
  const session = new ListenChooseSession({
    data: DATA,
    device,
    progress,
    createPlayer,
    preload,
    random: mulberry32(7),
    onResolved,
    ...opts,
  })
  return {
    session,
    device,
    progress,
    player,
    preload,
    onResolved,
    createPlayer,
    heard: () => onHeard(),
    get dev() {
      return dev
    },
  }
}

const snap = (h) => h.session.getSnapshot()
const wrong = (s, k = 0) => [0, 1, 2, 3].filter((i) => i !== s.question.answer)[k]
// Дослушал и дождался картинок — тогда ответ принимается.
function ready(h) {
  h.heard()
  h.session.setImagesReady(true, snap(h).question.id)
}

function solveCorrect(h) {
  ready(h)
  h.session.answer(snap(h).question.answer)
  h.session.next()
}

describe('старт', () => {
  it('без сохранённого рисует набор из 10 заданий, грузит запись первого и пишет «уже было»', () => {
    const h = harness()
    const s = snap(h)
    expect(s).toMatchObject({ level: 'easy', count: 10, total: 10, index: 0, complete: false, heard: false, imagesReady: false })
    expect(s.options).toHaveLength(4)
    expect([...s.round.order].sort()).toEqual([0, 1, 2, 3])
    expect(h.player.load).toHaveBeenCalledWith(s.question.audio)
    // Набор при монтировании пишется только локально: серверное «уже было» могло
    // ещё не приехать, и replace затёр бы его.
    expect(h.progress.writeSeen).toHaveBeenCalledWith('easy', expect.any(Array), { sync: false })
    expect(h.progress.writeSeen.mock.calls[0][1]).toHaveLength(10)
    expect(h.preload).toHaveBeenCalledWith(DATA.byId[s.run.queue[1]])
    expect(h.createPlayer).toHaveBeenCalledWith(expect.objectContaining({ rate: 1, volume: 0.8 }))
    expect(h.device.write).toHaveBeenCalled()
  })

  it('продолжает недоигранный набор устройства и нового не рисует', () => {
    const h1 = harness()
    solveCorrect(h1)
    ready(h1)
    h1.session.answer(wrong(snap(h1))) // одна ошибка на втором задании
    const queue = snap(h1).run.queue
    const order = snap(h1).round.order

    const h2 = harness(h1.dev)
    expect(snap(h2)).toMatchObject({ index: 1, total: 10, heard: false })
    expect(snap(h2).run.queue).toEqual(queue)
    expect(snap(h2).round.order).toEqual(order)
    expect(snap(h2).round.wrong).toHaveLength(1)
    expect(h2.progress.writeSeen).not.toHaveBeenCalled()
  })

  it('уже решённое задание считается услышанным', () => {
    const h1 = harness()
    ready(h1)
    h1.session.answer(snap(h1).question.answer)
    const h2 = harness(h1.dev)
    expect(snap(h2).round.resolved).toBe(true)
    expect(snap(h2).heard).toBe(true)
  })

  it('уровень из диплинка сильнее запомненного и не рисует лишнего набора', () => {
    const h = harness({ level: 'easy' }, { level: 'hard' })
    expect(snap(h)).toMatchObject({ level: 'hard', total: 10 })
    expect(snap(h).run.queue.every((id) => DATA.byId[id].level === 'hard')).toBe(true)
    // Набор нарисован один — для запрошенной сложности, не для запомненной.
    expect(h.progress.writeSeen).toHaveBeenCalledTimes(1)
    expect(h.progress.writeSeen).toHaveBeenCalledWith('hard', expect.any(Array), { sync: false })
    expect(h.dev.level).toBe('hard')
    expect(h.dev.runs.easy).toBeUndefined()
    // Мусор вместо уровня — запомненный.
    expect(snap(harness({ level: 'medium' }, { level: 'expert' })).level).toBe('medium')
  })

  it('на действия студента «уже было» уходит на сервер: новый набор и смена сложности', () => {
    const h = harness()
    h.progress.writeSeen.mockClear()
    h.session.startNewSet()
    h.session.setLevel('hard')
    expect(h.progress.writeSeen.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      ['easy', { sync: true }],
      ['hard', { sync: true }],
    ])
  })

  it('битый или чужой набор выбрасывается и рисуется новый', () => {
    const h = harness({ runs: { easy: { queue: ['нет-такого'], index: 0, rounds: {} } } })
    expect(snap(h).total).toBe(10)
    expect(h.progress.writeSeen).toHaveBeenCalledTimes(1)
    const hard = DATA.questions.find((q) => q.level === 'hard').id
    const h2 = harness({ level: 'easy', runs: { easy: { queue: [hard], index: 0, rounds: {} } } })
    expect(snap(h2).total).toBe(10)
  })
})

describe('раунд', () => {
  it('ответ не принимается, пока не дослушано и не загрузились картинки', () => {
    const h = harness()
    const s = h.session
    expect(s.answer(0)).toBe(false)
    h.heard()
    expect(snap(h).heard).toBe(true)
    expect(s.answer(0)).toBe(false)
    s.setImagesReady(true, snap(h).question.id)
    expect(s.answer(snap(h).question.answer)).toBe(true)
  })

  it('верно с первой попытки: задание закрыто, колбэк один раз, запись остановлена', () => {
    const h = harness()
    ready(h)
    const q = snap(h).question
    h.session.answer(q.answer)
    expect(snap(h).round).toMatchObject({ resolved: true, correct: true, attempts: 1 })
    expect(h.onResolved).toHaveBeenCalledTimes(1)
    expect(h.onResolved).toHaveBeenCalledWith({ questionId: q.id, level: 'easy', correct: true, attempts: 1 })
    expect(h.player.stop).toHaveBeenCalled()
    expect(h.session.answer(wrong(snap(h)))).toBe(false)
  })

  it('первая ошибка не закрывает задание: запись надо слушать заново, эта картинка закрыта', () => {
    const h = harness()
    ready(h)
    const s0 = snap(h)
    const w = wrong(s0)
    h.session.answer(w)
    expect(snap(h)).toMatchObject({ heard: false, imagesReady: true })
    expect(snap(h).round).toMatchObject({ resolved: false, wrong: [w], attempts: 1 })
    expect(h.player.resetListening).toHaveBeenCalledTimes(1)
    expect(h.onResolved).not.toHaveBeenCalled()
    expect(h.session.answer(s0.question.answer)).toBe(false) // не дослушал
    h.heard()
    expect(h.session.answer(w)).toBe(false) // та же ошибочная
    expect(h.session.answer(s0.question.answer)).toBe(true)
    expect(h.onResolved).toHaveBeenCalledWith({ questionId: s0.question.id, level: 'easy', correct: true, attempts: 2 })
  })

  it('две ошибки закрывают задание без очка', () => {
    const h = harness()
    ready(h)
    const s0 = snap(h)
    h.session.answer(wrong(s0, 0))
    h.heard()
    h.session.answer(wrong(s0, 1))
    expect(snap(h).round).toMatchObject({ resolved: true, correct: false, attempts: 2 })
    expect(h.onResolved).toHaveBeenCalledWith({ questionId: s0.question.id, level: 'easy', correct: false, attempts: 2 })
    expect(h.session.answer(s0.question.answer)).toBe(false)
  })

  it('готовность картинок ЧУЖОГО задания игнорируется', () => {
    const h = harness()
    h.session.setImagesReady(true, 'нет-такого')
    expect(snap(h).imagesReady).toBe(false)
  })

  it('markHeard идемпотентен и не дёргает подписчиков зря', () => {
    const h = harness()
    const fn = vi.fn()
    h.session.subscribe(fn)
    h.heard()
    h.heard()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('текст разбора открывается только у закрытого задания и закрывается на следующем', () => {
    const h = harness()
    h.session.toggleTranscript()
    expect(snap(h).transcriptOpen).toBe(false)
    ready(h)
    h.session.answer(snap(h).question.answer)
    h.session.toggleTranscript()
    expect(snap(h).transcriptOpen).toBe(true)
    h.session.next()
    expect(snap(h).transcriptOpen).toBe(false)
  })
})

describe('набор', () => {
  it('next: следующее задание, запись грузится заново, флаги сброшены; на последнем — итог', () => {
    const h = harness()
    h.session.setCount(5)
    h.session.startNewSet()
    expect(snap(h).total).toBe(5)
    h.player.load.mockClear()
    for (let i = 0; i < 5; i++) {
      expect(snap(h)).toMatchObject({ index: i, heard: false, imagesReady: false, isLast: i === 4 })
      solveCorrect(h)
      if (i < 4) expect(h.player.load).toHaveBeenLastCalledWith(snap(h).question.audio)
    }
    expect(snap(h)).toMatchObject({ complete: true, question: null, score: { first: 5, second: 0, missed: 0 }, retryCount: 0 })
    expect(h.player.load).toHaveBeenCalledTimes(4)
  })

  it('next не идёт дальше, пока задание не закрыто', () => {
    const h = harness()
    h.session.next()
    expect(snap(h).index).toBe(0)
  })

  it('«Повторить ошибки»: набор из промахов и вторых попыток', () => {
    const h = harness()
    h.session.setCount(5)
    h.session.startNewSet()
    const ids = snap(h).run.queue
    // 1-е — с первой; 2-е — со второй; 3-е — промах; 4-е и 5-е — с первой.
    solveCorrect(h)
    ready(h)
    h.session.answer(wrong(snap(h)))
    h.heard()
    h.session.answer(snap(h).question.answer)
    h.session.next()
    ready(h)
    h.session.answer(wrong(snap(h), 0))
    h.heard()
    h.session.answer(wrong(snap(h), 1))
    h.session.next()
    solveCorrect(h)
    solveCorrect(h)
    expect(snap(h)).toMatchObject({ complete: true, score: { first: 3, second: 1, missed: 1 }, retryCount: 2 })
    h.session.retryMistakes()
    expect(snap(h)).toMatchObject({ complete: false, total: 2, index: 0 })
    expect([...snap(h).run.queue].sort()).toEqual([ids[1], ids[2]].sort())
    expect(h.player.load).toHaveBeenLastCalledWith(snap(h).question.audio)
  })

  it('«Новый набор»: первое задание не из сцены, на которой остановился прошлый', () => {
    const h = harness()
    const before = snap(h).question.scene
    h.session.startNewSet()
    expect(snap(h).question.scene).not.toBe(before)
    expect(h.progress.writeSeen).toHaveBeenCalledTimes(2)
    expect(snap(h)).toMatchObject({ index: 0, complete: false, heard: false })
  })

  it('размер набора: границы, действует со следующего набора', () => {
    const h = harness()
    for (const bad of [0, 51, 1.5, NaN, '5']) expect(h.session.setCount(bad)).toBe(false)
    expect(h.session.setCount(5)).toBe(true)
    expect(snap(h)).toMatchObject({ count: 5, total: 10 })
    expect(h.dev.counts.easy).toBe(5)
    h.session.startNewSet()
    expect(snap(h).total).toBe(5)
  })
})

describe('сложности', () => {
  it('наборы независимы: вернулся — тот же набор с того же места', () => {
    const h = harness()
    solveCorrect(h)
    const easyQueue = snap(h).run.queue
    h.session.setLevel('hard')
    expect(snap(h)).toMatchObject({ level: 'hard', index: 0, total: 10 })
    expect(snap(h).run.queue.every((id) => DATA.byId[id].level === 'hard')).toBe(true)
    h.session.setLevel('easy')
    expect(snap(h).run.queue).toEqual(easyQueue)
    expect(snap(h).index).toBe(1)
    expect(h.dev.level).toBe('easy')
  })

  it('завершённый набор открывает итог без загрузки записи', () => {
    const h = harness()
    h.session.setCount(5)
    h.session.startNewSet()
    for (let i = 0; i < 5; i++) solveCorrect(h)
    h.session.setLevel('medium')
    h.player.load.mockClear()
    h.session.setLevel('easy')
    expect(snap(h)).toMatchObject({ complete: true, question: null })
    expect(h.player.load).not.toHaveBeenCalled()
    expect(h.session.setLevel('нет-такой')).toBeUndefined()
    expect(snap(h).level).toBe('easy')
  })
})

describe('плеер и устройство', () => {
  it('темп и громкость идут в плеер и запоминаются, мусор не принимается', () => {
    const h = harness()
    h.session.setRate(1.25)
    h.session.setVolume(0.3)
    expect(h.player.setRate).toHaveBeenCalledWith(1.25)
    expect(h.player.setVolume).toHaveBeenCalledWith(0.3)
    expect(h.dev).toMatchObject({ rate: 1.25, volume: 0.3 })
    h.session.setRate(2)
    h.session.setVolume(NaN)
    expect(h.player.setRate).toHaveBeenCalledTimes(1)
    expect(h.player.setVolume).toHaveBeenCalledTimes(1)
    expect(h.dev).toMatchObject({ rate: 1.25, volume: 0.3 })
  })

  it('следующая сессия стартует с сохранёнными темпом и громкостью', () => {
    const h1 = harness()
    h1.session.setRate(0.75)
    h1.session.setVolume(0.5)
    const h2 = harness(h1.dev)
    expect(h2.createPlayer).toHaveBeenCalledWith(expect.objectContaining({ rate: 0.75, volume: 0.5 }))
  })

  it('reloadAudio грузит запись текущего задания заново', () => {
    const h = harness()
    h.player.load.mockClear()
    h.session.reloadAudio()
    expect(h.player.load).toHaveBeenCalledWith(snap(h).question.audio)
    expect(h.player.load).toHaveBeenCalledTimes(1)
  })

  it('pause ставит запись на паузу, destroy закрывает плеер и глушит подписчиков', () => {
    const h = harness()
    h.session.pause()
    expect(h.player.pause).toHaveBeenCalled()
    const fn = vi.fn()
    h.session.subscribe(fn)
    h.session.destroy()
    expect(h.player.destroy).toHaveBeenCalled()
    h.session.setCount(5)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('подписка и снимок', () => {
  it('снимок — тот же объект, пока ничего не менялось; действие даёт новый и будит подписчиков', () => {
    const h = harness()
    const a = h.session.getSnapshot()
    expect(h.session.getSnapshot()).toBe(a)
    const fn = vi.fn()
    const off = h.session.subscribe(fn)
    h.session.setCount(20)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(h.session.getSnapshot()).not.toBe(a)
    off()
    h.session.setCount(30)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
