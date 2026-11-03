// @vitest-environment jsdom
import { Component } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n.jsx'
import { allowStaleBuildReload } from '../lib/lazyModule.js'
import { lazyScreen } from '../lib/lazyScreen.js'
import ScreenBoundary, { OptionalPart } from './ScreenBoundary.jsx'

// Настоящая оболочка тянет сайдбар и запросы, а здесь важно только, что заглушка её выбрала.
vi.mock('./ScreenSkeleton.jsx', () => ({ default: ({ active }) => <p>оболочка:{active}</p> }))

const failing = () => lazyScreen(() => Promise.reject(new Error('Failed to load chunk')))
const pending = () => lazyScreen(() => new Promise(() => {}))
const settle = () => act(async () => {})
const renderIn = (node) => render(<I18nProvider>{node}</I18nProvider>)

describe('ScreenBoundary', () => {
  let reload

  beforeEach(() => {
    sessionStorage.clear()
    reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('заглушка', () => {
    // Пустая обёртка показала бы тёмный фон страницы и спрятала бы нижнюю панель телефона.
    it('стоит на месте экрана сразу, без паузы', () => {
      const Screen = pending()
      renderIn(<ScreenBoundary view="pricing"><Screen /></ScreenBoundary>)
      expect(screen.getByRole('status')).toBeTruthy()
    })

    it('у экрана кабинета — оболочка с нужным пунктом меню', async () => {
      const Screen = pending()
      renderIn(<ScreenBoundary view="reading" shell={{ token: 't' }}><Screen /></ScreenBoundary>)
      await settle()
      expect(screen.getByText('оболочка:practice')).toBeTruthy()
    })

    // Отдельным набором модулей: чанк оболочки здесь не должен приехать, а в общем наборе он уже загружен соседними тестами.
    it('панель телефона не пропадает, и пока едет чанк самой оболочки', async () => {
      vi.resetModules()
      vi.doMock('./ScreenSkeleton.jsx', () => new Promise(() => {}))
      try {
        const { I18nProvider: Provider } = await import('../i18n.jsx')
        const { default: Boundary } = await import('./ScreenBoundary.jsx')
        const { lazyScreen: lazyFresh } = await import('../lib/lazyScreen.js')
        const Screen = lazyFresh(() => new Promise(() => {}))
        const { container } = render(<Provider><Boundary view="vocab" shell={{ token: 't' }}><Screen /></Boundary></Provider>)
        expect(container.querySelector('.learn')).toBeTruthy()
      } finally {
        vi.doUnmock('./ScreenSkeleton.jsx')
      }
    })

    it('у экрана во всё окно — без оболочки: сайдбар на миг появился бы и исчез', async () => {
      const Screen = pending()
      renderIn(<ScreenBoundary view="sat-mock" shell={{ token: 't' }}><Screen /></ScreenBoundary>)
      await settle()
      expect(screen.queryByText(/оболочка/)).toBeNull()
      expect(screen.getByRole('status')).toBeTruthy()
    })

    it('гостю — без оболочки кабинета', async () => {
      const Screen = pending()
      renderIn(<ScreenBoundary view="home" shell={{ token: null }}><Screen /></ScreenBoundary>)
      await settle()
      expect(screen.queryByText(/оболочка/)).toBeNull()
    })
  })

  describe('чанк не приехал', () => {
    // Вкладка, открытая до выката: чанков её сборки на сервере уже нет.
    it('первый отказ перезагружает страницу', async () => {
      const Screen = failing()
      renderIn(<ScreenBoundary view="practice"><Screen /></ScreenBoundary>)
      await settle()
      expect(reload).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert')).toBeNull()
    })

    // Без этого упавшая раздача статики зациклила бы вкладку.
    it('после перезагрузки отказ не перезагружает снова, а просит обновить страницу', async () => {
      sessionStorage.setItem('jts_stale_build_reload', '1')
      const Screen = failing()
      renderIn(<ScreenBoundary view="practice"><Screen /></ScreenBoundary>)
      await settle()
      expect(reload).not.toHaveBeenCalled()
      expect(screen.getByRole('alert').textContent).toContain('Экран не загрузился')
      screen.getByRole('button').click()
      expect(reload).toHaveBeenCalledTimes(1)
    })

    // Перезагрузка без сети показала бы вместо приложения ошибку браузера.
    it('без сети не перезагружает', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      const Screen = failing()
      renderIn(<ScreenBoundary view="practice"><Screen /></ScreenBoundary>)
      await settle()
      expect(reload).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeTruthy()
    })
  })

  // Отметка разрешает одну перезагрузку. Снимай её загрузка любого чанка, а не вставший экран, вкладка с недоступным экраном не
  // вышла бы из цикла: после каждой перезагрузки удачно приезжает Луна, и право на перезагрузку возвращается.
  describe('отметка перезагрузки', () => {
    it('снимается, когда экран встал', async () => {
      const Screen = lazyScreen(async () => ({ default: () => <p>экран</p> }))
      allowStaleBuildReload()
      renderIn(<ScreenBoundary view="practice"><Screen /></ScreenBoundary>)
      expect(allowStaleBuildReload()).toBe(false)
      await settle()
      expect(screen.getByText('экран')).toBeTruthy()
      expect(allowStaleBuildReload()).toBe(true)
    })

    it('не снимается, пока экран не встал, даже если соседняя часть приехала', async () => {
      const Part = lazyScreen(async () => ({ default: () => <p>помощник</p> }))
      const Screen = failing()
      allowStaleBuildReload()
      renderIn(
        <>
          <ScreenBoundary view="practice"><Screen /></ScreenBoundary>
          <OptionalPart><Part /></OptionalPart>
        </>,
      )
      await settle()
      expect(screen.getByText('помощник')).toBeTruthy()
      expect(reload).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeTruthy()
    })
  })

  it('ошибку самого экрана не глотает: у неё прежний путь', () => {
    const Broken = () => {
      throw new Error('экран упал')
    }
    class Outer extends Component {
      state = { message: null }
      static getDerivedStateFromError(error) {
        return { message: error.message }
      }
      render() {
        return this.state.message ? <p>снаружи: {this.state.message}</p> : this.props.children
      }
    }
    renderIn(<Outer><ScreenBoundary view="practice"><Broken /></ScreenBoundary></Outer>)
    expect(screen.getByText('снаружи: экран упал')).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('OptionalPart', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('не приехавший чанк не роняет страницу и не перезагружает её', async () => {
    const Part = failing()
    render(<div><p>экран</p><OptionalPart><Part /></OptionalPart></div>)
    await settle()
    expect(screen.getByText('экран')).toBeTruthy()
  })

  it('показывает часть, когда чанк приехал', async () => {
    const Part = lazyScreen(async () => ({ default: () => <p>помощник</p> }))
    render(<OptionalPart><Part /></OptionalPart>)
    expect(screen.queryByText('помощник')).toBeNull()
    await settle()
    expect(screen.getByText('помощник')).toBeTruthy()
  })
})
