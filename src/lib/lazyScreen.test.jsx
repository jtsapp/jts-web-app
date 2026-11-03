// @vitest-environment jsdom
import { Suspense } from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScreenChunkError, lazyScreen } from './lazyScreen.js'

const Page = ({ label = 'экран' }) => <p>{label}</p>
const settle = () => act(async () => {})

const inSuspense = (node) => <Suspense fallback={<p>заглушка</p>}>{node}</Suspense>

describe('lazyScreen', () => {
  it('без preload показывает заглушку, потом экран', async () => {
    const Screen = lazyScreen(async () => ({ default: Page }))
    render(inSuspense(<Screen label="урок" />))
    expect(screen.getByText('заглушка')).toBeTruthy()
    await settle()
    expect(screen.getByText('урок')).toBeTruthy()
  })

  // Ради этого обёртка и написана: голый React.lazy уходит в Suspense даже с готовым модулем, и заглушка мигала бы.
  it('загруженный заранее экран рисуется сразу, без заглушки', async () => {
    const Screen = lazyScreen(async () => ({ default: Page }))
    await Screen.preload()
    render(inSuspense(<Screen />))
    expect(screen.queryByText('заглушка')).toBeNull()
    expect(screen.getByText('экран')).toBeTruthy()
  })

  it('качает чанк один раз, сколько бы его ни просили', async () => {
    const load = vi.fn(async () => ({ default: Page }))
    const Screen = lazyScreen(load)
    Screen.preload()
    Screen.preload()
    render(inSuspense(<Screen />))
    await settle()
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('берёт именованный экспорт', async () => {
    const Screen = lazyScreen(async () => ({ default: () => <p>жетоны</p>, PrizesPage: () => <p>призы</p> }), 'PrizesPage')
    await Screen.preload()
    render(<Screen />)
    expect(screen.getByText('призы')).toBeTruthy()
  })

  it('экран, смонтированный до прихода чанка, не пересоздаётся, когда чанк приехал', async () => {
    const mounted = vi.fn()
    const Tracked = () => {
      mounted()
      return <p>экран</p>
    }
    const Screen = lazyScreen(async () => ({ default: Tracked }))
    const view = render(inSuspense(<Screen />))
    await settle()
    const node = screen.getByText('экран')
    view.rerender(inSuspense(<Screen />))
    expect(screen.getByText('экран')).toBe(node)
  })

  it('отказ загрузки отдаёт ScreenChunkError с причиной', async () => {
    const cause = Object.assign(new Error('Failed to load chunk'), { name: 'ChunkLoadError' })
    const Screen = lazyScreen(() => Promise.reject(cause))
    const error = await Screen.preload().catch((e) => e)
    expect(error).toBeInstanceOf(ScreenChunkError)
    expect(error.cause).toBe(cause)
  })

  it('чанк без ответа за минуту считается отказом, а не вечной заглушкой', async () => {
    vi.useFakeTimers()
    try {
      const Screen = lazyScreen(() => new Promise(() => {}))
      const result = Screen.preload().catch((e) => e)
      await vi.advanceTimersByTimeAsync(60_000)
      expect(await result).toBeInstanceOf(ScreenChunkError)
    } finally {
      vi.useRealTimers()
    }
  })
})
