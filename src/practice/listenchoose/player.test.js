// Плеер записи: подсчёт «реально прослушанного» сверяется с оракулом — трассы
// событий audio прогнал САМ ListeningPlayer прототипа
// (scripts/extract-listenchoose.js). Состояния и краевые случаи — юниты.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { makeFakeAudio, runTrace } from './__fixtures__/fakeAudio.js'
import { HEARD_TAIL, ListenPlayer, RATES, addRange, coverageOf } from './player.js'

const ORACLE = JSON.parse(readFileSync(path.join(__dirname, '__fixtures__', 'oracle.json'), 'utf8'))
const round3 = (n) => Math.round(n * 1000) / 1000
const makePlayer = (opts) => new ListenPlayer(opts)

describe('оракул: что считается прослушанным', () => {
  it('в оракуле все десять трасс', () => {
    expect(ORACLE.player).toHaveLength(10)
  })

  for (const trace of ORACLE.player) {
    it(`трасса «${trace.name}»: диапазоны, покрытие и «дослушал» как у прототипа`, () => {
      const { player, heard } = runTrace({ trace, makePlayer })
      expect(player.ranges.map((r) => r.map(round3))).toEqual(trace.expect.ranges)
      expect(round3(player.coverage())).toBe(trace.expect.coverage)
      expect(heard).toBe(trace.expect.heard)
    })
  }
})

describe('addRange / coverageOf', () => {
  it('склеивает куски внутри 35 мс, сортирует и не портит вход', () => {
    const src = [[4, 5]]
    const a = addRange(src, 0, 1)
    expect(a).toEqual([
      [0, 1],
      [4, 5],
    ])
    expect(src).toEqual([[4, 5]])
    expect(addRange(a, 1.03, 2)).toEqual([
      [0, 2],
      [4, 5],
    ])
    expect(addRange(a, 1.1, 2)).toEqual([
      [0, 1],
      [1.1, 2],
      [4, 5],
    ])
    expect(addRange(a, 0.5, 4.5)).toEqual([[0, 5]])
  })

  it('coverageOf суммирует длины', () => {
    expect(coverageOf([])).toBe(0)
    expect(
      coverageOf([
        [0, 1.5],
        [4, 5],
      ]),
    ).toBe(2.5)
  })
})

function setup(opts = {}) {
  let clock = 0
  const fake = makeFakeAudio()
  const onHeard = vi.fn()
  const player = new ListenPlayer({ audio: fake.audio, now: () => clock, onHeard, ...opts })
  return { player, fake, onHeard, at: (ms) => (clock = ms) }
}

function loaded(duration = 6, opts) {
  const s = setup(opts)
  s.player.load('a.mp3')
  Object.assign(s.fake.audio, { duration, readyState: 4 })
  s.fake.fire('loadedmetadata')
  return s
}

