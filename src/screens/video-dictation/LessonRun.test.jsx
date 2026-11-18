// @vitest-environment jsdom
// Урок с поддельным YT.Player: плеер готов — «Начать» играет фразу методами API; ошибка ролика или молчание YouTube —
// плашка «Видео недоступно»; лучший результат пишется только за весь урок без ошибки ролика.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  load: null,
  player: null,
  best: [],
  destroyed: 0,
  raf: null,
}))
vi.mock('../../lib/youtube.js', () => ({ loadYouTubeApi: () => h.load() }))
vi.mock('../../practice/video-dictation/progress.js', () => ({
  recordBest: (...a) => h.best.push(a),
}))
vi.mock('../../practice/skillStats.js', () => ({ recordSkill: () => {} }))

import { phrasesOf } from '../../practice/video-dictation/phrase.js'
import LessonRun, { READY_TIMEOUT_MS } from './LessonRun.jsx'

const t = (key, vars) => (vars ? `${key} ${JSON.stringify(vars)}` : key)
const LESSON = {
  slug: 'lost-kite-m2x7d',
  level: 'A2',
  video: 'vdFixture02',
  phrases: phrasesOf([[2, 4.5, "Let's [fly] the [kite] together."]]),
}

class FakePlayer {
  constructor(el, opts) {
    this.el = el
    this.opts = opts
    this.calls = []
    h.player = this
  }
  getCurrentTime() {
    return 0
  }
  seekTo(s) {
    this.calls.push(['seekTo', s])
  }
  playVideo() {
    this.calls.push(['playVideo'])
  }
  pauseVideo() {
    this.calls.push(['pauseVideo'])
  }
  setPlaybackRate(r) {
    this.calls.push(['setPlaybackRate', r])
  }
  getPlayerState() {
    return 1
  }
  destroy() {
    h.destroyed += 1
  }
}

async function mount() {
  const view = render(<LessonRun lesson={LESSON} t={t} onExit={() => {}} />)
  await act(async () => {})
  return view
}

beforeEach(() => {
  h.load = () => Promise.resolve({ Player: FakePlayer })
  h.player = null
  h.best = []
  h.destroyed = 0
  h.raf = null
  window.requestAnimationFrame = (fn) => {
    h.raf = fn
    return 1
  }
  window.cancelAnimationFrame = () => {}
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('урок под плеером', () => {
  it('плеер — youtube-nocookie с playsinline и узлом внутри обёртки; «Начать» ждёт onReady', async () => {
    await mount()
    expect(h.player.opts).toMatchObject({
      host: 'https://www.youtube-nocookie.com',
      videoId: 'vdFixture02',
      playerVars: { playsinline: 1, rel: 0 },
    })
    expect(h.player.el.parentElement.classList.contains('vd-player__host')).toBe(true)
    expect(screen.getByRole('button', { name: /videoDictation.loadingVideo/ }).disabled).toBe(true)
    act(() => h.player.opts.events.onReady())
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    expect(h.player.calls).toEqual([['setPlaybackRate', 1], ['seekTo', 2], ['playVideo']])
  })

  it('«Медленнее» — скорость 0,75 и та же фраза заново', async () => {
    await mount()
    act(() => h.player.opts.events.onReady())
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    fireEvent.click(screen.getByRole('button', { name: 'videoDictation.slower' }))
    expect(h.player.calls.slice(-3)).toEqual([['setPlaybackRate', 0.75], ['seekTo', 2], ['playVideo']])
    expect(screen.getByRole('button', { name: 'videoDictation.slower' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('ошибка ролика — плашка со ссылкой на YouTube с начала первой фразы', async () => {
    await mount()
    act(() => h.player.opts.events.onError({ data: 150 }))
    expect(screen.getByRole('alert').textContent).toContain('videoDictation.unavailable.title')
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://www.youtube.com/watch?v=vdFixture02&t=2s')
  })

  it('YouTube не ответил за READY_TIMEOUT_MS — та же плашка', async () => {
    vi.useFakeTimers()
    h.load = () => new Promise(() => {})
    render(<LessonRun lesson={LESSON} t={t} onExit={() => {}} />)
    act(() => vi.advanceTimersByTime(READY_TIMEOUT_MS))
    expect(screen.getByRole('alert').textContent).toContain('videoDictation.unavailable.title')
  })

  it('весь урок пройден — лучший результат записан; повтор ошибок — нет', async () => {
    await mount()
    act(() => h.player.opts.events.onReady())
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    const input = () => document.querySelector('.jl-cells__input')
    for (const v of ['zzzzzzz', 'qqqqqqq']) {
      fireEvent.change(input(), { target: { value: v } })
      fireEvent.keyDown(input(), { key: 'Enter' })
    }
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(h.best).toEqual([['lost-kite-m2x7d', { clean: 0, n: 1 }]])
    fireEvent.click(screen.getByRole('button', { name: 'videoDictation.result.redo' }))
    fireEvent.change(input(), { target: { value: 'flykite' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.finish/ }))
    expect(h.best).toHaveLength(1)
  })

  it('время фразы вышло (timeout) — «Видео не загрузилось» и «Ещё раз» играет ту же фразу', async () => {
    vi.useFakeTimers()
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    render(<LessonRun lesson={LESSON} t={t} onExit={() => {}} />)
    await act(async () => {})
    act(() => h.player.opts.events.onReady())
    fireEvent.click(screen.getByRole('button', { name: /videoDictation.start/ }))
    for (let i = 0; i < 40 && !screen.queryByRole('alert'); i++) {
      now += 250
      act(() => h.raf())
    }
    expect(screen.getByRole('alert').textContent).toContain('videoDictation.videoTimeout')
    h.player.calls.length = 0
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'videoDictation.again' }))
    expect(h.player.calls).toEqual([['setPlaybackRate', 1], ['seekTo', 2], ['playVideo']])
    expect(screen.queryByText(/videoDictation.videoTimeout/)).toBeNull()
    vi.restoreAllMocks()
  })

  it('размонтирование и смена ролика разрушают плеер', async () => {
    const view = await mount()
    act(() => h.player.opts.events.onReady())
    view.rerender(<LessonRun lesson={{ ...LESSON, video: 'other' }} t={t} onExit={() => {}} />)
    await act(async () => {})
    expect(h.destroyed).toBe(1)
    expect(h.player.opts.videoId).toBe('other')
    view.unmount()
    expect(h.destroyed).toBe(2)
  })

  it('ошибка ролика — лучший результат не пишется, «К списку» зовёт onExit', async () => {
    const onExit = vi.fn()
    render(<LessonRun lesson={LESSON} t={t} onExit={onExit} />)
    await act(async () => {})
    act(() => h.player.opts.events.onReady())
    act(() => h.player.opts.events.onError({ data: 101 }))
    fireEvent.click(screen.getByRole('button', { name: 'videoDictation.toList' }))
    expect(onExit).toHaveBeenCalled()
    expect(h.best).toEqual([])
  })
})
