// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SRC = 'https://www.youtube.com/iframe_api'
const tags = () => [...document.head.querySelectorAll('script')].filter((s) => s.src === SRC)

// Обещание загрузки живёт в модуле — каждому тесту свой экземпляр.
async function freshLoader() {
  vi.resetModules()
  return (await import('./youtube.js')).loadYouTubeApi
}

function clean() {
  delete window.YT
  delete window.onYouTubeIframeAPIReady
  for (const s of tags()) s.remove()
}

beforeEach(clean)
afterEach(clean)

describe('loadYouTubeApi', () => {
  it('API уже на странице — отдаёт его, скрипт не добавляет', async () => {
    const load = await freshLoader()
    window.YT = { Player: function Player() {} }
    await expect(load()).resolves.toBe(window.YT)
    expect(tags()).toHaveLength(0)
  })

  it('один скрипт на вкладку; ответ — по onYouTubeIframeAPIReady, прежний обработчик тоже вызван', async () => {
    const load = await freshLoader()
    const prev = vi.fn()
    window.onYouTubeIframeAPIReady = prev
    const first = load()
    const second = load()
    expect(second).toBe(first)
    expect(tags()).toHaveLength(1)
    window.YT = { Player: function Player() {} }
    window.onYouTubeIframeAPIReady()
    await expect(first).resolves.toBe(window.YT)
    expect(prev).toHaveBeenCalledTimes(1)
  })
})