describe('состояния', () => {
  it('idle → loading → ready с длительностью из метаданных', () => {
    const { player, fake } = setup()
    expect(player.getSnapshot()).toMatchObject({ state: 'idle', position: 0, duration: 0 })
    player.load('/x.mp3')
    expect(fake.audio.src).toBe('/x.mp3')
    expect(fake.audio.loads).toBe(1)
    expect(player.getSnapshot().state).toBe('loading')
    Object.assign(fake.audio, { duration: 7.5, readyState: 4 })
    fake.fire('loadedmetadata')
    expect(player.getSnapshot()).toMatchObject({ state: 'ready', duration: 7.5 })
  })

  it('бесконечная или нечисловая длительность не ломает ползунок', () => {
    const { player, fake } = setup()
    player.load('/x.mp3')
    fake.audio.duration = Infinity
    fake.fire('loadedmetadata')
    expect(player.getSnapshot().duration).toBe(0)
  })

  it('играет, ставится на паузу, доигрывает до ended', () => {
    const { player, fake, at } = loaded()
    at(10)
    player.play()
    expect(fake.audio.paused).toBe(false)
    fake.fire('playing')
    expect(player.getSnapshot().state).toBe('playing')
    at(500)
    Object.assign(fake.audio, { currentTime: 0.4 })
    fake.fire('timeupdate')
    expect(player.getSnapshot().position).toBe(0.4)
    player.pause()
    expect(fake.audio.paused).toBe(true)
    fake.fire('pause')
    expect(player.getSnapshot().state).toBe('paused')
    Object.assign(fake.audio, { ended: true, currentTime: 6 })
    fake.fire('ended')
    expect(player.getSnapshot()).toMatchObject({ state: 'ended', position: 6 })
  })

  it('ошибка загрузки и отклонённый play() дают error, а AbortError — нет', async () => {
    const a = loaded()
    a.fake.fire('error')
    expect(a.player.getSnapshot().state).toBe('error')

    const b = loaded()
    b.fake.audio.playResult = () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }))
    await b.player.play()
    expect(b.player.getSnapshot().state).toBe('error')

    // Play, а следом Stop: браузер отклоняет первый play() как прерванный. Это
    // не сбой записи, и «Audio could not play» показывать нельзя.
    const c = loaded()
    c.fake.audio.playResult = () => Promise.reject(Object.assign(new Error('interrupted'), { name: 'AbortError' }))
    await c.player.play()
    expect(c.player.getSnapshot().state).toBe('ready')
  })

  it('play() молчит до load() и в ошибке, но из «загружается» запускает запись', async () => {
    const idle = setup()
    await idle.player.play()
    expect(idle.fake.audio.paused).toBe(true)

    const broken = loaded()
    broken.fake.fire('error')
    await broken.player.play()
    expect(broken.fake.audio.paused).toBe(true)

    // iOS не подгружает запись до касания: если Play ждал бы метаданных,
    // нажать его было бы нельзя никогда.
    const loading = setup()
    loading.player.load('a.mp3')
    expect(loading.player.getSnapshot().state).toBe('loading')
    await loading.player.play()
    expect(loading.fake.audio.paused).toBe(false)
  })

  it('waiting уводит в loading, canplay возвращает в playing или ready', () => {
    const { player, fake } = loaded()
    player.play()
    fake.fire('playing')
    fake.fire('waiting')
    expect(player.getSnapshot().state).toBe('loading')
    fake.fire('canplay')
    expect(player.getSnapshot().state).toBe('playing')
    fake.fire('waiting')
    fake.audio.paused = true
    fake.fire('canplay')
    expect(player.getSnapshot().state).toBe('ready')
  })

  it('stop: с начала, в ready, а запоздавшее событие pause его не перекрашивает в paused', () => {
    const { player, fake } = loaded()
    player.play()
    fake.fire('playing')
    Object.assign(fake.audio, { currentTime: 3 })
    player.stop()
    expect(fake.audio.currentTime).toBe(0)
    expect(player.getSnapshot()).toMatchObject({ state: 'ready', position: 0 })
    fake.fire('pause') // браузер шлёт pause уже ПОСЛЕ stop()
    expect(player.getSnapshot().state).toBe('ready')
  })

  it('replay = stop + play', () => {
    const { player, fake } = loaded()
    fake.audio.ended = true
    fake.audio.currentTime = 6
    player.replay()
    expect(fake.audio.currentTime).toBe(0)
    expect(fake.audio.paused).toBe(false)
  })

  it('повторный load сбрасывает диапазоны, позицию и остатки прошлой записи', () => {
    const { player, fake, at } = loaded()
    player.play()
    at(10)
    fake.fire('playing')
    at(260)
    Object.assign(fake.audio, { currentTime: 0.25 })
    fake.fire('timeupdate')
    expect(player.ranges).toEqual([[0, 0.25]])
    player.load('b.mp3')
    expect(player.ranges).toEqual([])
    expect(player.getSnapshot()).toMatchObject({ state: 'loading', position: 0, duration: 0 })
    expect(fake.audio.src).toBe('b.mp3')
  })
})

describe('перемотка, темп, громкость', () => {
  it('seek зажимается в [0, длительность] и сбрасывает якорь подсчёта', () => {
    const { player, fake } = loaded(6)
    player.seek(99)
    expect(fake.audio.currentTime).toBe(6)
    expect(player.getSnapshot().position).toBe(6)
    player.seek(-3)
    expect(fake.audio.currentTime).toBe(0)
  })

  it('setRate принимает только 0.75 / 1 / 1.25', () => {
    expect(RATES).toEqual([0.75, 1, 1.25])
    const { player, fake } = loaded()
    player.setRate(1.25)
    expect(fake.audio.playbackRate).toBe(1.25)
    expect(player.getSnapshot().rate).toBe(1.25)
    player.setRate(2)
    player.setRate('1')
    expect(player.getSnapshot().rate).toBe(1.25)
  })

  it('setVolume зажимает 0..1 и засчитывает кусок ДО смены громкости', () => {
    const { player, fake, at } = loaded()
    player.play()
    at(0)
    fake.fire('playing')
    at(250)
    Object.assign(fake.audio, { currentTime: 0.25 })
    fake.fire('timeupdate')
    // Ползунок дёрнули между двумя timeupdate: последние 200 мс звучали.
    at(450)
    Object.assign(fake.audio, { currentTime: 0.45 })
    player.setVolume(0)
    expect(player.ranges.map((r) => r.map(round3))).toEqual([[0, 0.45]])
    expect(fake.audio.volume).toBe(0)
    // Ноль дублируется через muted (на iOS volume только для чтения).
    expect(fake.audio.muted).toBe(true)
    player.setVolume(7)
    expect(player.getSnapshot().volume).toBe(1)
    expect(fake.audio.muted).toBe(false)
    player.setVolume(-1)
    expect(player.getSnapshot().volume).toBe(0)
    expect(fake.audio.muted).toBe(true)
  })

  it('запись, загруженная при нулевой громкости, сразу без звука', () => {
    const { player, fake } = setup({ volume: 0 })
    player.load('a.mp3')
    expect(fake.audio.volume).toBe(0)
    expect(fake.audio.muted).toBe(true)
  })

  it('начальные темп и громкость из настроек, мусор — по умолчанию', () => {
    expect(setup({ rate: 0.75, volume: 0.3 }).player.getSnapshot()).toMatchObject({ rate: 0.75, volume: 0.3 })
    expect(setup({ rate: 3, volume: NaN }).player.getSnapshot()).toMatchObject({ rate: 1, volume: 0.8 })
  })
})

