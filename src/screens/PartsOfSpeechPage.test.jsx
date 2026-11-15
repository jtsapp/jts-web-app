// @vitest-environment jsdom
// Экран Parts of Speech World: состояния загрузки и оболочка вокруг настоящего движка на бандле копии прототипа
// (__fixtures__/bundle.json). Лейаут, загрузка, хранилище прогресса и навык заглушены; движок читаем крючком e2e
// (window.__POS_E2E → window.__pos).
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ data: null, state: null, skill: [] }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./partsofspeech/usePartsOfSpeechData.js', () => ({ usePartsOfSpeechData: () => h.data }))
vi.mock('../practice/partsofspeech/progress.js', async (importOriginal) => {
  const real = await importOriginal()
  const read = () => real.normalize(h.state)
  return {
    readPartsOfSpeech: read,
    savePartsOfSpeech: (state, reset) => {
      const base = read()
      if (reset) delete base.cases[reset]
      h.state = real.mergePartsOfSpeech(base, state)
    },
  }
})
vi.mock('../practice/skillStats.js', () => ({ recordSkill: (...a) => h.skill.push(a) }))

import PartsOfSpeechPage from './PartsOfSpeechPage.jsx'
import { I18nProvider } from '../i18n.jsx'
import { PARTSOFSPEECH_PROGRESS_EVENT } from '../practice/practiceKeys.js'

const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/partsofspeech/__fixtures__/bundle.json'), 'utf8'))
const A = bundle.UNITS[0].acts[0]

function mount(data) {
  h.data = { retry: () => {}, ...data }
  const { container } = render(
    <I18nProvider>
      <PartsOfSpeechPage token="tk" onNav={() => {}} />
    </I18nProvider>,
  )
  return container
}

/** Пройти первое упражнение первого юнита верными ответами. */
function solveFirstAct(shadow) {
  const body = shadow.querySelector(`[id="${A.id}"] .act-b`)
  for (const it of A.items) {
    ;[...body.querySelectorAll('.opt')].find((o) => o.dataset.v === it.a).click()
    body.querySelector('[data-role="check"]').click()
    body.querySelector('[data-role="next"]').click()
  }
}

beforeEach(() => {
  window.scrollTo = () => {}
  window.scrollBy = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {} })
  window.__POS_E2E = true
  localStorage.clear()
  h.state = null
  h.skill = []
})
afterEach(() => {
  cleanup()
  delete window.__POS_E2E
})

describe('PartsOfSpeechPage', () => {
  it('гость, «раздел готовится», ошибка с повтором и загрузка — плашкой оболочки, без движка', () => {
    for (const status of ['guest', 'missing', 'error', 'loading']) {
      const c = mount({ status, bundle: null })
      expect(c.querySelector(`.pos-state[data-status="${status}"]`)).not.toBeNull()
      expect(c.querySelector('.pos-host').hidden).toBe(true)
      expect(Boolean(c.querySelector('.pos-state .nmb-retry'))).toBe(status === 'error')
      cleanup()
    }
  })

  // Тень не видит html[data-theme] — без атрибута хоста раздел оставался бы светлым при тёмном сайте.
  it('тема приложения — атрибутом хоста, и вслед за кнопкой темы без перезагрузки', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    try {
      const host = mount({ status: 'ready', bundle }).querySelector('.pos-host')
      expect(host.getAttribute('data-theme')).toBe('dark')
      await act(async () => document.documentElement.removeAttribute('data-theme'))
      expect(host.getAttribute('data-theme')).toBe('light')
    } finally {
      document.documentElement.removeAttribute('data-theme')
    }
  })

  it('бандл есть — движок в тени: карта мира из девяти островов, оба слоя стилей, релиз на корне', () => {
    const c = mount({ status: 'ready', bundle })
    const host = c.querySelector('.pos-host')
    expect(host.dataset.release).toBe('1')
    const shadow = host.shadowRoot
    const css = shadow.querySelector('style').textContent
    expect(css).toContain(':host{display:block;container:posw/inline-size}')
    expect(css).toContain(':host([data-theme="dark"])')
    expect(shadow.querySelector('.posw .w-hero h1').textContent).toBe('Parts of Speech World')
    expect(shadow.querySelectorAll('.w-stop')).toHaveLength(9)
  })

  it('упражнение пишет прогресс и навык «Грамматика»; язык перевода и вид — на устройстве, не в прогрессе', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.pos-host').shadowRoot
    window.__pos.go('#u01-practice')
    solveFirstAct(shadow)
    expect(h.state.acts).toEqual({ [A.id]: { score: A.items.length, total: A.items.length } })
    expect(h.skill).toEqual(A.items.map(() => ['grammar', true]))
    shadow.querySelector('.langs [data-lang="ru"]').click()
    expect(localStorage.getItem('jts_partsofspeech_lang')).toBe('ru')
    window.__pos.go('#bureau')
    shadow.querySelector('#gSnd').click()
    expect(JSON.parse(localStorage.getItem('jts_partsofspeech_prefs'))).toEqual({ sound: false, labels: false })
    expect(Object.keys(h.state).sort()).toEqual(['acts', 'cases', 'clues', 'seen'])
  })

  it('снимок сервера перерисовывает карту мира, а урок не трогает', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.pos-host').shadowRoot
    const u = bundle.UNITS[0]
    h.state = { acts: Object.fromEntries(u.acts.map((a) => [a.id, { score: 1, total: 1 }])), cases: {}, clues: {}, seen: {} }
    window.dispatchEvent(new Event(PARTSOFSPEECH_PROGRESS_EVENT))
    expect(shadow.querySelector(`.w-stop-u a[href="#${u.id}"]`).classList.contains('done')).toBe(true)
    window.__pos.go('#u02')
    const before = shadow.querySelector('#view').innerHTML
    h.state = { ...h.state, acts: { ...h.state.acts, [bundle.UNITS[1].acts[0].id]: { score: 1, total: 4 } } }
    window.dispatchEvent(new Event(PARTSOFSPEECH_PROGRESS_EVENT))
    expect(shadow.querySelector('#view').innerHTML).toBe(before)
  })

  it('снимок сервера посреди урока не затирается старой копией движка при следующей записи', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.pos-host').shadowRoot
    window.__pos.go('#u01-practice')
    // пока ученик решал, пришёл прогресс с другого устройства — движок о нём не знает до смены экрана
    h.state = { acts: { u05a1: { score: 5, total: 5 } }, cases: { c02: { done: [0, 1], first: {}, complete: false } }, clues: {}, seen: {} }
    window.dispatchEvent(new Event(PARTSOFSPEECH_PROGRESS_EVENT))
    solveFirstAct(shadow)
    expect(h.state.acts.u05a1).toEqual({ score: 5, total: 5 })
    expect(h.state.acts[A.id]).toEqual({ score: A.items.length, total: A.items.length })
    expect(h.state.cases.c02.done).toEqual([0, 1])
  })

  it('уход с экрана снимает движок', () => {
    const c = mount({ status: 'ready', bundle })
    const shadow = c.querySelector('.pos-host').shadowRoot
    cleanup()
    expect(shadow.innerHTML).toBe('')
    expect(window.__pos).toBeUndefined()
  })
})
