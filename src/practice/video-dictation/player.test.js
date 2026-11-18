import { describe, expect, it, vi } from 'vitest'
import { ARM_TIMEOUT_MS, END_EPSILON, ENDED_GRACE_MS, SLOW_RATE, createPhrasePlayer } from './player.js'

// Часы кадров: step() выполняет всё, что попросили на этот кадр.
function fakeFrames() {
  const queue = new Map()
  let id = 0
  return {
    frame: (fn) => {
      id += 1
      queue.set(id, fn)
      return id
    },
    cancel: (n) => queue.delete(n),
    step() {
      const fns = [...queue.values()]
      queue.clear()
      for (const fn of fns) fn()
    },
    pending: () => queue.size,
    clock: { ms: 0 },
    now() {
      return this.clock.ms
    },
  }
}

// Плеер: время двигает тест (t), seekTo его НЕ меняет — как YouTube, который отдаёт новое время не сразу.
function fakePlayer() {
  return {
    t: 0,
    s: 1, // состояние YT: -1 не начато, 0 ENDED, 1 играет, 2 пауза, 3 буферизация
    calls: [],
    getPlayerState() {
      return this.s
    },
    getCurrentTime() {
      return this.t
    },
    seekTo(s, ahead) {
      this.calls.push(['seekTo', s, ahead])
    },
    playVideo() {
      this.calls.push(['playVideo'])
    },
    pauseVideo() {
      this.calls.push(['pauseVideo'])
    },
    setPlaybackRate(r) {
      this.calls.push(['setPlaybackRate', r])
    },
  }
}

const SEG = { start: 2, end: 4 }

function setup() {
  const frames = fakeFrames()
  const player = fakePlayer()
  const onEnd = vi.fn()
  const onError = vi.fn()
  const now = () => frames.clock.ms
  const pp = createPhrasePlayer({ player, frame: frames.frame, cancel: frames.cancel, now, onEnd, onError })
  return { frames, player, onEnd, onError, pp }
}

