// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n.jsx'
import LessonList, { pickLevel } from './LessonList.jsx'

const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, '../../practice/video-dictation/__fixtures__/lessons.json'), 'utf8'))
const LESSONS = FIX.index.lessons // A1, A2, B1
const t = (key, vars) => (vars ? `${key} ${JSON.stringify(vars)}` : key)

// Уровень держит экран — здесь его роль играет обёртка.
function WithLevel(props) {
  const [level, setLevel] = useState(null)
  return <LessonList level={level} onLevel={setLevel} {...props} />
}

function mount(props = {}) {
  const onOpen = vi.fn()
  render(
    <I18nProvider>
      <WithLevel lessons={LESSONS} best={{}} userLevel="A2" t={t} lang="ru" onOpen={onOpen} {...props} />
    </I18nProvider>,
  )
  return { onOpen, slugs: () => [...document.querySelectorAll('.vd-card')].map((c) => c.dataset.slug) }
}

describe('уровень по умолчанию', () => {
  it('уровень ученика, если на нём есть уроки; иначе и без уровня — все', () => {
    expect(pickLevel(LESSONS, 'A2')).toBe('A2')
    expect(pickLevel(LESSONS, 'b1+')).toBe('B1')
    expect(pickLevel(LESSONS, 'C1')).toBe('all')
    expect(pickLevel(LESSONS, null)).toBe('all')
  })
})

describe('список уроков', () => {
  it('открывается на уровне ученика; «Все» показывает все уроки по порядку', () => {
    const { slugs } = mount()
    expect(slugs()).toEqual(['lost-kite-m2x7d'])
    fireEvent.click(screen.getByRole('radio', { name: 'Все' }))
    expect(slugs()).toEqual(['rainy-day-k3f9q', 'lost-kite-m2x7d', 'gone-video-p8w2z'])
  })

  it('уровни раздела — A0–C1', () => {
    mount()
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Все', 'A0', 'A1', 'A2', 'B1', 'B2', 'C1'])
  })

  it('карточка: превью YouTube, сериал, канал, число фраз и лучший результат', () => {
    mount({ userLevel: 'A1', best: { 'rainy-day-k3f9q': { clean: 1, n: 2 } } })
    const card = document.querySelector('.vd-card')
    expect(card.querySelector('img').getAttribute('alt')).toBe('Rainy Day')
    expect(card.querySelector('img').getAttribute('loading')).toBe('lazy')
    expect(card.querySelector('img').getAttribute('src')).toBe('https://i.ytimg.com/vi/vdFixture01/mqdefault.jpg')
    expect(card.textContent).toContain('Rainy Day')
    expect(card.textContent).toContain('Fixture Friends')
    expect(card.textContent).toContain('Fixture Channel')
    expect(card.textContent).toContain('videoDictation.phrases.few {"n":"2"}')
    expect(card.querySelector('.vd-card__best').textContent).toBe('videoDictation.firstTry {"clean":1,"n":2}')
  })

  it('нажатие на карточку открывает урок', () => {
    const { onOpen } = mount()
    fireEvent.click(document.querySelector('.vd-card'))
    expect(onOpen).toHaveBeenCalledWith('lost-kite-m2x7d')
  })

  it('на уровне без уроков — «Все уровни»', () => {
    const { slugs } = mount()
    fireEvent.click(screen.getByRole('radio', { name: 'C1' }))
    expect(screen.getByRole('status').textContent).toContain('videoDictation.levelEmpty {"level":"C1"}')
    fireEvent.click(screen.getByRole('button', { name: 'videoDictation.allLevels' }))
    expect(slugs()).toHaveLength(3)
  })
})
