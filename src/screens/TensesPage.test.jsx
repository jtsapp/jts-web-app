// @vitest-environment jsdom
// Экран Tenses World целиком с настоящим движком на бандле копии прототипа (__fixtures__/bundle.json); лейаут,
// загрузка, звук и навыки заглушены. Проверяем связь оболочки с движком: состояния загрузки, язык перевода на
// устройстве, прогресс в общем хранилище и перерисовку карты по снимку сервера.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ data: { status: 'ready', bundle: null }, skills: [] }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./tenses/useTensesData.js', () => ({ useTensesData: () => ({ ...h.data, retry: () => {} }) }))
vi.mock('../practice/tenses/voice.js', () => ({ speakTenses: (text, o) => o?.onEnd?.(), stopTenses: () => {} }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: (...a) => h.skills.push(a) }))

import TensesPage from './TensesPage.jsx'
import { I18nProvider } from '../i18n.jsx'
import { TENSES_KEY, TENSES_LANG_KEY, TENSES_PROGRESS_EVENT } from '../practice/practiceKeys.js'

const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/tenses/__fixtures__/bundle.json'), 'utf8'))

function mount() {
  const { container } = render(
    <I18nProvider>
      <TensesPage token="tk" onNav={() => {}} />
    </I18nProvider>,
  )
  return container
}

beforeEach(() => {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.__TENSES_E2E = true
  localStorage.clear()
  h.data = { status: 'ready', bundle }
  h.skills = []
})
afterEach(() => {
  cleanup()
  delete window.__TENSES_E2E
})

describe('TensesPage', () => {
  it('раздел не залит — «Раздел готовится», движка нет', () => {
    h.data = { status: 'missing', bundle: null }
    const c = mount()
    expect(c.querySelector('.tns-state[data-status="missing"]').textContent).toContain('Раздел готовится')
    expect(c.querySelector('.tns-host').hidden).toBe(true)
    expect(c.querySelector('.tns-host').shadowRoot).toBeNull()
  })

  it('бандл есть — карта времён в тени, release на корне экрана', () => {
    const c = mount()
    const host = c.querySelector('.tns-host')
    expect(host.dataset.release).toBe('1')
    expect(host.shadowRoot.querySelectorAll('.map .tile')).toHaveLength(12)
    expect(host.style.getPropertyValue('--tw-font')).not.toBe('')
  })

  it('язык перевода — с устройства, смена пишется туда же', () => {
    localStorage.setItem(TENSES_LANG_KEY, 'kz')
    const c = mount()
    const root = c.querySelector('.tns-host').shadowRoot.querySelector('.tws')
    expect(root.getAttribute('lang')).toBe('kk')
    root.querySelector('.langs [data-lang="ru"]').click()
    expect(localStorage.getItem(TENSES_LANG_KEY)).toBe('ru')
    expect(root.getAttribute('lang')).toBe('ru')
  })

  it('страница времени пишет прогресс, ответ — в навык «грамматика»', () => {
    const c = mount()
    act(() => window.__tenses.go('#/t/past-simple'))
    expect(JSON.parse(localStorage.getItem(TENSES_KEY))).toMatchObject({ visited: { 'past-simple': 1 }, last: 'past-simple' })
    const shadow = c.querySelector('.tns-host').shadowRoot
    act(() => window.__tenses.go('#/practice/recognise'))
    shadow.querySelector('#pr-card .pr-opt').click()
    expect(h.skills).toHaveLength(1)
    expect(h.skills[0][0]).toBe('grammar')
  })

  it('снимок сервера после первого кадра перерисовывает карту, а посреди урока — нет', () => {
    const c = mount()
    const shadow = c.querySelector('.tns-host').shadowRoot
    expect(shadow.querySelector('a.tile.visited')).toBeNull()
    // так приходит снимок сервера: practiceSync пишет ключ и будит раздел событием
    localStorage.setItem(TENSES_KEY, JSON.stringify({ practice: {}, visited: { 'future-simple': 1 }, last: 'future-simple' }))
    act(() => window.dispatchEvent(new Event(TENSES_PROGRESS_EVENT)))
    expect(shadow.querySelector('a.tile.visited')?.getAttribute('href')).toBe('#/t/future-simple')
    act(() => window.__tenses.go('#/t/present-simple/lab'))
    const lab = shadow.querySelector('#lab-box')
    act(() => window.dispatchEvent(new Event(TENSES_PROGRESS_EVENT)))
    expect(shadow.querySelector('#lab-box')).toBe(lab)
  })
})