describe('фраза', () => {
  it('play: скорость, переход к началу, пуск — и пауза на конце фразы', () => {
    const { frames, player, onEnd, pp } = setup()
    expect(pp.play(SEG)).toBe(true)
    expect(player.calls).toEqual([['setPlaybackRate', 1], ['seekTo', 2, true], ['playVideo']])
    player.t = 2.4
    frames.step()
    player.t = 3.9
    frames.step()
    expect(onEnd).not.toHaveBeenCalled()
    player.t = SEG.end - END_EPSILON
    frames.step()
    expect(player.calls.at(-1)).toEqual(['pauseVideo'])
    expect(onEnd).toHaveBeenCalledWith(SEG)
    expect(pp.state()).toBe('paused')
    expect(frames.pending()).toBe(0)
  })

  it('пока плеер отдаёт прежнее время (конец прошлой фразы), пауза не срабатывает', () => {
    const { frames, player, onEnd, pp } = setup()
    player.t = 10
    pp.play(SEG)
    frames.step()
    frames.step()
    expect(onEnd).not.toHaveBeenCalled()
    player.t = 2
    frames.step()
    player.t = 3.96
    frames.step()
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('«Ещё раз» с конца той же фразы играет её заново, а не встаёт сразу', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    player.t = 2.1
    frames.step()
    player.t = 4
    frames.step()
    expect(onEnd).toHaveBeenCalledTimes(1)
    pp.play(SEG)
    frames.step()
    expect(onEnd).toHaveBeenCalledTimes(1)
    player.t = 2.05
    frames.step()
    player.t = 4
    frames.step()
    expect(onEnd).toHaveBeenCalledTimes(2)
  })

  it('новая фраза до конца прежней — прежний опрос снят', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    pp.play({ start: 6, end: 8 })
    expect(frames.pending()).toBe(1)
    player.t = 6.5
    frames.step()
    player.t = 8
    frames.step()
    expect(onEnd).toHaveBeenCalledWith({ start: 6, end: 8 })
  })

  it('ролик кончился раньше конца фразы (ENDED) — фраза кончилась', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    frames.clock.ms = ENDED_GRACE_MS
    pp.onPlayerState(0)
    expect(player.calls.at(-1)).toEqual(['pauseVideo'])
    expect(onEnd).toHaveBeenCalledTimes(1)
    pp.onPlayerState(0)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('прежний ENDED сразу после seekTo игнорируется, пока время не вошло во фразу', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    pp.onPlayerState(0)
    expect(onEnd).not.toHaveBeenCalled()
    player.t = 2.1
    frames.step()
    pp.onPlayerState(0)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('stop — пауза без onEnd', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    pp.stop()
    expect(player.calls.at(-1)).toEqual(['pauseVideo'])
    expect(pp.state()).toBe('paused')
    expect(frames.pending()).toBe(0)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('getCurrentTime бросает — опрос остановлен, это ошибка ролика', () => {
    const { frames, player, onError, pp } = setup()
    player.getCurrentTime = () => {
      throw new Error('destroyed')
    }
    pp.play(SEG)
    frames.step()
    expect(frames.pending()).toBe(0)
    expect(onError).toHaveBeenCalledWith(null)
    expect(pp.state()).toBe('error')
  })

  it('время так и не вошло во фразу — по сроку ошибка «timeout», а не конец фразы, опроса нет', () => {
    const { frames, player, onEnd, onError, pp } = setup()
    player.t = 10
    pp.play(SEG)
    frames.clock.ms = ARM_TIMEOUT_MS - 1
    frames.step()
    expect(onError).not.toHaveBeenCalled()
    expect(frames.pending()).toBe(1)
    frames.clock.ms = ARM_TIMEOUT_MS
    frames.step()
    expect(onError.mock.calls).toEqual([['timeout']])
    expect(onEnd).not.toHaveBeenCalled()
    expect(player.calls.at(-1)).toEqual(['pauseVideo'])
    expect(frames.pending()).toBe(0)
    expect(pp.state()).toBe('paused')
    expect(pp.play(SEG)).toBe(true)
  })

  it('срок не идёт, пока плеер буферизует (3): 10 с буферизации не истекают, потом отсчёт продолжается', () => {
    const { frames, player, onEnd, onError, pp } = setup()
    player.t = 10
    player.s = 3
    pp.play(SEG)
    frames.clock.ms = 10000
    frames.step()
    expect(onError).not.toHaveBeenCalled()
    player.s = 1
    frames.clock.ms = 10000 + ARM_TIMEOUT_MS - 1
    frames.step()
    expect(onError).not.toHaveBeenCalled()
    player.s = -1
    frames.clock.ms = 10000 + ARM_TIMEOUT_MS
    frames.step()
    expect(onError.mock.calls).toEqual([['timeout']])
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('срок отсчитывается заново с каждого play', () => {
    const { frames, player, onError, pp } = setup()
    player.t = 10
    pp.play(SEG)
    frames.clock.ms = ARM_TIMEOUT_MS - 1
    frames.step()
    pp.play(SEG)
    frames.clock.ms = ARM_TIMEOUT_MS + 1
    frames.step()
    expect(onError).not.toHaveBeenCalled()
  })

  it('фраза за концом ролика: ENDED в льготное окно, потом взвод — конец сразу, без зависания', () => {
    const { frames, player, onEnd, onError, pp } = setup()
    player.t = 0
    pp.play({ start: 100, end: 102 })
    frames.clock.ms = 200
    player.s = 0
    pp.onPlayerState(0)
    expect(onEnd).not.toHaveBeenCalled()
    player.t = 99.9 // seekTo прижат к концу ролика
    frames.step()
    expect(onEnd).toHaveBeenCalledWith({ start: 100, end: 102 })
    expect(onError).not.toHaveBeenCalled()
    expect(frames.pending()).toBe(0)
  })

  it('взведено, но время не дойдёт до конца, а состояние ENDED — конец на ближайшем кадре', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    player.t = 2.2
    frames.step()
    expect(onEnd).not.toHaveBeenCalled()
    player.t = 3
    player.s = 0
    frames.step()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(frames.pending()).toBe(0)
  })

  it('ENDED из льготного окна — прежний (ролик играет заново): взвод не завершает фразу', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    pp.onPlayerState(0)
    player.s = 1
    player.t = 2.1
    frames.step()
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('ENDED за миг до конца льготного окна, пока не взведено, игнорируется', () => {
    const { frames, player, onEnd, pp } = setup()
    player.t = 10
    pp.play(SEG)
    frames.clock.ms = ENDED_GRACE_MS - 1
    pp.onPlayerState(0)
    expect(onEnd).not.toHaveBeenCalled()
    expect(pp.state()).toBe('playing')
    expect(frames.pending()).toBe(1)
  })

  it('смена скорости посреди фразы не ломает проверку конца', () => {
    const { frames, player, onEnd, pp } = setup()
    pp.play(SEG)
    player.t = 2.3
    frames.step()
    pp.setRate(SLOW_RATE)
    expect(player.calls.at(-1)).toEqual(['setPlaybackRate', SLOW_RATE])
    player.t = 3.5
    frames.step()
    expect(onEnd).not.toHaveBeenCalled()
    player.t = SEG.end - END_EPSILON
    frames.step()
    expect(onEnd).toHaveBeenCalledWith(SEG)
    expect(player.calls.at(-1)).toEqual(['pauseVideo'])
  })

  it('destroy снимает опрос, play после него — false и ничего не делает, события глушатся', () => {
    const { frames, player, onEnd, onError, pp } = setup()
    pp.play(SEG)
    pp.destroy()
    expect(frames.pending()).toBe(0)
    expect(pp.state()).toBe('destroyed')
    const before = player.calls.length
    expect(pp.play(SEG)).toBe(false)
    expect(player.calls).toHaveLength(before)
    expect(frames.pending()).toBe(0)
    pp.onPlayerState(0)
    pp.fail(150)
    expect(onEnd).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(pp.state()).toBe('destroyed')
  })
})

describe('«Медленнее»', () => {
  it('скорость запоминается: на паузе — со следующего play, во время фразы — сразу', () => {
    const { player, pp } = setup()
    pp.setRate(SLOW_RATE)
    expect(player.calls).toEqual([])
    pp.play(SEG)
    expect(player.calls[0]).toEqual(['setPlaybackRate', 0.75])
    pp.setRate(1)
    expect(player.calls.at(-1)).toEqual(['setPlaybackRate', 1])
  })
})

describe('ошибка ролика', () => {
  it('fail: onError с кодом, опрос снят, play больше ничего не делает', () => {
    const { frames, player, onError, pp } = setup()
    pp.play(SEG)
    pp.fail(150)
    expect(onError).toHaveBeenCalledWith(150)
    expect(pp.state()).toBe('error')
    expect(frames.pending()).toBe(0)
    const before = player.calls.length
    expect(pp.play(SEG)).toBe(false)
    expect(player.calls).toHaveLength(before)
  })

  it('отказ вызова API на play — тоже ошибка ролика', () => {
    const { player, onError, pp } = setup()
    player.playVideo = () => {
      throw new Error('destroyed')
    }
    expect(pp.play(SEG)).toBe(false)
    expect(onError).toHaveBeenCalledWith(null)
    expect(pp.state()).toBe('error')
  })
})