describe('«дослушал»', () => {
  it('порог хвоста — 0.32 с', () => {
    expect(HEARD_TAIL).toBe(0.32)
  })

  it('resetListening стирает набранное и сбрасывает якорь: старый кусок не достраивается', () => {
    const { player, fake, at } = loaded()
    player.play()
    at(0)
    fake.fire('playing')
    at(250)
    Object.assign(fake.audio, { currentTime: 0.25 })
    fake.fire('timeupdate')
    expect(player.ranges).toEqual([[0, 0.25]])

    player.resetListening()
    expect(player.ranges).toEqual([])
    // Следующий timeupdate только переякоривает (arm сброшен), кусок не идёт в счёт…
    at(500)
    Object.assign(fake.audio, { currentTime: 0.5 })
    fake.fire('timeupdate')
    expect(player.ranges).toEqual([])
    // …а следующий за ним уже честный.
    at(750)
    Object.assign(fake.audio, { currentTime: 0.75 })
    fake.fire('timeupdate')
    expect(player.ranges.map((r) => r.map(round3))).toEqual([[0.5, 0.75]])
  })
})

describe('темп переживает загрузку', () => {
  // Загрузка медиа возвращает playbackRate к defaultPlaybackRate (спецификация
  // HTML, проверено в Chrome; фейк делает то же). Темп, выставленный только в
  // playbackRate, терялся на каждой записи, хотя список показывал выбранный.
  it('load() применяет сохранённый темп в оба свойства', () => {
    const { player, fake } = setup({ rate: 0.75 })
    player.load('a.mp3')
    expect(fake.audio.defaultPlaybackRate).toBe(0.75)
    expect(fake.audio.playbackRate).toBe(0.75)
  })

  it('темп, выбранный посреди записи, доезжает до следующей', () => {
    const { player, fake } = loaded()
    player.setRate(1.25)
    expect(fake.audio.playbackRate).toBe(1.25)
    player.load('b.mp3')
    expect(fake.audio.playbackRate).toBe(1.25)
    expect(fake.audio.defaultPlaybackRate).toBe(1.25)
  })
})

describe('пауза и остановка: краевые случаи', () => {
  it('pause посреди догрузки (waiting) — «На паузе», кусок до паузы засчитан', () => {
    const { player, fake, at } = loaded()
    player.play()
    at(0)
    fake.fire('playing')
    at(250)
    Object.assign(fake.audio, { currentTime: 0.25 })
    fake.fire('timeupdate')
    fake.fire('waiting')
    expect(player.getSnapshot().state).toBe('loading')
    // Вкладку спрятали, пока запись догружалась: play() → pause().
    at(400)
    Object.assign(fake.audio, { currentTime: 0.4, paused: true })
    fake.fire('pause')
    expect(player.getSnapshot().state).toBe('paused')
    expect(player.ranges.map((r) => r.map(round3))).toEqual([[0, 0.4]])
    fake.fire('canplay')
    expect(player.getSnapshot().state).toBe('paused')
  })

  it('запоздавший pause не действует ни после stop(), ни после load()', () => {
    const a = loaded()
    a.player.play()
    a.fake.fire('playing')
    a.player.load('b.mp3')
    a.fake.fire('pause')
    expect(a.player.getSnapshot().state).toBe('loading')

    const b = loaded()
    b.player.play()
    b.fake.fire('playing')
    b.fake.fire('waiting')
    b.player.stop()
    b.fake.fire('pause')
    expect(b.player.getSnapshot().state).toBe('ready')
  })

  it('Stop не лечит ошибку: баннер «Try again» остаётся, пока запись не загрузят заново', () => {
    const { player, fake } = loaded()
    fake.fire('error')
    player.stop()
    expect(player.getSnapshot().state).toBe('error')
    player.load('again.mp3')
    expect(player.getSnapshot().state).toBe('loading')
  })
})

describe('подписка и снимок', () => {
  it('снимок — один и тот же объект, пока ничего не изменилось; подписчиков будит emit', () => {
    const { player, fake } = loaded()
    const a = player.getSnapshot()
    expect(player.getSnapshot()).toBe(a)
    const fn = vi.fn()
    const off = player.subscribe(fn)
    player.setRate(0.75)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(player.getSnapshot()).not.toBe(a)
    off()
    player.setRate(1)
    expect(fn).toHaveBeenCalledTimes(1)
    fake.fire('timeupdate')
  })

  it('destroy снимает слушателей audio и останавливает запись', () => {
    const { player, fake } = loaded()
    player.destroy()
    expect(fake.audio.paused).toBe(true)
    expect(fake.audio.src).toBe('')
    const fn = vi.fn()
    player.subscribe(fn)
    fake.fire('timeupdate')
    fake.fire('error')
    expect(fn).not.toHaveBeenCalled()
  })
})
