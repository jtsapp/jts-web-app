// @vitest-environment jsdom
// Экран Punctuation World: состояния загрузки и оболочка вокруг настоящего движка на урезанном бандле прототипа
// (__fixtures__/bundle.json: страницы 1 и 7). Лейаут, загрузка, прогресс, голос и навык заглушены; движок читаем
// крючком e2e (window.__PUNCT_E2E → window.__punct).
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ data: null, state: null, skill: [] }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./punctuation/usePunctuationData.js', () => ({ usePunctuationData: () => h.data }))
vi.mock('../practice/punctuation/progress.js', () => ({
  readPunctuation: () => (h.state ? JSON.parse(JSON.stringify(h.state)) : null),
  writePunctuation: (s) => {
    h.state = JSON.parse(JSON.stringify(s))
  },
}))
vi.mock('../practice/punctuation/voice.js', () => ({
  speakPunctuation: (text, o) => o?.onEnd?.(),
  stopPunctuation: () => {},
}))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: (...a) => h.skill.push(a) }))

import PunctuationPage from './PunctuationPage.jsx'
import { I18nProvider } from '../i18n.jsx'
import { PUNCTUATION_PROGRESS_EVENT } from '../practice/practiceKeys.js'

const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/punctuation/__fixtures__/bundle.json'), 'utf8'))

function mount(data) {
  h.data = { retry: () => {}, ...data }
  const { container } = render(
    <I18nProvider>
      <PunctuationPage token="tk" onNav={() => {}} />
    </I18nProvider>,
  )
  return container
}

beforeEach(() => {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  // анимаций у jsdom нет: игра ждёт их конца
  Element.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {} })
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })
  window.__PUNCT_E2E = true
  localStorage.clear()
  h.state = null
  h.skill = []
})
afterEach(() => {
  cleanup()
  delete window.__PUNCT_E2E
})

describe('PunctuationPage', () => {
  it('гость, «раздел готовится», ошибка с повтором и загрузка — плашкой оболочки, без движка', () => {
    for (const status of ['guest', 'missing', 'error', 'loading']) {
      const c = mount({ status, bundle: null })
      expect(c.querySelector(`.pct-state[data-status="${status}"]`)).not.toBeNull()
      expect(c.querySelector('.pct-host').hidden).toBe(true)
      expect(Boolean(c.querySelector('.pct-state .nmb-retry'))).toBe(status === 'error')
      cleanup()
    }
  })

  it('бандл есть — движок в тени: главная с островами, релиз на корне', () => {
    const c = mount({ status: 'ready', bundle })
    const host = c.querySelector('.pct-host')
    expect(host.dataset.release).toBe('1')
    const shadow = host.shadowRoot
    expect(shadow.querySelector('style').textContent).toContain('.punct{container:punct/inline-size')
    expect(shadow.querySelector('.punct .hero h1').textContent).toBe('Punctuation World')
    expect(shadow.querySelectorAll('.isle-tab')).toHaveLength(5)
  })

  it('игра — data-game на хосте (кнопки Луны нет), выход из неё — снимает', () => {
    const c = mount({ status: 'ready', bundle })
    const host = c.querySelector('.pct-host')
    window.__punct.go('#/play/1')
    expect(host.dataset.game).toBe('1')
    expect(host.shadowRoot.querySelector('.adv.game')).not.toBeNull()
    window.__punct.go('#/lesson/1')
    expect(host.dataset.game).toBe('')
  })

  it('урок отмечается прочитанным в прогрессе; вид — на устройстве', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.pct-host').shadowRoot
    window.__punct.go('#/lesson/1')
    expect(h.state.read).toEqual({ 1: 1 })
    shadow.querySelector('[data-act="tr"][data-k="ru"]').click()
    expect(JSON.parse(localStorage.getItem('jts_punctuation_prefs'))).toEqual({ tr: 'ru', mute: false, luna: false })
    expect(h.state).not.toHaveProperty('tr')
  })

  it('снимок сервера перерисовывает главную, а урок не трогает', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.pct-host').shadowRoot
    h.state = { read: {}, p: { 1: 3 }, fin: 0 }
    window.dispatchEvent(new Event(PUNCTUATION_PROGRESS_EVENT))
    expect(shadow.querySelector('.top .pill b').textContent).toBe('3')
    window.__punct.go('#/lesson/7')
    const before = shadow.querySelector('#app').innerHTML
    h.state = { ...h.state, p: { 1: 3, 7: 2 } }
    window.dispatchEvent(new Event(PUNCTUATION_PROGRESS_EVENT))
    expect(shadow.querySelector('#app').innerHTML).toBe(before)
  })
})
