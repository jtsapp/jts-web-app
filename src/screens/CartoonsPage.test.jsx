// @vitest-environment jsdom
// Луна открывает мультфильм Cartoon World по id (initialTarget = { videoId }). Экран целиком с настоящим движком на
// урезанном каталоге (__fixtures__/index.json: в нём есть и нерабочее видео из index.unavailable); лейаут, загрузка,
// прогресс и миссия заглушены — проверяем, куда встал движок и куда ведёт его «назад».
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ index: null, state: { missions: {} } }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./cartoons/useCartoonsData.js', () => ({
  useCartoonsData: () => ({ status: 'ready', index: h.index, retry: () => {} }),
}))
vi.mock('../api.js', () => ({ getCartoonMission: () => Promise.resolve(null) }))
vi.mock('../practice/cartoons/progress.js', () => ({
  readCartoons: () => JSON.parse(JSON.stringify(h.state)),
  updateCartoons: (fn) => { const next = JSON.parse(JSON.stringify(h.state)); fn(next); h.state = next },
}))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: () => {} }))

import CartoonsPage from './CartoonsPage.jsx'
import { I18nProvider } from '../i18n.jsx'

h.index = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/cartoons/__fixtures__/index.json'), 'utf8'))
const ENTRY = h.index.library.entries[1]
const GONE = h.index.unavailable[0].id

function mount(initialTarget) {
  const { container } = render(
    <I18nProvider>
      <CartoonsPage token="tk" onNav={() => {}} initialTarget={initialTarget} />
    </I18nProvider>,
  )
  const shadow = container.querySelector('.cwp-host').shadowRoot
  const $ = (s) => shadow.querySelector(s)
  return {
    $,
    watching: () => !$('#ct-player-view').hidden && $('#ct-library').hidden,
    inLibrary: () => $('#ct-player-view').hidden && !$('#ct-library').hidden,
  }
}

beforeEach(() => {
  localStorage.clear()
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia = (q) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} })
  h.state = { missions: {} }
})
afterEach(cleanup)

describe('CartoonsPage — мультфильм, открытый Луной', () => {
  it('{ videoId } — страница просмотра этого видео, «назад» — библиотека', () => {
    const v = mount({ videoId: ENTRY.id })
    expect(v.watching()).toBe(true)
    expect(v.$('#ct-ep-title').textContent).toBe(ENTRY.title)
    v.$('a[data-route="library"]').click()
    expect(v.inLibrary()).toBe(true)
  })

  it('неизвестный id — библиотека, без «Видео не найдено»', () => {
    const v = mount({ videoId: 'peppa-gone-k3f9q' })
    expect(v.inLibrary()).toBe(true)
    expect(v.$('#ct-grid a.ct-card__link')).not.toBeNull()
  })

  it('нерабочее видео (index.unavailable) — библиотека', () => {
    const v = mount({ videoId: GONE })
    expect(v.inLibrary()).toBe(true)
  })

  it('без цели — библиотека', () => {
    expect(mount(null).inLibrary()).toBe(true)
  })
})

function mountHost() {
  mount(null)
  return document.querySelector('.cwp-host')
}
// 10.11.2026: тень не видит html[data-theme] — раздел оставался светлым при тёмном сайте, а у Cartoons атрибут ставился
// один раз при монтаже и не менялся вслед за кнопкой темы.
describe('тема приложения', () => {
  it('атрибутом хоста и вслед за кнопкой темы, без перезагрузки; тёмный слой — в тени', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    try {
      const host = mountHost()
      expect(host.getAttribute('data-theme')).toBe('dark')
      expect(host.shadowRoot.querySelector('style').textContent).toContain(':host([data-theme="dark"])')
      await act(async () => document.documentElement.removeAttribute('data-theme'))
      expect(host.getAttribute('data-theme')).toBe('light')
      await act(async () => document.documentElement.setAttribute('data-theme', 'dark'))
      expect(host.getAttribute('data-theme')).toBe('dark')
    } finally {
      document.documentElement.removeAttribute('data-theme')
    }
  })
})
