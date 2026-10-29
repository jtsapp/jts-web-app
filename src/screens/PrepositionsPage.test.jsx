// @vitest-environment jsdom
// Луна открывает урок Prepositions World по id (initialTarget = { lesson }). Экран целиком с настоящим движком на
// урезанном бандле прототипа (__fixtures__/bundle.json); лейаут, загрузка, прогресс и звук заглушены — проверяем,
// куда встал движок и куда ведёт его «назад».
import fs from 'node:fs'
import path from 'node:path'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const h = vi.hoisted(() => ({ bundle: null, state: { done: {}, score: {} } }))
vi.mock('../components/LearningLayout.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('./prepositions/usePrepositionsData.js', () => ({
  usePrepositionsData: () => ({ status: 'ready', bundle: h.bundle, retry: () => {} }),
}))
vi.mock('../practice/prepositions/progress.js', () => ({
  readPrepositions: () => JSON.parse(JSON.stringify(h.state)),
  writePrepositions: (s) => { h.state = s },
}))
vi.mock('../practice/prepositions/voice.js', () => ({ speakLesson: () => {}, stopLesson: () => {} }))
vi.mock('../lib/speech.js', () => ({ playUrl: () => {} }))
vi.mock('../practice/skillStats.js', () => ({ recordSkill: () => {} }))

import PrepositionsPage from './PrepositionsPage.jsx'
import { I18nProvider } from '../i18n.jsx'

h.bundle = JSON.parse(fs.readFileSync(path.join(__dirname, '../practice/prepositions/__fixtures__/bundle.json'), 'utf8'))
const LESSON = h.bundle.course.cats[0].lessons[1]

function mount(initialTarget, { strict = false } = {}) {
  const page = (
    <I18nProvider>
      <PrepositionsPage token="tk" onNav={() => {}} initialTarget={initialTarget} />
    </I18nProvider>
  )
  const { container } = render(strict ? <StrictMode>{page}</StrictMode> : page)
  return container.querySelector('.prp-host').shadowRoot
}

beforeEach(() => {
  window.scrollTo = () => {}
  h.state = { done: {}, score: {} }
})
afterEach(cleanup)

describe('PrepositionsPage — урок, открытый Луной', () => {
  it('{ lesson } — страница объяснения этого урока, «назад» — главная курса', () => {
    const shadow = mount({ lesson: LESSON.id })
    expect(shadow.querySelector('.lesson h1').textContent).toBe(LESSON.title.en)
    shadow.querySelector('.ls-top a.icon-btn').click()
    expect(shadow.querySelector('.lesson')).toBeNull()
    expect(shadow.querySelector('section.hero')).not.toBeNull()
  })

  it('StrictMode (двойной эффект в dev) цель не теряет', () => {
    const shadow = mount({ lesson: LESSON.id }, { strict: true })
    expect(shadow.querySelector('.lesson h1').textContent).toBe(LESSON.title.en)
  })

  it('урока нет в курсе — обычная главная, без ошибки', () => {
    const shadow = mount({ lesson: 'place-gone-k3f9q' })
    expect(shadow.querySelector('.lesson')).toBeNull()
    expect(shadow.querySelector('section.hero')).not.toBeNull()
  })

  it('без цели — главная курса', () => {
    const shadow = mount(null)
    expect(shadow.querySelector('.lesson')).toBeNull()
    expect(shadow.querySelector('section.hero')).not.toBeNull()
  })
})
