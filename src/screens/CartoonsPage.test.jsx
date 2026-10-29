// @vitest-environment jsdom
// Луна открывает мультфильм Cartoon World по id (initialTarget = { videoId }). Экран целиком с настоящим движком на
// урезанном каталоге (__fixtures__/index.json: в нём есть и нерабочее видео из index.unavailable); лейаут, загрузка,
// прогресс и миссия заглушены — проверяем, куда встал движок и куда ведёт его «назад».
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

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
