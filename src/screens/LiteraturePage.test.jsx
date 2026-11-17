// @vitest-environment jsdom
// Экран Literature World: состояния загрузки и оболочка вокруг настоящего движка на бандле копии прототипа
// (__fixtures__/bundle.json). Лейаут, загрузка, блокнот, голос и навык заглушены; движок читаем крючком e2e
// (window.__LIT_E2E → window.__lit).
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ data: null, state: null, skill: [], said: [] }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./literature/useLiteratureData.js', () => ({ useLiteratureData: () => h.data }))
vi.mock('../practice/literature/progress.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    readLiterature: () => real.normalize(h.state),
    writeLiterature: (state) => {
      h.state = real.normalize(state)
    },
  }
})
vi.mock('../practice/literature/voice.js', () => ({
  speakLiterature: (t) => h.said.push(t),
  stopLiterature: () => h.said.push(null),
}))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: (...a) => h.skill.push(a) }))

import LiteraturePage from './LiteraturePage.jsx'
import { I18nProvider } from '../i18n.jsx'
import { LITERATURE_PROGRESS_EVENT } from '../practice/practiceKeys.js'

const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/literature/__fixtures__/bundle.json'), 'utf8'))
const W = bundle.x.words[0]

function mount(data) {
  h.data = { retry: () => {}, ...data }
  const { container } = render(
    <I18nProvider>
      <LiteraturePage token="tk" onNav={() => {}} />
    </I18nProvider>,
  )
  return container
}

beforeEach(() => {
  window.scrollTo = () => {}
  window.scrollBy = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {} })
  window.HTMLMediaElement.prototype.load = () => {}
  window.HTMLMediaElement.prototype.pause = () => {}
  window.__LIT_E2E = true
  localStorage.clear()
  h.state = null
  h.skill = []
  h.said = []
})
afterEach(() => {
  cleanup()
  delete window.__LIT_E2E
})

describe('LiteraturePage', () => {
  it('гость, «раздел готовится», ошибка с повтором и загрузка — плашкой оболочки, без движка', () => {
    for (const status of ['guest', 'missing', 'error', 'loading']) {
      const c = mount({ status, bundle: null })
      expect(c.querySelector(`.lit-state[data-status="${status}"]`)).not.toBeNull()
      expect(c.querySelector('.lit-host').hidden).toBe(true)
      expect(Boolean(c.querySelector('.lit-state .nmb-retry'))).toBe(status === 'error')
      cleanup()
    }
  })

  // Тень не видит html[data-theme] — без атрибута хоста раздел оставался бы светлым при тёмном сайте.
  it('тема приложения — атрибутом хоста, и вслед за кнопкой темы без перезагрузки', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    try {
      const host = mount({ status: 'ready', bundle }).querySelector('.lit-host')
      expect(host.getAttribute('data-theme')).toBe('dark')
      await act(async () => document.documentElement.removeAttribute('data-theme'))
      expect(host.getAttribute('data-theme')).toBe('light')
    } finally {
      document.documentElement.removeAttribute('data-theme')
    }
  })

  it('бандл есть — движок в тени: вход в книгу, оба слоя стилей, релиз на корне, шрифт сайта', () => {
    const c = mount({ status: 'ready', bundle })
    const host = c.querySelector('.lit-host')
    expect(host.dataset.release).toBe('1')
    expect(host.style.getPropertyValue('--lit-font')).not.toBe('')
    const shadow = host.shadowRoot
    const css = shadow.querySelector('style').textContent
    expect(css).toContain(':host{display:block;container:lw/inline-size}')
    expect(css).toContain(':host([data-theme="dark"])')
    expect(shadow.querySelector('.lw .lw-entry h1').textContent).toContain('Open the book.')
    expect(shadow.querySelectorAll('.lw-doors .lw-door').length).toBeGreaterThanOrEqual(7)
  })

  it('слово в блокнот — в прогресс; ответ — навык «Словарь»; язык — на устройстве; «Hear» — голос раздела', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.lit-host').shadowRoot
    window.__lit.go('word/' + W.id)
    shadow.querySelector('.whead .btn').click()
    expect(Object.keys(h.state.notebook)).toEqual([W.id])
    shadow.querySelector('#wprac .opts button').click()
    expect(h.skill).toHaveLength(1)
    expect(h.skill[0][0]).toBe('vocab')
    ;[...shadow.querySelectorAll('.wstep button')].find((b) => /say\(/.test(b.getAttribute('data-lw-onclick') || '')).click()
    expect(h.said.at(-1)).toBe(W.word.split(' / ')[0].split(' (')[0])
    shadow.querySelectorAll('#lang button')[1].click()
    expect(JSON.parse(localStorage.getItem('jts_literature_lang'))).toEqual({ lang: 'kz', sup: 'kz' })
    expect(shadow.querySelector('.lw').lang).toBe('kk')
    expect(Object.keys(h.state)).toEqual(['notebook'])
  })

  it('снимок сервера перерисовывает список слов: слово, сохранённое на другом устройстве, — в блокноте', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.lit-host').shadowRoot
    window.__lit.go('words')
    expect(shadow.querySelector('.panel.nb')).toBeNull()
    h.state = { notebook: { [W.id]: 5 } }
    act(() => {
      window.dispatchEvent(new Event(LITERATURE_PROGRESS_EVENT))
    })
    expect(shadow.querySelector('.panel.nb .wchips button').textContent).toBe(W.word)
  })

  it('уход с экрана снимает движок и глушит голос', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.lit-host').shadowRoot
    cleanup()
    expect(shadow.innerHTML).toBe('')
    expect(window.__lit).toBeUndefined()
    expect(h.said.at(-1)).toBeNull()
  })
})
