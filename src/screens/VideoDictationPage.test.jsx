// @vitest-environment jsdom
// Экран целиком без сети и без плеера: данные и урок заглушены — проверяем состояния экрана, переход список → урок,
// адрес ?lesson= и «назад».
import fs from 'node:fs'
import path from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ index: null, lesson: null, best: {} }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./video-dictation/useVideoDictationData.js', () => ({
  useVideoDictationIndex: () => h.index,
  useVideoDictationLesson: (token, slug) => (slug ? h.lesson : { status: 'idle', lesson: null, retry: () => {} }),
}))
vi.mock('./video-dictation/LessonRun.jsx', () => ({ default: ({ lesson }) => <div data-testid="run">{lesson.slug}</div> }))
vi.mock('../practice/video-dictation/progress.js', () => ({ readBest: () => h.best, bestOf: (b, slug) => b[slug] || null }))

import VideoDictationPage from './VideoDictationPage.jsx'
import { I18nProvider } from '../i18n.jsx'
import { VIDEO_DICTATION_PROGRESS_EVENT } from '../practice/practiceKeys.js'

const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/video-dictation/__fixtures__/lessons.json'), 'utf8'))

function mount(props = {}) {
  return render(
    <I18nProvider>
      <VideoDictationPage token="tk" userLevel="A1" onNav={() => {}} {...props} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  window.scrollTo = () => {}
  window.history.replaceState(null, '', '/?screen=video-dictation')
  h.index = { status: 'ready', lessons: FIX.index.lessons, retry: vi.fn() }
  h.lesson = { status: 'loading', lesson: null, retry: vi.fn() }
  h.best = {}
})
afterEach(cleanup)

describe('экран Видеодиктанта', () => {
  it('без входа — просьба войти', () => {
    mount({ token: null })
    expect(screen.getByRole('status').getAttribute('data-status')).toBe('guest')
  })

  it('ручки нет или уроков нет — «Раздел готовится»', () => {
    h.index = { status: 'missing', lessons: [], retry: vi.fn() }
    mount()
    expect(screen.getByRole('status').textContent).toBe('Раздел готовится: уроков пока нет.')
  })

  it('сеть упала — «Не удалось загрузить» и «Повторить»', () => {
    h.index = { status: 'error', lessons: [], retry: vi.fn() }
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(h.index.retry).toHaveBeenCalled()
  })

  it('урок из списка: адрес получает ?lesson=, «К списку» его снимает и возвращает на выбранный уровень', () => {
    mount()
    fireEvent.click(screen.getByRole('radio', { name: 'Все' }))
    fireEvent.click(document.querySelector('.vd-card[data-slug="lost-kite-m2x7d"]'))
    expect(window.location.search).toBe('?screen=video-dictation&lesson=lost-kite-m2x7d')
    fireEvent.click(screen.getByRole('button', { name: /К списку/ }))
    expect(screen.getByRole('radio', { name: 'Все' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(document.querySelector('.vd-card[data-slug="rainy-day-k3f9q"]'))
    expect(window.location.search).toBe('?screen=video-dictation&lesson=rainy-day-k3f9q')
    expect(screen.getByRole('status').textContent).toBe('Загружаем урок…')
    fireEvent.click(screen.getByRole('button', { name: /К списку/ }))
    expect(window.location.search).toBe('?screen=video-dictation')
    expect(document.querySelector('.vd-grid')).not.toBeNull()
  })

  it('урок по ссылке (initialTarget) открывается сразу; уход с экрана снимает ?lesson=', () => {
    h.lesson = { status: 'ready', lesson: { ...FIX.lessons['lost-kite-m2x7d'], phrases: [] }, retry: vi.fn() }
    const view = mount({ initialTarget: { lesson: 'lost-kite-m2x7d' } })
    expect(screen.getByTestId('run').textContent).toBe('lost-kite-m2x7d')
    expect(document.querySelector('.jl-crumb').textContent).toBe('Lost Kite')
    view.unmount()
    expect(window.location.search).toBe('?screen=video-dictation')
  })

  it('урок скрыли — «Урок не найден» и путь к списку', () => {
    h.lesson = { status: 'missing', lesson: null, retry: vi.fn() }
    mount({ initialTarget: { lesson: 'gone-k3f9q' } })
    expect(screen.getByRole('status').getAttribute('data-status')).toBe('lessonMissing')
  })

  it('список грузится — скелет с подписью для чтения с экрана', () => {
    h.index = { status: 'loading', lessons: [], retry: vi.fn() }
    mount()
    expect(screen.getByRole('status').textContent).toBe('Загружаем уроки…')
    expect(document.querySelector('.vd-grid').getAttribute('aria-hidden')).toBe('true')
  })

  it('урок не открылся по сети — «Повторить» перезапрашивает урок, «К списку» выходит', () => {
    h.lesson = { status: 'error', lesson: null, retry: vi.fn() }
    mount({ initialTarget: { lesson: 'lost-kite-m2x7d' } })
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(h.lesson.retry).toHaveBeenCalled()
    expect(document.querySelectorAll('.jl-notice button')).toHaveLength(2)
  })

  it('урок нельзя пройти — «Этот урок пока нельзя пройти»', () => {
    h.lesson = { status: 'empty', lesson: null, retry: vi.fn() }
    mount({ initialTarget: { lesson: 'lost-kite-m2x7d' } })
    expect(screen.getByRole('status').textContent).toContain('Этот урок пока нельзя пройти')
  })

  it('лучший результат на карточке обновляется событием прогресса', () => {
    mount({ userLevel: 'A2' })
    expect(document.querySelector('.vd-card__best')).toBeNull()
    h.best = { 'lost-kite-m2x7d': { clean: 2, n: 3 } }
    act(() => {
      window.dispatchEvent(new Event(VIDEO_DICTATION_PROGRESS_EVENT))
    })
    expect(document.querySelector('.vd-card__best').textContent).toContain('2')
  })
})
