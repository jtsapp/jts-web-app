// @vitest-environment jsdom
// Луна открывает тему или уровень Pronunciation World (initialTarget = { topic } | { level }). Экран целиком с
// настоящим движком на урезанном бандле прототипа (__fixtures__/bundle.json: уровень A0, темы A0.1 и A0.3);
// лейаут, загрузка, прогресс и звук заглушены. Адрес движка читаем крючком e2e (window.__PRON_E2E → window.__pron).
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ bundle: null, state: null }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./pronunciation/usePronunciationData.js', () => ({
  usePronunciationData: () => ({ status: 'ready', bundle: h.bundle, retry: () => {} }),
}))
vi.mock('../practice/pronunciation/progress.js', () => ({
  readPronunciation: () => (h.state ? JSON.parse(JSON.stringify(h.state)) : null),
  writePronunciation: (s) => { h.state = JSON.parse(JSON.stringify(s)) },
}))
vi.mock('../practice/pronunciation/voice.js', () => ({
  speakPronunciation: (text, o) => o?.onEnd?.(),
  stopPronunciation: () => {},
}))
vi.mock('../lib/speech.js', () => ({ playUrl: (url, o) => o?.onFail?.('error'), prefetchUrl: () => {} }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: () => {} }))

import PronunciationPage from './PronunciationPage.jsx'
import { I18nProvider } from '../i18n.jsx'

h.bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/pronunciation/__fixtures__/bundle.json'), 'utf8'))

function mount(initialTarget) {
  const { container } = render(
    <I18nProvider>
      <PronunciationPage token="tk" onNav={() => {}} initialTarget={initialTarget} />
    </I18nProvider>,
  )
  return container.querySelector('.prn-host').shadowRoot
}
const hash = () => window.__pron.snapshot().hash

beforeEach(() => {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.__PRON_E2E = true
  window.__PRON_FAST = true
  h.state = null
})
afterEach(() => {
  cleanup()
  delete window.__PRON_E2E
  delete window.__PRON_FAST
})

describe('PronunciationPage — тема или уровень, открытые Луной', () => {
  it('{ topic } — объяснение темы, «назад» — её уровень на карте', () => {
    const shadow = mount({ topic: 'A0.3' })
    expect(hash()).toBe('#/learn/A0.3')
    expect(shadow.querySelector('.learnv')).not.toBeNull()
    expect(shadow.querySelector('.learnv').textContent).toContain('A0.3')
    shadow.querySelector('.lbar a.iconb').click()
    expect(hash()).toBe('#/level/A0')
    expect(shadow.querySelector('.learnv')).toBeNull()
    expect(shadow.querySelector('.world')).not.toBeNull()
  })

  it('{ level } — уровень на карте', () => {
    const shadow = mount({ level: 'a0' })
    expect(hash()).toBe('#/level/A0')
    expect(shadow.querySelector('.world .rg[aria-current="page"] .rg-lv').textContent).toBe('A0')
  })

  it('темы нет, у уровня нет тем — обычная карта, без ошибки', () => {
    for (const target of [{ topic: 'B2.9' }, { level: 'C1' }, { topic: '../play/A0.1' }]) {
      const shadow = mount(target)
      expect(hash()).toBe('#/')
      expect(shadow.querySelector('.learnv')).toBeNull()
      expect(shadow.querySelector('.world')).not.toBeNull()
      cleanup()
    }
  })
})
